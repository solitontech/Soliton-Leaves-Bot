/**
 * Logger Service
 * Centralized logging service for the application
 * Currently uses console.log but can be extended to support file logging, external services, etc.
 */

import type { LeaveRequest } from '../types/index.js';

class LoggerService {
    /**
     * Log informational messages
     */
    info(message: string, data: any = null): void {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }

    /**
     * Log error messages
     */
    error(message: string, error: any = null): void {
        if (error !== null) {
            console.error(message, error);
        } else {
            console.error(message);
        }
    }

    /**
     * Log warning messages
     */
    warn(message: string, data: any = null): void {
        if (data !== null) {
            console.warn(message, data);
        } else {
            console.warn(message);
        }
    }

    /**
     * Log debug messages
     */
    debug(message: string, data: any = null): void {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }

    /**
     * Log a separator line
     */
    separator(length: number = 60): void {
        console.log("=".repeat(length));
    }

    /**
     * Log a section header
     */
    section(title: string, length: number = 60): void {
        console.log("\n" + "=".repeat(length));
        console.log(title);
        console.log("=".repeat(length));
    }

    /**
     * Log Graph notification received
     */
    graphNotificationReceived(): void {
        console.log("📨 Received Graph notification");
    }

    /**
     * Log validation request
     */
    graphValidationRequest(token: string): void {
        console.log("✅ Validation request received");
        console.log("Validation token:", token);
    }

    /**
     * Log Graph notification body
     */
    graphNotificationBody(body: any): void {
        console.log("Graph notification body:", body);
    }

    /**
     * Log full email data
     */
    fullEmail(emailData: any): void {
        console.log("Full email:", emailData);
    }

    /**
     * Log parsing leave request
     */
    parsingLeaveRequest(): void {
        console.log("\n🔍 Parsing leave request from email...");
    }

    /**
     * Log valid leave request parsed
     */
    validLeaveRequestParsed(leaveRequest: LeaveRequest): void {
        console.log("✅ Valid leave request parsed:");
        console.log(`   From: ${leaveRequest.fromEmail}`);
        console.log(`   Leave Type: ${leaveRequest.leaveType}`);
        console.log(`   Transaction: ${leaveRequest.transaction}`);
        console.log(`   Start Date: ${leaveRequest.fromDate}`);
        console.log(`   To Date: ${leaveRequest.toDate}`);
        console.log(`   Reason: ${leaveRequest.reason || "N/A"}`);
        console.log(`   Confidence: ${leaveRequest.confidence}`);
    }

    /**
     * Log submitting to GreytHR
     */
    submittingToGreytHR(): void {
        console.log("\n🚀 Submitting to GreytHR...");
    }

    /**
     * Log leave application success
     */
    leaveApplicationSuccess(applicationId?: string): void {
        console.log("✅ Leave application submitted successfully!");
        if (applicationId) {
            console.log(`   Application ID: ${applicationId}`);
        }
    }

    /**
     * Log leave application failure
     */
    leaveApplicationFailed(error: string): void {
        console.error("❌ Leave application failed:");
        console.error(`   Error: ${error}`);
    }

    /**
     * Log incomplete leave request
     */
    incompleteLeaveRequest(missingFields: string[], confidence: string): void {
        console.log("⚠️ Incomplete leave request detected");
        console.log(`   Missing fields: ${missingFields.join(", ")}`);
        console.log(`   Confidence: ${confidence}`);
    }

    /**
     * Log parsing email from address
     */
    parsingEmailFrom(email: string): void {
        console.log("Parsing email from:", email);
    }

    /**
     * Log OpenAI response
     */
    openAIResponse(response: string): void {
        console.log("OpenAI Response:", response);
    }

    /**
     * Log parsed leave request
     */
    parsedLeaveRequest(result: LeaveRequest): void {
        console.log("Parsed leave request:", result);
    }

    /**
     * Log GreytHR authentication
     */
    greytHRAuthenticating(): void {
        console.log("🔐 Authenticating with GreytHR...");
    }

    /**
     * Log GreytHR authentication success
     */
    greytHRAuthSuccess(): void {
        console.log("✅ GreytHR authentication successful");
    }

    /**
     * Log GreytHR request details
     */
    greytHRRequestDetails(url: string, domain: string): void {
        console.log(`URL: ${url}`);
        console.log(`Domain: ${domain}`);
    }

    /**
     * Log fetching employee details
     */
    fetchingEmployeeDetails(email: string): void {
        console.log(`🔍 Fetching employee details for: ${email}`);
    }

