/**
 * Prompts for Email Parser Service
 * Contains AI prompts used for parsing leave requests from emails
 */

/**
 * Generate a prompt for extracting leave request information from email content
 * @param {Object} emailContent - The email content object
 * @param {string} emailContent.from - Sender's email address
 * @param {string} emailContent.subject - Email subject
 * @param {string} emailContent.bodyPreview - Email body preview
 * @param {string} emailContent.body - Full email body
 * @returns {string} The formatted prompt for OpenAI
 */
function getLeaveRequestPrompt(emailContent) {
  return `You are an AI assistant that extracts leave request information from emails.

Analyze the following email and extract:
1. From email address
2. Type of leave request (e.g., Sick Leave, Casual Leave, Privilege Leave, Comp off, etc.)
3. Leave dates (from date and to date)
4. Transaction type: either "availed" (applying for leave) or "cancelled" (cancelling a leave)
5. Reason for leave (if mentioned)

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
  "confidence": "high/medium/low"
}

Important:
- transaction should be "availed" for applying for leave, or "cancelled" for cancelling a leave
- If not specified, default transaction to "availed"
- If leave type is not specified, or mentioned as "personal leave" or "personal work", then default to "Sick Leave"
- If you cannot determine any field with confidence, use null for that field.`;
}

export { getLeaveRequestPrompt };
