import axios, { AxiosError } from "axios";
import OpenAI from "openai";
import { getLeaveRequestPrompt } from "./prompts.js";
import env from "../../env.js";
import logger from "../loggerService.js";
import type {
    EmailData,
    EmailContent,
    LeaveRequest,
    LeaveValidation,
    OpenAILeaveExtraction
} from "../../types/index.js";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

/**
 * Strip HTML tags from a string and decode common HTML entities,
 * producing readable plain text suitable for AI parsing.
 */
function stripHtml(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')   // remove <style> blocks
        .replace(/<script[\s\S]*?<\/script>/gi, '')  // remove <script> blocks
        .replace(/<br\s*\/?>/gi, '\n')               // <br> → newline
        .replace(/<\/p>/gi, '\n')                    // </p> → newline
        .replace(/<[^>]+>/g, '')                      // strip all remaining tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')                      // collapse horizontal whitespace
        .replace(/\n{3,}/g, '\n\n')                  // collapse excessive blank lines
        .trim();
}

/**
 * Check whether an email address belongs to the configured company domain.
 */
function isCompanyEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain === env.COMPANY_EMAIL_DOMAIN.toLowerCase();
}

/**
 * Resolve the effective `fromEmail` for a leave request based on domain rules.
 *
 * 1. If the parsed `fromEmail` is from the company domain → use it as-is.
 * 2. If it's external but an `internalAccount` exists and IS from the company domain → use the internal account.
 * 3. Otherwise → throw `ExternalDomainError`.
 */
function resolveFromEmail(leaveRequest: LeaveRequest): string {
    if (isCompanyEmail(leaveRequest.fromEmail)) {
        return leaveRequest.fromEmail;
    }

    // External sender — try the internal account fallback
    if (leaveRequest.internalAccount && isCompanyEmail(leaveRequest.internalAccount)) {
        logger.info(
            `🔄 External sender (${leaveRequest.fromEmail}), using internal account: ${leaveRequest.internalAccount}`
        );
        return leaveRequest.internalAccount;
    }

    // No valid company email available
    throw new ExternalDomainError(
        leaveRequest.fromEmail,
        leaveRequest.internalAccount ?? null
    );
}

/**
 * Parse email content to extract one or more leave request details.
 * Returns an array — a single email may contain multiple leave requests.
 */
