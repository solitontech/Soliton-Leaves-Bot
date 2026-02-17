import { applyLeave } from "./greytHr-service/greytHrClient.js";
import logger from "./loggerService.js";
import type {
    LeaveRequest,
    LeaveApplicationResult,
    GreytHRLeaveApplication,
    GreytHREmployee
} from "../types/index.js";

/**
 * Process and submit a leave application
 * @param leaveRequest - The parsed leave request
 * @param employee - The employee details (already fetched to avoid duplicate lookup)
 */
export async function processLeaveApplication(
    leaveRequest: LeaveRequest,
    employee: GreytHREmployee
): Promise<LeaveApplicationResult> {
    try {
        logger.processingLeaveApplicationHeader();

        const employeeNo = employee.employeeId;
        const employeeName = employee.name;
        const solitonEmployeeId = employee.employeeNo;

        // Step 2: Prepare leave application with EXACT fields required by GreytHR
        logger.employeeDetails(employeeNo, employeeName, solitonEmployeeId);
        logger.stepPreparingLeaveApplication(leaveRequest);

        // Ensure dates are not null before sending to GreytHR
        if (!leaveRequest.fromDate || !leaveRequest.toDate || !leaveRequest.leaveType || !leaveRequest.transaction) {
            throw new Error("Missing required leave details: fromDate, toDate, or leaveType or transaction");
        }

        const leaveApplication: GreytHRLeaveApplication = {
            employeeNo: solitonEmployeeId,
            fromDate: leaveRequest.fromDate,
            toDate: leaveRequest.toDate,
            leaveTypeDescription: leaveRequest.leaveType,
            leaveTransactionTypeDescription: leaveRequest.transaction,
            reason: leaveRequest.reason || "Leave request via email"
        };

        // Add optional session fields if present
        if (leaveRequest.fromSession !== null && leaveRequest.fromSession !== undefined) {
            leaveApplication.fromSession = leaveRequest.fromSession;
        }
        if (leaveRequest.toSession !== null && leaveRequest.toSession !== undefined) {
            leaveApplication.toSession = leaveRequest.toSession;
        }

        // Step 3: Submit to GreytHR
        logger.stepSubmittingToGreytHR();
        const result = await applyLeave(leaveApplication);

        logger.leaveApplicationSuccessSummary(employeeName, employeeNo, leaveRequest);

        return {
            success: true,
            employee: {
                employeeNo: employeeNo,
                name: employeeName,
                email: leaveRequest.fromEmail,
            },
            leaveDetails: {
                leaveType: leaveRequest.leaveType,
                transaction: leaveRequest.transaction,
                fromDate: leaveRequest.fromDate,
                toDate: leaveRequest.toDate,
                reason: leaveRequest.reason,
                fromSession: leaveRequest.fromSession,
                toSession: leaveRequest.toSession
            },
            greytHRResponse: result,
        };

    } catch (error) {
        const err = error as Error;
        logger.leaveApplicationFailureSummary(err.message);

        return {
            success: false,
            error: err.message,
            employee: {
                email: leaveRequest.fromEmail,
            },
            leaveDetails: {
                leaveType: leaveRequest.leaveType,
                transaction: leaveRequest.transaction,
                fromDate: leaveRequest.fromDate,
                toDate: leaveRequest.toDate,
                fromSession: leaveRequest.fromSession,
                toSession: leaveRequest.toSession
            },
        };
    }
}
