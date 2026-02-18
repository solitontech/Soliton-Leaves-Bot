/**
 * Prompts for Email Parser Service
 * Contains AI prompts used for parsing leave requests from emails
 */

import type { EmailContent } from '../../types/index.js';

/**
 * Generate a prompt for extracting leave request information from email content
 */
export function getLeaveRequestPrompt(emailContent: EmailContent): string {
  return `You are an AI assistant that extracts leave request information from emails.

Analyze the following email and extract:
1. From email address
2. Type of leave request (e.g., Sick Leave, Casual Leave, Privilege Leave, Comp off, etc.)
3. Leave dates (from date and to date)
4. Transaction type: either "availed" (applying for leave) or "cancelled" (cancelling a leave).
5. Reason for leave (if mentioned)
6. From Session (optional): Session number for the start date (integer, 1 is first half of the day, 2 is second half of the day)
7. To Session (optional): Session number for the end date (integer, 1 is first half of the day, 2 is second half of the day)

Email Details:
From: ${emailContent.from}
Subject: ${emailContent.subject}
Body: ${emailContent.bodyPreview || emailContent.body}

Please respond ONLY with a valid JSON object in the following format:
{
  "fromEmail": "email@example.com",
  "fromDate": "YYYY-MM-DD",
  "toDate": "YYYY-MM-DD",
  "leaveType": "type of leave",
  "transaction": "availed or cancelled",
  "reason": "reason for leave if mentioned",
  "fromSession": 1 or 2 or null,
  "toSession": 1 or 2 or null,
  "confidence": "high/medium/low"
}

Important:
- transaction should be "availed" for applying for leave, or "cancelled" for cancelling a leave
- If not specified, default transaction to "availed". If people are requesting a leave, interpret that as "availed". If people are cancelling a request or cancelling a leave, interpret that as "cancelled"
- If leave type is not specified, or mentioned as "personal leave" or "personal work", then default to "Sick Leave"
- fromSession and toSession are optional integer fields (1 or 2). 1 is first half of the day, 2 is second half of the day
  - If fromSession or toSession are not mentioned in the email, set them to null
  - If people mention they are requesting leave for "first half" or "forenoon" or "morning session" or "till lunch" that means they are requesting fromSession 1 and toSession 1
  - If people mention they are requesting leave for "second half" or "afternoon" or "afternoon session" or "after lunch" that means they are requesting fromSession 2 and toSession 2
  - Examples:
    - If people mention they are requesting leave from "first half" of fromDate to "first half" of toDate that means they are requesting fromSession 1 of fromDate and toSession 1 of toDate
    - If people mention they are requesting leave from "afternoon session" of fromDate to "second half" of toDate that means they are requesting fromSession 2 of fromDate and toSession 2 of toDate
    - If people mention they are requesting leave from "second half" of fromDate to "forenoon" of toDate that means they are requesting fromSession 2 of fromDate and toSession 1 of toDate
- If you cannot determine any field with confidence, use null for that field.`;
}
