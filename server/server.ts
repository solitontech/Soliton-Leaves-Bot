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
    GreytHREmployee,
    LeaveRequest
} from "./types/index.js";

const app = express();
app.use(bodyParser.json());

const credentialFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: env.BOT_APP_ID,
    MicrosoftAppPassword: env.BOT_APP_SECRET
});

const adapter = new CloudAdapter(credentialFactory as any);

/**
 * Search for the leave request email in a thread
 * If not found, sends a reply email to all participants
 * @param threadMessages - Array of emails in the thread
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - ID of the email to reply to
 * @param token - Graph API access token
 * @returns The email containing leave request, or null if not found
 */
async function getLeaveEmail(
    threadMessages: EmailData[],
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string
): Promise<EmailData | null> {
    // Search for leave request email
    for (const msg of threadMessages) {
        const emailBody = (msg.body?.content || msg.bodyPreview || "").toLowerCase();

        // Check if this email contains both "leave type" and "transaction"
        if (emailBody.includes("leave type") && emailBody.includes("transaction")) {
            LOG.info(`✅ Found leave request email from: ${msg.from?.emailAddress?.address} at ${msg.receivedDateTime}`);
            return msg;
        }
    }

    // No leave email found - send reply to all participants
    LOG.info(`⚠️  No email with "Leave Type" and "Transaction" found in thread`);

    const recipients = Array.from(participantEmails).map(email => ({
        emailAddress: { address: email }
    }));

    LOG.info(`📧 Sending no leave request found reply to ${recipients.length} participants: ${Array.from(participantEmails).join(', ')}`);

    try {
        const replyMessage = {
            message: {
                subject: `RE: ${emailSubject}`,
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
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${emailId}/reply`,
            replyMessage,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        LOG.info(`✅ Sent reply to all participants in thread`);
    } catch (replyError) {
        const err = replyError as Error;
        LOG.error("❌ Failed to send reply email:", err.message);
    }

    return null;
}

/**
 * Get employee and manager details from GreytHR
 * If an error occurs, sends a reply email to all participants
 * @param leaveRequesterEmail - Email address of the leave requester
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - ID of the email to reply to
 * @param token - Graph API access token
 * @returns Object with employee and managerEmails, or null if error occurred
 */
async function getEmployeeAndManagerDetails(
    leaveRequesterEmail: string,
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string
): Promise<{ employee: GreytHREmployee; managerEmails: Set<string> } | null> {
    LOG.info(`👤 Fetching employee & manager details for leave requester...`);

    const managerEmails: Set<string> = new Set();

    try {
        // 1. Get employee details by email
        const employee = await getEmployeeByEmail(leaveRequesterEmail);
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

        return { employee, managerEmails };

    } catch (error) {
        const err = error as Error;
        LOG.error(`❌ Failed to fetch employee / manager details: ${err.message}`);

        // Send notification about the error
        const recipients = Array.from(participantEmails).map(email => ({
            emailAddress: { address: email }
        }));

        try {
            const replyMessage = {
                message: {
                    subject: `RE: ${emailSubject}`,
                    body: {
                        contentType: "HTML",
                        content: `
                            <p>Hello,</p>
                            <p>I found a leave request but could not verify the employee details (or their manager's details) in GreytHR.</p>
                            <p>This is an automated reply, please do not reply to this email.</p>
                            <p>Best regards,<br/>Leave Management AI</p>
                        `
                    },
                    toRecipients: recipients
                }
            };

            await axios.post(
                `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${emailId}/reply`,
                replyMessage,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );

            LOG.info(`✅ Sent error notification to all participants`);
        } catch (replyError) {
            LOG.error("❌ Failed to send error notification email");
        }

        return null;
    }
}

/**
 * Check for manager approval in the email thread
 * If no approval from an authorized manager is found, sends a reply email to all participants
 * @param threadMessages - Array of emails in the thread
 * @param leaveEmail - The leave request email to exclude from search
 * @param managerEmails - Set of authorized manager email addresses
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - ID of the email to reply to
 * @param token - Graph API access token
 * @returns true if approval found from authorized manager, false otherwise (after sending notification)
 */
async function checkManagerApproval(
    threadMessages: EmailData[],
    leaveEmail: EmailData,
    managerEmails: Set<string>,
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string
): Promise<boolean> {
    LOG.info(`🔍 Checking for approval from authorized managers...`);

    for (const msg of threadMessages) {
        // Skip the leave request email itself
        if (msg.id === leaveEmail.id) continue;

        const emailBody = (msg.body?.content || "").toLowerCase();
        const approverEmail = msg.from?.emailAddress?.address?.toLowerCase();

        // Check if this email contains approval keywords AND is from an authorized manager
        if (emailBody.includes("approve") || emailBody.includes("approved")) {
            if (approverEmail && managerEmails.has(approverEmail)) {
                LOG.info(`✅ Found approval from authorized manager: ${msg.from?.emailAddress?.address} at ${msg.receivedDateTime}`);
                return true; // ✅ Approval found
            } else {
                LOG.info(`⚠️  Found approval keyword from ${approverEmail}, but they are not an authorized manager - ignoring`);
            }
        }
    }

    // No approval found - send notification
    LOG.info(`⚠️  No approval found in thread`);

    const recipients = Array.from(participantEmails).map(email => ({
        emailAddress: { address: email }
    }));

    LOG.info(`📧 Sending no approval found reply to ${recipients.length} participants: ${Array.from(participantEmails).join(', ')}`);

    try {
        const replyMessage = {
            message: {
                subject: `RE: ${emailSubject}`,
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
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${emailId}/reply`,
            replyMessage,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        LOG.info(`✅ Sent no approval reply to all participants in thread`);
    } catch (replyError) {
        const err = replyError as Error;
        LOG.error("❌ Failed to send no approval reply email:", err.message);
    }

    return false; // ❌ No approval found
}

/**
 * Send failure notification email when leave application fails or encounters an error
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - ID of the email to reply to
 * @param token - Graph API access token
 */
async function sendLeaveApplicationFailureEmail(
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string
): Promise<void> {
    const recipients = Array.from(participantEmails).map(email => ({
        emailAddress: { address: email }
    }));

    LOG.info(`📧 Sending failure notification to ${recipients.length} participants...`);

    try {
        const failureMessage = {
            message: {
                subject: `RE: ${emailSubject}`,
                body: {
                    contentType: "HTML",
                    content: `
                        <p>Hello,</p>
                        <p><strong>❌ Leave application failed</strong></p>
                        <p>There was an error while submitting your leave application to GreytHR.</p>
                        <p>Please upload request manually or contact IT support if the issue persists.</p>
                        <p>This is an automated notification. Please do not reply to this email.</p>
                        <p>Best regards,<br/>Leave Management AI</p>
                    `
                },
                toRecipients: recipients
            }
        };

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${emailId}/reply`,
            failureMessage,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        LOG.info(`✅ Failure notification sent to all participants`);
    } catch (emailError) {
        LOG.error(`⚠️  Failed to send failure notification email`);
    }
}

/**
 * Send parsing/validation error notification email when leave request cannot be parsed or is incomplete
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - ID of the email to reply to
 * @param token - Graph API access token
 * @param missingFields - Optional array of missing field names
 */
async function sendLeaveRequestParsingErrorEmail(
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string,
    missingFields?: string[]
): Promise<void> {
    const recipients = Array.from(participantEmails).map(email => ({
        emailAddress: { address: email }
    }));

    LOG.info(`📧 Sending parsing/validation error notification to ${recipients.length} participants...`);

    try {
        const errorMessage = {
            message: {
                subject: `RE: ${emailSubject}`,
                body: {
                    contentType: "HTML",
                    content: `
                        <p>Hello,</p>
                        <p><strong>❌ Unable to process leave request</strong></p>
                        <p>I could not extract valid leave request information from the email.</p>
                        ${missingFields && missingFields.length > 0 ? `
                        <p><strong>Missing fields:</strong></p>
                        <ul>
                            ${missingFields.map(field => `<li>${field}</li>`).join('')}
                        </ul>
                        ` : ''}
                        <p><strong>Please ensure your leave request includes all required fields:</strong></p>
                        <ul>
                            <li>Leave Type (e.g., Sick Leave, Casual Leave, Privilege Leave)</li>
                            <li>Transaction (Availed or Cancelled)</li>
                            <li>From Date (start date of leave)</li>
                            <li>To Date (end date of leave)</li>
                        </ul>
                        <p>Please submit a new leave request with all the required information.</p>
                        <p>This is an automated notification. Please do not reply to this email.</p>
                        <p>Best regards,<br/>Leave Management AI</p>
                    `
                },
                toRecipients: recipients
            }
        };

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${emailId}/reply`,
            errorMessage,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        LOG.info(`✅ Parsing/validation error notification sent to all participants`);
    } catch (emailError) {
        LOG.error(`⚠️  Failed to send parsing/validation error notification email`);
    }
}


/**
 * Parse and validate leave request from email
 * If parsing fails or validation fails, sends a reply email to all participants
 * @param leaveEmail - The leave request email to parse
 * @param participantEmails - Set of participant email addresses
 * @param emailSubject - Original email subject for reply
 * @param emailId - Email ID to reply to
 * @param token - Graph API access token
 * @returns LeaveRequest if successfully parsed and validated, null otherwise (after sending notification)
 */
async function parseAndValidateLeaveRequest(
    leaveEmail: EmailData,
    participantEmails: Set<string>,
    emailSubject: string,
    emailId: string,
    token: string
): Promise<LeaveRequest | null> {
    LOG.info(`📝 Parsing leave request from email...`);

    // Try to parse the leave request
    let leaveRequest: LeaveRequest | null = null;
    try {
        leaveRequest = await parseLeaveRequest(leaveEmail);
    } catch (error) {
        const err = error as Error;
        LOG.error(`❌ Error parsing leave request: ${err.message}`);
        await sendLeaveRequestParsingErrorEmail(
            participantEmails,
            emailSubject,
            emailId,
            token
        );
        return null;
    }

    // Check if parsing returned data
    if (!leaveRequest) {
        LOG.error(`❌ No leave request data after parsing`);
        await sendLeaveRequestParsingErrorEmail(
            participantEmails,
            emailSubject,
            emailId,
            token
        );
        return null;
    }

    // Validate the parsed leave request
    const validation = validateLeaveRequest(leaveRequest);

    if (!validation.isValid) {
        LOG.error(`❌ Incomplete leave request - missing required fields`);
        await sendLeaveRequestParsingErrorEmail(
            participantEmails,
            emailSubject,
            emailId,
            token,
            validation.missingFields
        );
        return null;
    }

    LOG.info(`✅ Valid leave request parsed successfully`);
    return leaveRequest;
}

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
