import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { parseLeaveRequest, validateLeaveRequest } from "./email-parser-service/emailParser.js";
import { processLeaveApplication } from "./greytHr-service/leaveApplicationService.js";
import { getEmployeeByEmail, getEmployeeById, getEmployeeOrgTree } from "./greytHr-service/greytHrClient.js";
import env from "./env.js";
import LOG from "./services/loggerService.js";
import { CloudAdapter, ConfigurationServiceClientCredentialFactory, TurnContext } from "botbuilder";
import https from 'https';
import http from 'http';
import fs from 'fs';
import type {
    GraphNotificationPayload,
    EmailData,
    GreytHREmployee
} from "./types/index.js";

const app = express();
app.use(bodyParser.json());

const credentialFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: env.BOT_APP_ID,
    MicrosoftAppPassword: env.BOT_APP_SECRET
});

const adapter = new CloudAdapter(credentialFactory as any);

app.post("/api/messages", (req: Request, res: Response) => {
    adapter.process(req, res, async (context: TurnContext) => {
        await context.sendActivity("Email bot is running.");
    });
});

// Email webhook — Microsoft Graph will POST here
app.post("/email-notification", async (req: Request, res: Response) => {
    LOG.graphNotificationReceived();

    // Handle subscription validation
    if (req.query['validationToken']) {
        LOG.graphValidationRequest(req.query['validationToken'] as string);
        // Microsoft Graph requires us to return the validation token with 200 OK
        res.status(200).send(req.query['validationToken']);
        return;
    }

    LOG.graphNotificationBody(req.body);
    res.sendStatus(200);

    const body = req.body as GraphNotificationPayload;
    const notif = body.value?.[0];
    if (!notif) return;

    const messageId = notif.resourceData?.id;

    if (messageId) {
        const token = await getGraphToken();

        // Fetch the current email to get the conversationId
        // Note: We need this because the Graph notification doesn't include conversationId
        const email = await axios.get<EmailData>(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Step 1: Fetch all emails in the conversation thread using the conversationId
        const conversationId = email.data.conversationId;
        LOG.info(`📧 Fetching email thread for conversation: ${conversationId}`);

        const threadResponse = await axios.get<{ value: EmailData[] }>(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages?$filter=conversationId eq '${conversationId}'&$orderby=receivedDateTime desc`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const threadMessages = threadResponse.data.value;
        LOG.info(`📧 Found ${threadMessages.length} messages in thread`);

        // Step 2: Search for the email containing "Leave Type" and "Transaction"
        let leaveEmail: EmailData | null = null;

        for (const msg of threadMessages) {
            const emailBody = (msg.body?.content || msg.bodyPreview || "").toLowerCase();

            // Check if this email contains both "leave type" and "transaction"
            if (emailBody.includes("leave type") && emailBody.includes("transaction")) {
                leaveEmail = msg;
                LOG.info(`✅ Found leave request email from: ${msg.from?.emailAddress?.address} at ${msg.receivedDateTime}`);
                break;
            }
        }

        // Collect all unique participants from the thread
        const participantEmails = new Set<string>();
        threadMessages.forEach(msg => {
            const senderEmail = msg.from?.emailAddress?.address;
            if (senderEmail && senderEmail !== env.MONITORED_EMAIL) {
                participantEmails.add(senderEmail);
            }
        });

        // If no email with keywords found, send a reply to the conversation
        if (!leaveEmail) {
            LOG.info(`⚠️  No email with "Leave Type" and "Transaction" found in thread`);

            const recipients = Array.from(participantEmails).map(email => ({
                emailAddress: { address: email }
            }));

            LOG.info(`📧 Sending no leave request found reply to ${recipients.length} participants: ${Array.from(participantEmails).join(', ')}`);

            // Send a reply email to all participants in the conversation
            try {
                const replyMessage = {
                    message: {
                        subject: `RE: ${email.data.subject}`,
                        body: {
                            contentType: "HTML",
                            content: `
                                <p>Hello,</p>
                                <p>I could not find a valid leave request in this email thread.</p>
                                <p>This is an automated reply, please do not reply to this email.</p>
                                <p>Please send a new email with a valid leave request</p>
                                <p>Best regards,<br/>Leave Management AI</p>
                            `
                        },
                        toRecipients: recipients
                    }
                };

                await axios.post(
                    `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.data.id}/reply`,
                    replyMessage,
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );

                LOG.info(`✅ Sent reply to all participants in thread`);
            } catch (replyError) {
                const err = replyError as Error;
                LOG.error("❌ Failed to send reply email:", err.message);
            }

            return;
        }

        // Step 2.5: Get employee details and manager hierarchy
        LOG.info(`👤 Fetching employee details for leave requester...`);

        const leaveRequesterEmail = leaveEmail.from?.emailAddress?.address;
        if (!leaveRequesterEmail) {
            LOG.error("❌ Could not determine leave requester email");
            return;
        }

        let managerEmails: Set<string> = new Set();
        let employee: GreytHREmployee;

        try {
            // 1. Get employee details by email
            employee = await getEmployeeByEmail(leaveRequesterEmail);
            LOG.info(`✅ Found employee: ${employee.name} (ID: ${employee.employeeId})`);

            // 2. Get org tree to find all managers
            const orgTree = await getEmployeeOrgTree(employee.employeeId);
            LOG.info(`🌳 Found ${orgTree.length} managers in org tree`);

            // 3. Get email addresses for each manager
            for (const node of orgTree) {
                try {
                    const managerDetails = await getEmployeeById(node.manager.employeeId.toString());
                    if (managerDetails.email) {
                        managerEmails.add(managerDetails.email.toLowerCase());
                        LOG.info(`  📋 Manager: ${managerDetails.name} (${managerDetails.email}) - Level ${node.level}`);
                    }
                } catch (error) {
                    LOG.error(`⚠️  Could not fetch details for manager ID: ${node.manager.employeeId}`);
                }
            }

            LOG.info(`✅ Collected ${managerEmails.size} manager email addresses`);
        } catch (error) {
            const err = error as Error;
            LOG.error(`❌ Failed to fetch employee/manager details: ${err.message}`);

            // Send notification about the error
            const recipients = Array.from(participantEmails).map(email => ({
                emailAddress: { address: email }
            }));

            try {
                const replyMessage = {
                    message: {
                        subject: `RE: ${email.data.subject}`,
                        body: {
                            contentType: "HTML",
                            content: `
                                <p>Hello,</p>
                                <p>I found a leave request but could not verify the employee details in GreytHR.</p>
                                <p>Error: ${err.message}</p>
                                <p>This is an automated reply, please do not reply to this email.</p>
                                <p>Best regards,<br/>Leave Management AI</p>
                            `
                        },
                        toRecipients: recipients
                    }
                };

                await axios.post(
                    `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.data.id}/reply`,
                    replyMessage,
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
            } catch (replyError) {
                LOG.error("❌ Failed to send error notification email");
            }

            return;
        }

        // Step 3: Check for approval in the thread from authorized managers
        LOG.info(`🔍 Checking for approval from authorized managers...`);
        let approvalFound = false;
        let approvalEmail: EmailData | null = null;

        for (const msg of threadMessages) {
            // Skip the leave request email itself
            if (msg.id === leaveEmail.id) continue;

            const emailBody = (msg.body?.content || "").toLowerCase();
            const approverEmail = msg.from?.emailAddress?.address?.toLowerCase();

            // Check if this email contains approval keywords AND is from an authorized manager
            if (emailBody.includes("approve") || emailBody.includes("approved")) {
                if (approverEmail && managerEmails.has(approverEmail)) {
                    approvalFound = true;
                    approvalEmail = msg;
                    LOG.info(`✅ Found approval from authorized manager: ${msg.from?.emailAddress?.address} at ${msg.receivedDateTime}`);
                    break;
                } else {
                    LOG.info(`⚠️  Found approval keyword from ${approverEmail}, but they are not an authorized manager - ignoring`);
                }
            }
        }

        // If no approval found, send notification and exit
        if (!approvalFound) {
            LOG.info(`⚠️  No approval found in thread`);

            const recipients = Array.from(participantEmails).map(email => ({
                emailAddress: { address: email }
            }));

            LOG.info(`📧 Sending no approval found reply to ${recipients.length} participants: ${Array.from(participantEmails).join(', ')}`);

            try {
                const replyMessage = {
                    message: {
                        subject: `RE: ${email.data.subject}`,
                        body: {
                            contentType: "HTML",
                            content: `
                                <p>Hello,</p>
                                <p>I found a leave request in this email thread, but no manager approval was given.</p>
                                <p>This is an automated reply, please do not reply to this email.</p>
                                <p>Please send an approval email to proceed with the leave request.</p>
                                <p>Best regards,<br/>Leave Management AI</p>
                            `
                        },
                        toRecipients: recipients
                    }
                };

                await axios.post(
                    `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.data.id}/reply`,
                    replyMessage,
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );

                LOG.info(`✅ Sent no approval reply to all participants in thread`);
            } catch (replyError) {
                const err = replyError as Error;
                LOG.error("❌ Failed to send no approval reply email:", err.message);
            }

            return;
        }

        // Step 4: Parse the specific email containing the leave request
        try {
            LOG.parsingLeaveRequest();
            const leaveRequest = await parseLeaveRequest(leaveEmail);
            const validation = validateLeaveRequest(leaveRequest);

            if (validation.isValid) {
                LOG.validLeaveRequestParsed(leaveRequest);

                // Process the leave request with GreytHR
                try {
                    LOG.submittingToGreytHR();
                    const result = await processLeaveApplication(leaveRequest, employee);

                    if (result.success) {
                        LOG.leaveApplicationSuccess(result.applicationId);
                    } else {
                        LOG.leaveApplicationFailed(result.error);
                    }
                } catch (greytHrError) {
                    const err = greytHrError as Error;
                    LOG.error("❌ GreytHR integration error:", err.message);
                }

            } else {
                LOG.incompleteLeaveRequest(validation.missingFields, validation.confidence);
            }
        } catch (error) {
            const err = error as Error;
            LOG.error("❌ Error parsing leave request:", err.message);
        }
    }
});

// Run server with HTTPS support
let server: https.Server | http.Server;

if (env.USE_HTTPS && env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
    // HTTPS mode with SSL certificates
    try {
        const httpsOptions = {
            key: fs.readFileSync(env.SSL_KEY_PATH),
            cert: fs.readFileSync(env.SSL_CERT_PATH)
        };

        server = https.createServer(httpsOptions, app);
        server.listen(443, () => {
            LOG.serverStartup(443, env.PUBLIC_URL, true, env.SSL_CERT_PATH);
        });
    } catch (error) {
        const err = error as Error;
        LOG.serverStartupFailed(err.message, env.SSL_KEY_PATH!, env.SSL_CERT_PATH!);
        process.exit(1);
    }
} else {
    // HTTP mode (fallback)
    server = http.createServer(app);
    server.listen(80, () => {
        LOG.serverStartup(80, env.PUBLIC_URL, false);
    });
}
