import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { processLeaveApplication, getEmployeeAndManagerDetails, checkManagerApproval, parseAndValidateLeaveRequest, getLeaveEmail, sendLeaveApplicationFailureEmail } from "./services/leaveApplicationService.js";
import env from "./env.js";
import LOG from "./services/loggerService.js";
import { CloudAdapter, ConfigurationServiceClientCredentialFactory, TurnContext } from "botbuilder";
import https from 'https';
import http from 'http';
import fs from 'fs';
import type {
    GraphNotificationPayload,
    EmailData
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

        // Collect all unique participants from the thread
        const participantEmails = new Set<string>();
        threadMessages.forEach(msg => {
            const senderEmail = msg.from?.emailAddress?.address;
            if (senderEmail && senderEmail !== env.MONITORED_EMAIL) {
                participantEmails.add(senderEmail);
            }
        });

        // Step 2: Search for the email containing "Leave Type" and "Transaction"
        // If not found, getLeaveEmail will send a reply and return null
        const leaveEmail = await getLeaveEmail(
            threadMessages,
            participantEmails,
            email.data.subject,
            email.data.id,
            token
        );

        if (!leaveEmail) {
            return; // Reply already sent by getLeaveEmail
        }

        // Step 2.5: Get employee details and manager hierarchy
        // If an error occurs, getEmployeeAndManagerDetails will send a reply and return null
        const leaveRequesterEmail = leaveEmail.from?.emailAddress?.address;

        const employeeAndManagers = await getEmployeeAndManagerDetails(
            leaveRequesterEmail,
            participantEmails,
            email.data.subject,
            email.data.id,
            token
        );

        if (!employeeAndManagers) {
            return; // Error notification already sent by getEmployeeAndManagerDetails
        }

        const { employee, managerEmails } = employeeAndManagers;

        // Step 3: Check for approval in the thread from authorized managers
        // If no approval is found, checkManagerApproval will send a reply and return false
        const approvalFound = await checkManagerApproval(
            threadMessages,
            leaveEmail,
            managerEmails,
            participantEmails,
            email.data.subject,
            email.data.id,
            token
        );

        if (!approvalFound) {
            return; // No approval notification already sent by checkManagerApproval
        }

        // Step 4: Parse and validate the leave request
        // If parsing/validation fails, parseAndValidateLeaveRequest will send a reply and return null
        const leaveRequest = await parseAndValidateLeaveRequest(
            leaveEmail,
            participantEmails,
            email.data.subject,
            email.data.id,
            token
        );

        if (!leaveRequest) {
            return; // Error notification already sent by parseAndValidateLeaveRequest
        }


        // Step 5: Process the leave request with GreytHR
        try {
            LOG.info(`🚀 Submitting leave application to GreytHR...`);
            const result = await processLeaveApplication(leaveRequest, employee);

            if (result.success) {
                LOG.info(`✅ Leave application submitted successfully!`);

                // Send success notification email
                const recipients = Array.from(participantEmails).map(email => ({
                    emailAddress: { address: email }
                }));

                LOG.info(`📧 Sending success notification to ${recipients.length} participants...`);

                try {
                    const successMessage = {
                        message: {
                            subject: `RE: ${email.data.subject}`,
                            body: {
                                contentType: "HTML",
                                content: `
                                            <p>Hello,</p>
                                            <p><strong>✅ Leave application submitted successfully!</strong></p>
                                            <p><strong>Employee:</strong> ${employee.name} (${employee.employeeNo})</p>
                                            <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
                                            <p><strong>Transaction:</strong> ${leaveRequest.transaction}</p>
                                            <p><strong>Duration:</strong> ${leaveRequest.fromDate} to ${leaveRequest.toDate}</p>
                                            ${leaveRequest.reason ? `<p><strong>Reason:</strong> ${leaveRequest.reason}</p>` : ''}
                                            ${result.applicationId ? `<p><strong>Application ID:</strong> ${result.applicationId}</p>` : ''}
                                            <p>This is an automated confirmation. Please do not reply to this email.</p>
                                            <p>Best regards,<br/>Leave Management AI</p>
                                        `
                            },
                            toRecipients: recipients
                        }
                    };

                    await axios.post(
                        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.data.id}/reply`,
                        successMessage,
                        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                    );

                    LOG.info(`✅ Success notification sent to all participants`);
                } catch (emailError) {
                    LOG.error(`⚠️  Failed to send success notification email (but leave was submitted)`);
                }

            } else {
                LOG.error(`❌ Leave application failed!`);
                await sendLeaveApplicationFailureEmail(
                    participantEmails,
                    email.data.subject,
                    email.data.id,
                    token
                );
            }
        } catch (greytHrError) {
            const err = greytHrError as Error;
            LOG.error(`❌ GreytHR integration error: ${err.message}`);
            await sendLeaveApplicationFailureEmail(
                participantEmails,
                email.data.subject,
                email.data.id,
                token
            );
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
