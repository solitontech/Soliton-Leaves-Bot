import { getEmployeeByEmail, applyLeave } from "./greytHrClient.js";
import logger from "../services/loggerService.js";

/**
 * Process and submit a leave application
 * @param {Object} leaveRequest - Parsed leave request from email
 * @param {string} leaveRequest.fromEmail - Employee email
 * @param {string} leaveRequest.toDate - Start date (YYYY-MM-DD)
 * @param {string} leaveRequest.toDate - End date (YYYY-MM-DD)
 * @param {string} leaveRequest.leaveType - Type of leave
 * @param {string} leaveRequest.transaction - Transaction type (availed/cancelled)
 * @param {string} leaveRequest.reason - Reason for leave
 * @returns {Promise<Object>} Result of the leave application
 */
export async function processLeaveApplication(leaveRequest) {
    try {
        logger.processingLeaveApplicationHeader();

        // Step 1: Get employee details by email
        logger.stepFetchingEmployee(leaveRequest.fromEmail);

        const employee = await getEmployeeByEmail(leaveRequest.fromEmail);

        if (!employee) {
            throw new Error(`Employee not found with email: ${leaveRequest.fromEmail}`);
        }

        const employeeNo = employee.employeeId;
        const employeeName = employee.name;
        const solitonEmployeeId = employee.employeeNo;

        logger.employeeDetails(employeeNo, employeeName, solitonEmployeeId);

        // Step 2: Prepare leave application with EXACT fields required by GreytHR
        logger.stepPreparingLeaveApplication(leaveRequest);

        const leaveApplication = {
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
        logger.leaveApplicationFailureSummary(error.message);

        return {
            success: false,
            error: error.message,
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
