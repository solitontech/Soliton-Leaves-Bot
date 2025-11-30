import axios from "axios";
import OpenAI from "openai";
import { getLeaveRequestPrompt } from "./prompts.js";
import env from "../env.js";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

/**
 * Parse email content to extract leave request details
 * @param {Object} emailData - The email data object from Microsoft Graph API
 * @returns {Promise<Object>} Parsed leave request information
 */
async function parseLeaveRequest(emailData) {
    try {
        // Extract relevant email information
        const emailContent = {
            from: emailData.from?.emailAddress?.address || "Unknown",
            subject: emailData.subject || "",
            body: emailData.body?.content || "",
            bodyPreview: emailData.bodyPreview || ""
        };

        console.log("Parsing email from:", emailContent.from);

        // Prepare the prompt for OpenAI
        const prompt = getLeaveRequestPrompt(emailContent);

        // Call OpenAI API
        const response = openai.responses.create({
            model: "gpt-5-nano",
            input: prompt,
            store: true,
        });

        // Parse the response
        const aiResponse = response.data.choices[0].message.content;
        console.log("OpenAI Response:", aiResponse);

        // Extract JSON from the response (in case there's extra text)
        let parsedData;
        try {
            // Try to find JSON in the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                parsedData = JSON.parse(aiResponse);
            }
        } catch (parseError) {
            console.error("Failed to parse OpenAI response as JSON:", parseError);
            throw new Error("Invalid response format from OpenAI");
        }

        // Validate and return the parsed data
        const result = {
            fromEmail: parsedData.fromEmail || emailContent.from,
            leaveType: parsedData.leaveType || null,
            startDate: parsedData.startDate || null,
            endDate: parsedData.endDate || null,
            confidence: parsedData.confidence || "low",
            rawEmail: {
                subject: emailContent.subject,
                from: emailContent.from,
                bodyPreview: emailContent.bodyPreview
            }
        };

        console.log("Parsed leave request:", result);
        return result;

    } catch (error) {
        console.error("Error parsing leave request:", error.message);

        if (error.response) {
            console.error("OpenAI API Error:", error.response.data);
            throw new Error(`OpenAI API Error: ${error.response.data.error?.message || "Unknown error"}`);
        }

        throw error;
    }
}

/**
 * Validate if the parsed data contains all required fields
 * @param {Object} parsedData - The parsed leave request data
 * @returns {Object} Validation result with isValid flag and missing fields
 */
function validateLeaveRequest(parsedData) {
    const requiredFields = ["fromEmail", "leaveType", "startDate", "endDate"];
    const missingFields = [];

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

export { parseLeaveRequest, validateLeaveRequest };
