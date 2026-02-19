/**
 * Email Thread Service
 * Fetches the full conversation thread for an email notification and returns
 * the oldest email in the thread, which is always the original leave request.
 */

import axios from "axios";
import env from "../../env.js";
import LOG from "../loggerService.js";
import type {
    EmailData,
    ThreadResolutionResult,
} from "../../types/index.js";

/**
 * Given the message ID of the email that triggered the notification:
 * 1. Fetch that email to get its conversationId.
 * 2. Fetch ALL messages in the conversation thread, sorted oldest-first.
 * 3. Return the oldest email (index 0) — this is always the original leave request.
 */
export async function resolveLeaveEmailFromThread(
    messageId: string,
    token: string
): Promise<ThreadResolutionResult> {
    const headers = { Authorization: `Bearer ${token}` };
    const baseUrl = `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}`;

    // ── Step 1: Fetch the triggered email to get its conversationId ────────────
    LOG.info(`📧 Fetching triggered email: ${messageId}`);
    const triggerResponse = await axios.get<EmailData>(
        `${baseUrl}/messages/${messageId}`,
        { headers }
    );
    const triggerEmail = triggerResponse.data;
    const conversationId = triggerEmail.conversationId;

    if (!conversationId) {
        LOG.warn("⚠️  No conversationId found — using triggered email directly.");
        return buildResult(triggerEmail);
    }

    // ── Step 2: Fetch the full conversation thread, sorted oldest-first ────────
    LOG.info(`🧵 Fetching conversation thread: ${conversationId}`);
    const threadResponse = await axios.get<{ value: EmailData[] }>(
        `${baseUrl}/messages?$filter=conversationId eq '${conversationId}'&$orderby=receivedDateTime asc&$select=id,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,conversationId`,
        { headers }
    );
    const threadEmails = threadResponse.data.value;

    LOG.info(`🧵 Found ${threadEmails.length} email(s) in conversation thread`);

    // ── Step 3: The oldest email is always the original leave request ──────────
    const leaveEmail = threadEmails[0] ?? triggerEmail;

    if (threadEmails.length > 1) {
        LOG.info(`📧 Using oldest email in thread as the leave request (from: ${leaveEmail.from?.emailAddress?.address})`);
    }

    return buildResult(leaveEmail);
}

/** Build a ThreadResolutionResult from an EmailData object. */
function buildResult(email: EmailData): ThreadResolutionResult {
    const senderEmail = email.from?.emailAddress?.address ?? "";
    return { leaveEmail: email, senderEmail };
}
