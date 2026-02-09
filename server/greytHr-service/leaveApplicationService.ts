import { applyLeave } from "./greytHrClient.js";
import logger from "../services/loggerService.js";
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
        if (!leaveRequest.fromDate || !leaveRequest.toDate || !leaveRequest.leaveType) {
            throw new Error("Missing required leave details: fromDate, toDate, or leaveType");
        }

        const leaveApplication: GreytHRLeaveApplication = {
            employeeNo: employeeNo,
            fromDate: leaveRequest.fromDate,
            toDate: leaveRequest.toDate,
            leaveTypeDescription: leaveRequest.leaveType,
            leaveTransactionTypeDescription: leaveRequest.transaction,
            reason: leaveRequest.reason || "Leave request via email"
        };

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
            },
        };
    }
}
