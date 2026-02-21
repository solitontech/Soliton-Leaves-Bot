/**
 * Email Thread Service
 * Fetches the triggered email and returns it as the leave request email.
 */

import axios from "axios";
import env from "../../env.js";
import LOG from "../loggerService.js";
import type {
    EmailData,
    ThreadResolutionResult,
} from "../../types/index.js";

/**
 * Fetches the email that triggered the Graph notification and returns it
 * directly as the leave request email.
 */
export async function resolveLeaveEmailFromThread(
    messageId: string,
    token: string
): Promise<ThreadResolutionResult> {
    const headers = { Authorization: `Bearer ${token}` };
    const baseUrl = `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}`;

    LOG.info(`📧 Fetching triggered email: ${messageId}`);
    const response = await axios.get<EmailData>(
        `${baseUrl}/messages/${messageId}`,
        { headers }
    );
    const email = response.data;
    const sender = email.from?.emailAddress?.address ?? "";

    return { leaveEmail: email, sender };
}
