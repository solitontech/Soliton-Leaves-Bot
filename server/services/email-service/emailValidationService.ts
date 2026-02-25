/**
 * Email Validation Service
 * Pre-submission validation for leave requests before they are sent to GreytHR.
 */

import type { LeaveRequest } from "../../types/index.js";

export interface ValidationSuccess {
    valid: true;
}

export interface ValidationFailure {
    valid: false;
    error: string;
    suggestion: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validate a leave request before submitting it to GreytHR.
 * Returns a ValidationResult indicating whether the request is valid,
 * or a human-readable error + suggestion if it isn't.
 */
export function validateLeaveRequest(leaveRequest: LeaveRequest): ValidationResult {
    if (!leaveRequest.fromDate || !leaveRequest.toDate) {
        return { valid: true }; // dates missing — handled separately by missing-fields logic
    }

    const from = new Date(leaveRequest.fromDate);
    const to = new Date(leaveRequest.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    // 1. Sick leave cannot be applied for future dates
    if (leaveRequest.leaveType?.toLowerCase() === "sick leave" && from > today) {
        return {
            valid: false,
            error: "Sick leave cannot be applied for a future date.",
            suggestion:
                "Sick leave is meant for days you have already been unwell. If you need to take a planned day off, please use a different leave type such as <strong>Casual Leave</strong> or <strong>Privilege Leave</strong>.",
        };
    }

    // 2. From date must not be after to date
    if (from > to) {
        return {
            valid: false,
            error: `The <strong>From Date</strong> (${leaveRequest.fromDate}) is after the <strong>To Date</strong> (${leaveRequest.toDate}).`,
            suggestion:
                "Please make sure the start date of your leave is on or before the end date.",
        };
    }

    // 3. Single-day leave: fromSession=2 with toSession=1 is invalid
    if (
        from.getTime() === to.getTime() &&
        leaveRequest.fromSession === 2 &&
        leaveRequest.toSession === 1
    ) {
        return {
            valid: false,
            error: "Invalid session combination for a single-day leave — the <strong>From Session</strong> (afternoon) cannot come before the <strong>To Session</strong> (morning) on the same day.",
            suggestion:
                "For a single-day leave you can apply for the full day, the morning session only (Session 1), or the afternoon session only (Session 2). Please correct and resend.",
        };
    }

    return { valid: true };
}
