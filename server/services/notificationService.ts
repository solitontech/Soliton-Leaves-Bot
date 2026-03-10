/**
 * Notification Service
 * Handles all email notifications for leave request processing
 */

import axios from "axios";
import env from "../env.js";
import LOG from "./loggerService.js";
import type {
    EmailData,
    LeaveRequest,
    GreytHREmployee
} from "../types/index.js";

/**
 * Build the reply recipient lists for a notification email.
 * - To:  always the original sender (A)
 * - CC:  everyone from the original To + CC, excluding the monitored mailbox and the sender
 *        (avoids emailing the bot itself and avoids duplicating the sender in CC)
 */
function buildReplyRecipients(email: EmailData, senderEmail: string) {
    const monitoredLower = env.MONITORED_EMAIL.toLowerCase();
    const senderLower = senderEmail.toLowerCase();

    const allOthers = [
        ...(email.toRecipients ?? []),
        ...(email.ccRecipients ?? []),
    ].filter(r => {
        const addr = r.emailAddress.address.toLowerCase();
        return addr !== monitoredLower && addr !== senderLower;
    });

    return {
        toRecipients: [{ emailAddress: { address: senderEmail } }],
        ccRecipients: allOthers,
    };
}

/**
 * Send success notification email to the leave requester
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param employee - Employee details
 * @param leaveRequest - Leave request details
 * @param result - Submission result
 * @param token - Graph API access token
 */
export async function sendSuccessNotification(
    email: EmailData,
    senderEmail: string,
    employee: GreytHREmployee,
    leaveRequest: LeaveRequest,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending success notification to ${senderEmail}...`);

    const successMessage = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello ${employee.name},</p>
                    <p><strong>✅ Your leave application has been submitted successfully!</strong></p>
                    <p><strong>Employee:</strong> ${employee.name} (${employee.employeeNo})</p>
                    <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
                    <p><strong>Transaction:</strong> ${leaveRequest.transaction}</p>
                    <p><strong>Duration:</strong> ${leaveRequest.fromDate} to ${leaveRequest.toDate}</p>
                    <p><strong>Reason:</strong> ${leaveRequest.reason}</p>
                    <p>This is an automated confirmation. Please do not reply to this email.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        successMessage,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`✅ Success notification sent to ${senderEmail}`);
}

/**
 * Send failure/error notification email to the leave requester.
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param token - Graph API access token
 * @param errorMessage - Optional error description; shown in the email body when provided
 */
export async function sendFailureNotification(
    email: EmailData,
    senderEmail: string,
    token: string,
    errorMessage?: string
): Promise<void> {
    LOG.info(`📧 Sending failure notification to ${senderEmail}...`);

    const errorLine = errorMessage
        ? `<p><strong>Error:</strong> ${errorMessage}</p>`
        : ``;
    const suggestion = `
        <p><strong>Please remember the following:</strong></p>
        <ul>
            <li>Do you have any leaves of this type left?</li>
            <li>Have you already taken leaves on any of these dates? You cannot have multiple leaves on the same date.</li>
            <li>Sick leaves cannot be taken in the future.</li>
        </ul>`;

    const failureMessage = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ Failed to submit your leave application.</strong></p>
                    ${errorLine}
                    ${suggestion}
                    <p><strong><u>Once you have corrected the error, please send a new email.</u></strong></p>
                    <p>If all else fails please contact HR or IT support for assistance, or manually submit your leave request.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        failureMessage,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 Failure notification sent to ${senderEmail}`);
}

/**
 * Send notification when a leave request fails pre-submission validation.
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param validationError - Human-readable description of the validation problem
 * @param suggestion - Actionable suggestion for the user to fix the issue
 * @param token - Graph API access token
 */
export async function sendValidationErrorNotification(
    email: EmailData,
    senderEmail: string,
    validationError: string,
    suggestion: string,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending validation error notification to ${senderEmail}...`);

    const message = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ Your leave request could not be processed.</strong></p>
                    <p><strong>Reason:</strong> ${validationError}</p>
                    <p>${suggestion}</p>
                    <p><strong><u>Please correct the issue and send a new email.</u></strong></p>
                    <p>If you believe this is an error, please contact HR or IT support for assistance.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        message,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 Validation error notification sent to ${senderEmail}`);
}

/**
 * Send notification when leave request is missing required fields
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param missingFields - Array of missing field names
 * @param token - Graph API access token
 */
