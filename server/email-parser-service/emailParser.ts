import axios, { AxiosError } from "axios";
import OpenAI from "openai";
import { getLeaveRequestPrompt } from "./prompts.js";
import env from "../env.js";
import logger from "../services/loggerService.js";
import type {
    EmailData,
    EmailContent,
    LeaveRequest,
    LeaveValidation,
    OpenAILeaveExtraction
} from "../types/index.js";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

/**
 * Parse email content to extract leave request details
 */
export async function parseLeaveRequest(emailData: EmailData): Promise<LeaveRequest> {
    try {
        // Extract relevant email information
        const emailContent: EmailContent = {
            from: emailData.from?.emailAddress?.address || "Unknown",
            subject: emailData.subject || "",
            body: emailData.body?.content || "",
            bodyPreview: emailData.bodyPreview || ""
        };

        logger.parsingEmailFrom(emailContent.from);

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

        // Extract JSON from the response (in case there's extra text)
        let parsedData: OpenAILeaveExtraction;
        try {
            // Try to find JSON in the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                parsedData = JSON.parse(aiResponse);
            }
        } catch (parseError) {
            logger.error("Failed to parse OpenAI response as JSON:", parseError);
            throw new Error("Invalid response format from OpenAI");
        }

        // Validate and return the parsed data
        const result: LeaveRequest = {
            fromEmail: parsedData.fromEmail || emailContent.from,
            fromDate: parsedData.fromDate || null,
            toDate: parsedData.toDate || parsedData.endDate || null,
            leaveType: parsedData.leaveType || null,
            transaction: parsedData.transaction || "availed",
            reason: parsedData.reason || null,
            confidence: parsedData.confidence || "low",
        };

        logger.parsedLeaveRequest(result);
        return result;

    } catch (error) {
        const err = error as AxiosError<any> | Error;
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
    const requiredFields: (keyof LeaveRequest)[] = ["fromEmail", "fromDate", "toDate", "leaveType", "transaction"];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        if (!parsedData[field]) {
            missingFields.push(field);
        }
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
        confidence: parsedData.confidence
    };
}
