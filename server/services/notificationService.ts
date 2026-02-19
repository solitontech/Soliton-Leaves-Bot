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
    LeaveApplicationResult,
    GreytHREmployee
} from "../types/index.js";

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
            toRecipients: [{ emailAddress: { address: senderEmail } }]
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
 * Send failure notification email to the leave requester
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param employee - Employee details
 * @param result - Failure result with error
 * @param token - Graph API access token
 */
export async function sendFailureNotification(
    email: EmailData,
    senderEmail: string,
    employee: GreytHREmployee,
    result: LeaveApplicationResult,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending failure notification to ${senderEmail}...`);

    const failureMessage = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello ${employee.name},</p>
                    <p><strong>❌ Failed to submit your leave application.</strong></p>
                    <p><strong>Error:</strong> ${!result.success ? result.error : 'Unknown error'}</p>
                    <p>Please check if you have any leaves of this type left, or whether you have already taken a leave on these dates. Also please note that sick leaves cannot be taken for the future.</p>
                    <p>If all else fails please contact HR or IT support for assistance, or manually submit your leave request.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            toRecipients: [{ emailAddress: { address: senderEmail } }]
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
                    <p><strong>Required fields for a leave request:</strong></p>
                    <ul>
                        <li><strong>From Date</strong> - Start date of your leave</li>
                        <li><strong>To Date</strong> - End date of your leave</li>
                        <li><strong>Leave Type</strong> - Type of leave (e.g., Sick Leave, Privilege Leave)</li>
                        <li><strong>Transaction Type</strong> - Either "availed" (applying for leave) or "cancelled" (cancelling leave)</li>
                    </ul>
                    <p>Please send a new email with all the required information.</p>
                    <p>This is an automated notification. Please do not reply to this email.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            toRecipients: [{ emailAddress: { address: senderEmail } }]
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
 * Send error notification email when an exception occurs during processing
 * @param email - The original email
 * @param senderEmail - Recipient email address
 * @param errorMessage - Error description
 * @param token - Graph API access token
 */
export async function sendErrorNotification(
    email: EmailData,
    senderEmail: string,
    errorMessage: string,
    token: string
): Promise<void> {
    LOG.info(`📧 Sending error notification to ${senderEmail}...`);

    const errorEmailMessage = {
        message: {
            subject: `RE: ${email.subject}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Hello,</p>
                    <p><strong>❌ An error occurred while processing your leave request.</strong></p>
                    <p><strong>Error:</strong> ${errorMessage}</p>
                    <p>Please check if you have any leaves of this type left, or whether you have already taken a leave on these dates. Also please note that sick leaves cannot be taken for the future.</p>
                    <p>If all else fails please contact HR or IT support for assistance, or manually submit your leave request.</p>
                    <p>Best regards,<br/>Leave Management AI</p>
                `
            },
            toRecipients: [{ emailAddress: { address: senderEmail } }]
        }
    };

    await axios.post(
        `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${email.id}/reply`,
        errorEmailMessage,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    LOG.info(`📧 Error notification sent to ${senderEmail}`);
}