export async function sendMissingFieldsNotification(
    email: EmailData,
    senderEmail: string,
    missingFields: string[],
    token: string
): Promise<void> {
    LOG.info(`📧 Sending missing fields notification to ${senderEmail}...`);

    const missingFieldsMessage = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ Your leave request is incomplete.</strong></p>
                    <p>The following required fields are missing:</p>
                    <ul>
                        ${missingFields.map(field => `<li><strong>${field}</strong></li>`).join('')}
                    </ul>
                    <p>The required fields are inferred from your email. But I am just an AI so i can make mistakes. If you are sure that all information is provided and the inference is wrong then you can send the required information explicitly to make it clearer.</p>
                    <p><strong>Required fields for a leave request:</strong></p>
                    <ul>
                        <li><strong>From Date</strong> - Start date of your leave</li>
                        <li><strong>To Date</strong> - End date of your leave</li>
                        <li><strong>Leave Type</strong> - Type of leave (e.g., Sick Leave, Privilege Leave)</li>
                        <li><strong>Transaction Type</strong> - Either "availed" (applying for leave) or "cancelled" (cancelling leave)</li>
                        <li><strong>[OPTIONAL] From Session</strong> - 1 or 2 (First half / morning session or second half / afternoon session of the day)</li>
                        <li><strong>[OPTIONAL] To Session</strong> - 1 or 2 (First half / morning session or second half / afternoon session of the day)</li>
                    </ul>
                    <p>Please send a new email with all the required information.</p>
                    <p>If you are requesting multiple leave simultaneously, please provide all required information individually for each leave request.</p>
                    <p>This is an automated notification. Please do not reply to this email.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        missingFieldsMessage,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 Missing fields notification sent to ${senderEmail}`);
}



/**
 * Send notification when no leave requests or cancellations were found in the email
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param token - Graph API access token
 */
export async function sendNoLeaveRequestsNotification(
    email: EmailData,
    senderEmail: string,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending "no leave requests found" notification to ${senderEmail}...`);

    const message = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>⚠️ No leave request or cancellation was found in your email.</strong></p>
                    <p>The AI was unable to identify any leave request or cancellation in the email you sent. This could be because:</p>
                    <ul>
                        <li>The email did not contain leave request details</li>
                        <li>The leave information was unclear or ambiguous</li>
                    </ul>
                    <p>If you intended to apply for or cancel a leave, please send a new email with the following details clearly stated:</p>
                    <ul>
                        <li><strong>From Date</strong> - Start date of your leave</li>
                        <li><strong>To Date</strong> - End date of your leave</li>
                        <li><strong>Leave Type</strong> - e.g., Sick Leave, Privilege Leave, Casual Leave</li>
                        <li><strong>Transaction</strong> - "availed" to apply or "cancelled" to cancel</li>
                    </ul>
                    <p>This is an automated notification. Please do not reply to this email.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        message,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 "No leave requests found" notification sent to ${senderEmail}`);
}

export async function sendManagerNotIncludedNotification(
    email: EmailData,
    senderEmail: string,
    managerName: string,
    managerEmail: string,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending "manager not included" notification to ${senderEmail}...`);

    const message = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ Your leave request could not be processed.</strong></p>
                    <p>Your manager (<strong>${managerName}</strong> — <a href="mailto:${managerEmail}">${managerEmail}</a>) was not included in the To or CC of your leave request email.</p>
                    <p>Please resend your leave request and make sure to <strong>include your manager</strong> in the email.</p>
                    <p>This is an automated notification. Please do not reply to this email.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        message,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 "Manager not included" notification sent to ${senderEmail}`);
}

/**
 * Send notification when the sender's email is from outside the company domain
 * and no valid internal account was provided.
 * @param email - The original email
 * @param senderEmail - Recipient email address (the original sender)
 * @param externalEmail - The email address that was identified as external
 * @param internalAccount - The internal account provided (if any), also external or null
 * @param companyDomain - The expected company email domain
 * @param token - Graph API access token
 */
export async function sendExternalDomainNotification(
    email: EmailData,
    senderEmail: string,
    externalEmail: string,
    internalAccount: string | null,
    companyDomain: string,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending "external domain" notification to ${senderEmail}...`);

    const internalAccountLine = internalAccount
        ? `<p>An Internal Account was provided (<strong>${internalAccount}</strong>), but it is also not from the <strong>@${companyDomain}</strong> domain.</p>`
        : `<p>No Internal Account was provided in the email.</p>`;

    const message = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ Your leave request could not be processed.</strong></p>
                    <p>The sender email <strong>${externalEmail}</strong> is not from the company domain (<strong>@${companyDomain}</strong>).</p>
                    ${internalAccountLine}
                    <p>To submit a leave request, please ensure that:</p>
                    <ul>
                        <li>The email is sent from your <strong>@${companyDomain}</strong> email address, <strong>OR</strong></li>
                        <li>The email body includes your company email as an Internal Account (e.g., <em>Internal Account: yourname@${companyDomain}</em>)</li>
                    </ul>
                    <p><strong><u>Please resend your leave request from your company email address or include a valid Internal Account.</u></strong></p>
                    <p>If you believe this is an error, please contact HR or IT support for assistance.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            ...buildReplyRecipients(email, senderEmail),
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        message,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 "External domain" notification sent to ${senderEmail}`);
}
