/**
 * Prompts for Email Parser Service
 * Contains AI prompts used for parsing leave requests from emails
 */

import type { EmailContent } from '../../types/index.js';
import env from '../../env.js';

/**
 * Generate a prompt for extracting leave request information from email content
 */
export function getLeaveRequestPrompt(emailContent: EmailContent): string {
  return `You are an AI assistant that extracts leave request information from emails.

Analyze the following email and extract ALL leave requests mentioned. An employee may request multiple leaves in a single email (e.g., different date ranges, different leave types, or multiple individual days).

For each leave request extract:
1. From email address (each and every leave quest in a single email can only be from a single employee, so all email addresses for each leave request will be the same)
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

**Detecting forwarded or replied emails:**
The email body may contain a forwarded or replied message. Look for patterns like:
- "Re:" in the subject line
- "Fwd:" or "FW:" in the subject line
- Lines starting with "From:" followed by a name/email inside the body, that are then followed by a date or a "To:" email address

If you detect that this is a forwarded or reply email where someone is looping in the leave AI on behalf of another employee:
- Look for the ORIGINAL sender inside the forwarded/quoted block (a "From:" line in the body).
- Use THAT email address as the "fromEmail" for the leave request — NOT the outer sender (${emailContent.from}).
- The leave request details (dates, type, etc.) should also be extracted from the forwarded/original email content.

If you do NOT detect any forwarded or reply content, use the email address of thr sender (${emailContent.from}) as the fromEmail for every leave request.

Please respond ONLY with a valid JSON array. Even if there is only one leave request, wrap it in an array.
[
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
]

Important:
- transaction should be "availed" for applying for leave, or "cancelled" for cancelling a leave
- If not specified, default transaction to "availed". If people are requesting a leave, interpret that as "availed". If people are cancelling a request or cancelling a leave, interpret that as "cancelled"
- If leave type is not specified, or mentioned as "personal leave" or "personal work", then default to "${env.DEFAULT_LEAVE_TYPE}"
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
