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
2. Type of leave request (e.g., Sick Leave, Casual Leave, Annual Leave, Vacation, Personal Leave, etc.)
3. Leave dates (start date and end date)

Email Details:
From: ${emailContent.from}
Subject: ${emailContent.subject}
Body: ${emailContent.bodyPreview || emailContent.body}

Please respond ONLY with a valid JSON object in the following format:
{
  "fromEmail": "email@example.com",
  "leaveType": "type of leave",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "confidence": "high/medium/low"
}

If you cannot determine any field with confidence, use null for that field.`;
}

export { getLeaveRequestPrompt };
