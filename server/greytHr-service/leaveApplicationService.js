import { getEmployeeByEmail, applyLeave } from "./greytHrClient.js";

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
        console.log("\n" + "=".repeat(60));
        console.log("🚀 Processing Leave Application");
        console.log("=".repeat(60));

        // Step 1: Get employee details by email
        console.log("\n👤 Step 1: Fetching employee details...");
        console.log(`   Email: ${leaveRequest.fromEmail}`);

        const employee = await getEmployeeByEmail(leaveRequest.fromEmail);

        if (!employee) {
            throw new Error(`Employee not found with email: ${leaveRequest.fromEmail}`);
        }

        const employeeNo = employee.employeeId;
        const employeeName = employee.name;
        const solitonEmployeeId = employee.employeeNo;

        console.log(`   Employee No: ${employeeNo}`);
        console.log(`   Employee Name: ${employeeName}`);
        console.log(`   Soliton Employee ID: ${solitonEmployeeId}`);

        // Step 2: Prepare leave application with EXACT fields required by GreytHR
        console.log("\n📝 Step 2: Preparing leave application...");
        console.log(`   Leave Type: ${leaveRequest.leaveType}`);
        console.log(`   Transaction: ${leaveRequest.transaction}`);
        console.log(`   From: ${leaveRequest.toDate}`);
        console.log(`   To: ${leaveRequest.toDate}`);
        console.log(`   Reason: ${leaveRequest.reason || "Leave request via email"}`);

        const leaveApplication = {
            employeeNo: employeeNo,
            fromDate: leaveRequest.toDate,
            toDate: leaveRequest.toDate,
            leaveTypeDescription: leaveRequest.leaveType,
            leaveTransactionTypeDescription: leaveRequest.transaction,
            reason: leaveRequest.reason || "Leave request via email"
        };

        // Step 3: Submit to GreytHR
        console.log("\n🚀 Step 3: Submitting to GreytHR...");
        const result = await applyLeave(leaveApplication);

        console.log("\n" + "=".repeat(60));
        console.log("✅ Leave Application Successful!");
        console.log("=".repeat(60));
        console.log(`   Employee: ${employeeName} (${employeeNo})`);
        console.log(`   Leave Type: ${leaveRequest.leaveType}`);
        console.log(`   Transaction: ${leaveRequest.transaction}`);
        console.log(`   Duration: ${leaveRequest.toDate} to ${leaveRequest.toDate}`);
        console.log("=".repeat(60) + "\n");

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
                fromDate: leaveRequest.toDate,
                toDate: leaveRequest.toDate,
                reason: leaveRequest.reason,
            },
            greytHRResponse: result,
        };

    } catch (error) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ Leave Application Failed!");
        console.error("=".repeat(60));
        console.error(`   Error: ${error.message}`);
        console.error("=".repeat(60) + "\n");

        return {
            success: false,
            error: error.message,
            employee: {
                email: leaveRequest.fromEmail,
            },
            leaveDetails: {
                leaveType: leaveRequest.leaveType,
                transaction: leaveRequest.transaction,
                fromDate: leaveRequest.toDate,
                toDate: leaveRequest.toDate,
            },
        };
    }
}