    /**
     * Log employee found
     */
    employeeFound(name: string): void {
        console.log(`✅ Found employee: ${name}`);
    }

    /**
     * Log submitting leave application
     */
    submittingLeaveApplication(leaveApplication: any): void {
        console.log("📝 Submitting leave application to GreytHR...");
        console.log("   Leave Application:", leaveApplication);
    }

    /**
     * Log leave application submitted
     */
    leaveApplicationSubmitted(): void {
        console.log("✅ Leave application submitted successfully");
    }

    /**
     * Log processing leave application header
     */
    processingLeaveApplicationHeader(): void {
        console.log("\n" + "=".repeat(60));
        console.log("🚀 Processing Leave Application");
        console.log("=".repeat(60));
    }

    /**
     * Log employee details step
     */
    stepFetchingEmployee(email: string): void {
        console.log("\n👤 Step 1: Fetching employee details...");
        console.log(`   Email: ${email}`);
    }

    /**
     * Log employee details
     */
    employeeDetails(employeeNo: string, employeeName: string, solitonEmployeeId: string): void {
        console.log(`   Employee No: ${employeeNo}`);
        console.log(`   Employee Name: ${employeeName}`);
        console.log(`   Soliton Employee ID: ${solitonEmployeeId}`);
    }

    /**
     * Log preparing leave application step
     */
    stepPreparingLeaveApplication(leaveRequest: LeaveRequest): void {
        console.log("\n📝 Step 2: Preparing leave application...");
        console.log(`   Leave Type: ${leaveRequest.leaveType}`);
        console.log(`   Transaction: ${leaveRequest.transaction}`);
        console.log(`   From: ${leaveRequest.fromDate}`);
        console.log(`   To: ${leaveRequest.toDate}`);
        console.log(`   Reason: ${leaveRequest.reason || "Leave request via email"}`);
    }

    /**
     * Log submitting to GreytHR step
     */
    stepSubmittingToGreytHR(): void {
        console.log("\n🚀 Step 3: Submitting to GreytHR...");
    }

    /**
     * Log leave application success summary
     */
    leaveApplicationSuccessSummary(employeeName: string, employeeNo: string, leaveRequest: LeaveRequest): void {
        console.log("\n" + "=".repeat(60));
        console.log("✅ Leave Application Successful!");
        console.log("=".repeat(60));
        console.log(`   Employee: ${employeeName} (${employeeNo})`);
        console.log(`   Leave Type: ${leaveRequest.leaveType}`);
        console.log(`   Transaction: ${leaveRequest.transaction}`);
        console.log(`   Duration: ${leaveRequest.fromDate} to ${leaveRequest.toDate}`);
        console.log("=".repeat(60) + "\n");
    }

    /**
     * Log leave application failure summary
     */
    leaveApplicationFailureSummary(errorMessage: string): void {
        console.error("\n" + "=".repeat(60));
        console.error("❌ Leave Application Failed!");
        console.error("=".repeat(60));
        console.error(`   Error: ${errorMessage}`);
        console.error("=".repeat(60) + "\n");
    }

    /**
     * Log GreytHR API request failed
     */
    greytHRAPIRequestFailed(method: string, endpoint: string, status: number | null = null, responseData: any = null): void {
        console.error(`❌ GreytHR API request failed: ${method} ${endpoint}`);
        if (status) {
            console.error("Status:", status);
        }
        if (responseData) {
            console.error("Response:", responseData);
        }
    }

    /**
     * Log server startup
     */
    serverStartup(port: number, publicUrl: string, isHttps: boolean, certPath: string | null = null): void {
        if (isHttps) {
            console.log(`✅ HTTPS Server listening on port ${port}`);
            if (certPath) {
                console.log(`🔒 SSL Certificate: ${certPath}`);
            }
        } else {
            console.log(`⚠️  HTTP Server listening on port ${port}`);
        }
        console.log(`🌐 Public URL: ${publicUrl}`);
    }

    /**
     * Log server startup failure
     */
    serverStartupFailed(errorMessage: string, keyPath: string, certPath: string): void {
        console.error("❌ Failed to start HTTPS server:");
        console.error("   Error:", errorMessage);
        console.error("\n💡 Check that SSL certificate files exist and are readable:");
        console.error(`   Key: ${keyPath}`);
        console.error(`   Cert: ${certPath}`);
    }
}

// Export a singleton instance
const LOG = new LoggerService();
export default LOG;