export async function parseLeaveRequest(emailData: EmailData): Promise<LeaveRequest[]> {
    try {
        // Extract relevant email information
        // Use the full body (HTML-stripped to plain text) rather than the truncated bodyPreview
        const rawBody = emailData.body?.content || "";
        const plainBody = rawBody ? stripHtml(rawBody) : (emailData.bodyPreview || "");

        const emailContent: EmailContent = {
            from: emailData.from?.emailAddress?.address || "Unknown",
            subject: emailData.subject || "",
            body: plainBody,
            bodyPreview: emailData.bodyPreview || ""
        };

        logger.info(`📧 Parsing email:\n${JSON.stringify({ from: emailContent.from, subject: emailContent.subject, bodyPreview: emailContent.bodyPreview, body: emailContent.body }, null, 2)}`);

        // Prepare the prompt for OpenAI
        const prompt = getLeaveRequestPrompt(emailContent);

        // Call OpenAI API
        const response = await (openai as any).responses.create({
            model: env.OPENAI_MODEL,
            input: prompt,
            store: true,
        });

        // Parse the response
        const aiResponse: string = response.output_text;
        logger.openAIResponse(aiResponse);

        // Extract JSON array from the response (in case there's extra text)
        let parsedItems: OpenAILeaveExtraction[];
        try {
            const arrayMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                parsedItems = JSON.parse(arrayMatch[0]);
            } else {
                // Fallback: if the model returned a single object, wrap it
                const objectMatch = aiResponse.match(/\{[\s\S]*\}/);
                parsedItems = objectMatch ? [JSON.parse(objectMatch[0])] : JSON.parse(aiResponse);
            }
            if (!Array.isArray(parsedItems)) {
                parsedItems = [parsedItems];
            }
        } catch (parseError) {
            logger.error("Failed to parse OpenAI response as JSON:", parseError);
            throw new Error("Invalid response format from OpenAI");
        }

        logger.info(`🗓️  AI identified ${parsedItems.length} leave request(s) in the email`);

        // Map, validate, and collect results
        const results: LeaveRequest[] = [];
        const allMissingFields: string[] = [];

        for (let i = 0; i < parsedItems.length; i++) {
            const parsedData = parsedItems[i]!;
            const result: LeaveRequest = {
                fromEmail: parsedData.fromEmail,
                fromDate: parsedData.fromDate || null,
                toDate: parsedData.toDate || parsedData.endDate || null,
                leaveType: parsedData.leaveType || null,
                transaction: parsedData.transaction,
                reason: parsedData.reason || null,
                confidence: parsedData.confidence || "low",
                fromSession: parsedData.fromSession ? parseInt(String(parsedData.fromSession), 10) : null,
                toSession: parsedData.toSession ? parseInt(String(parsedData.toSession), 10) : null,
                internalAccount: parsedData.internalAccount || null,
            };

            logger.parsedLeaveRequest(result);

            const validation = validateLeaveRequest(result);
            if (!validation.isValid) {
                const prefix = parsedItems.length > 1 ? `Leave request ${i + 1}: ` : "";
                allMissingFields.push(...validation.missingFields.map(f => `${prefix}${f}`));
            } else {
                // ── Domain validation: resolve effective fromEmail ──
                const resolvedEmail = resolveFromEmail(result);
                result.fromEmail = resolvedEmail;
                results.push(result);
            }
        }

        // If any leave request had missing fields, throw for ALL of them together
        if (allMissingFields.length > 0) {
            logger.error(`Missing required fields: ${allMissingFields.join(', ')}`);
            throw new MissingFieldsError(allMissingFields);
        }

        return results;

    } catch (error) {
        const err = error as AxiosError<any> | Error;
        // Re-throw domain and missing-fields errors without wrapping
        if (err instanceof ExternalDomainError || err instanceof MissingFieldsError) {
            throw err;
        }
        logger.error("Error parsing leave request:", err.message);

        if (axios.isAxiosError(err) && err.response) {
            logger.error("OpenAI API Error:", err.response.data);
            throw new Error(`OpenAI API Error: ${err.response.data.error?.message || "Unknown error"}`);
        }

        throw error;
    }
}


/**
 * Validate if the parsed data contains all required fields
 */
export function validateLeaveRequest(parsedData: LeaveRequest): LeaveValidation {
    const missingFields: string[] = [];

    // Map of field names to user-friendly names
    const fieldLabels: Record<string, string> = {
        fromDate: "From Date",
        toDate: "To Date",
        leaveType: "Leave Type",
        transaction: "Transaction Type (availed/cancelled)"
    };

    if (!parsedData.fromDate) missingFields.push(fieldLabels['fromDate']!);
    if (!parsedData.toDate) missingFields.push(fieldLabels['toDate']!);
    if (!parsedData.leaveType) missingFields.push(fieldLabels['leaveType']!);
    if (!parsedData.transaction) missingFields.push(fieldLabels['transaction']!);

    return {
        isValid: missingFields.length === 0,
        missingFields,
        confidence: parsedData.confidence
    };
}

/**
 * Custom error class for missing required fields
 */
export class MissingFieldsError extends Error {
    public missingFields: string[];

    constructor(missingFields: string[]) {
        super(`Missing required fields: ${missingFields.join(', ')}`);
        this.name = 'MissingFieldsError';
        this.missingFields = missingFields;
    }
}

/**
 * Custom error class for external-domain senders with no valid internal account.
 */
export class ExternalDomainError extends Error {
    public externalEmail: string;
    public internalAccount: string | null;

    constructor(externalEmail: string, internalAccount: string | null) {
        const base = `The sender email "${externalEmail}" is not from the company domain (@${env.COMPANY_EMAIL_DOMAIN})`;
        const detail = internalAccount
            ? ` and the provided Internal Account "${internalAccount}" is also not from the company domain.`
            : ' and no Internal Account was provided.';
        super(base + detail);
        this.name = 'ExternalDomainError';
        this.externalEmail = externalEmail;
        this.internalAccount = internalAccount;
    }
}
