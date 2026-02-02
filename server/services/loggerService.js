/**
 * Logger Service
 * Centralized logging service for the application
 * Currently uses console.log but can be extended to support file logging, external services, etc.
 */

class LoggerService {
    /**
     * Log informational messages
     * @param {string} message - The message to log
     * @param {any} data - Optional data to log
     */
    info(message, data = null) {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }

    /**
     * Log error messages
     * @param {string} message - The error message
     * @param {any} error - Optional error object or data
     */
    error(message, error = null) {
        if (error !== null) {
            console.error(message, error);
        } else {
            console.error(message);
        }
    }

    /**
     * Log warning messages
     * @param {string} message - The warning message
     * @param {any} data - Optional data to log
     */
    warn(message, data = null) {
        if (data !== null) {
            console.warn(message, data);
        } else {
            console.warn(message);
        }
    }

    /**
     * Log debug messages
     * @param {string} message - The debug message
     * @param {any} data - Optional data to log
     */
    debug(message, data = null) {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }

    /**
     * Log a separator line
     * @param {number} length - Length of the separator (default: 60)
     */
    separator(length = 60) {
        console.log("=".repeat(length));
    }

    /**
     * Log a section header
     * @param {string} title - The section title
     * @param {number} length - Length of the separator (default: 60)
     */
    section(title, length = 60) {
        console.log("\n" + "=".repeat(length));
        console.log(title);
        console.log("=".repeat(length));
    }

    /**
     * Log Graph notification received
     */
    graphNotificationReceived() {
        console.log("📨 Received Graph notification");
    }

    /**
     * Log validation request
     * @param {string} token - Validation token
     */
    graphValidationRequest(token) {
        console.log("✅ Validation request received");
        console.log("Validation token:", token);
    }

    /**
     * Log Graph notification body
     * @param {Object} body - The notification body
     */
    graphNotificationBody(body) {
        console.log("Graph notification body:", body);
    }

    /**
     * Log full email data
     * @param {Object} emailData - The email data
     */
    fullEmail(emailData) {
        console.log("Full email:", emailData);
    }

    /**
     * Log parsing leave request
     */
    parsingLeaveRequest() {
        console.log("\n🔍 Parsing leave request from email...");
    }

    /**
     * Log valid leave request parsed
     * @param {Object} leaveRequest - The parsed leave request
     */
    validLeaveRequestParsed(leaveRequest) {
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
    submittingToGreytHR() {
        console.log("\n🚀 Submitting to GreytHR...");
    }

    /**
     * Log leave application success
     * @param {string} applicationId - The application ID
     */
    leaveApplicationSuccess(applicationId) {
        console.log("✅ Leave application submitted successfully!");
        console.log(`   Application ID: ${applicationId}`);
    }

    /**
     * Log leave application failure
     * @param {string} error - The error message
     */
    leaveApplicationFailed(error) {
        console.error("❌ Leave application failed:");
        console.error(`   Error: ${error}`);
    }

    /**
     * Log incomplete leave request
     * @param {Array} missingFields - Array of missing field names
     * @param {string} confidence - Confidence level
     */
    incompleteLeaveRequest(missingFields, confidence) {
        console.log("⚠️ Incomplete leave request detected");
        console.log(`   Missing fields: ${missingFields.join(", ")}`);
        console.log(`   Confidence: ${confidence}`);
    }

    /**
     * Log parsing email from address
     * @param {string} email - Email address
     */
    parsingEmailFrom(email) {
        console.log("Parsing email from:", email);
    }

    /**
     * Log OpenAI response
     * @param {string} response - The AI response
     */
    openAIResponse(response) {
        console.log("OpenAI Response:", response);
    }

    /**
     * Log parsed leave request
     * @param {Object} result - The parsed result
     */
    parsedLeaveRequest(result) {
        console.log("Parsed leave request:", result);
    }

    /**
     * Log GreytHR authentication
     */
    greytHRAuthenticating() {
        console.log("🔐 Authenticating with GreytHR...");
    }

    /**
     * Log GreytHR authentication success
     */
    greytHRAuthSuccess() {
        console.log("✅ GreytHR authentication successful");
    }

    /**
     * Log GreytHR request details
     * @param {string} url - The request URL
     * @param {string} domain - The GreytHR domain
     */
    greytHRRequestDetails(url, domain) {
        console.log(`URL: ${url}`);
        console.log(`Domain: ${domain}`);
    }

    /**
     * Log fetching employee details
     * @param {string} email - Employee email
     */
    fetchingEmployeeDetails(email) {
        console.log(`🔍 Fetching employee details for: ${email}`);
    }

    /**
     * Log employee found
     * @param {string} name - Employee name
     */
    employeeFound(name) {
        console.log(`✅ Found employee: ${name}`);
    }

    /**
     * Log submitting leave application
     * @param {Object} leaveApplication - The leave application data
     */
    submittingLeaveApplication(leaveApplication) {
        console.log("📝 Submitting leave application to GreytHR...");
        console.log("   Leave Application:", leaveApplication);
    }

    /**
     * Log leave application submitted
     */
    leaveApplicationSubmitted() {
        console.log("✅ Leave application submitted successfully");
    }

    /**
     * Log processing leave application header
     */
    processingLeaveApplicationHeader() {
        console.log("\n" + "=".repeat(60));
        console.log("🚀 Processing Leave Application");
        console.log("=".repeat(60));
    }

    /**
     * Log employee details step
     * @param {string} email - Employee email
     */
    stepFetchingEmployee(email) {
        console.log("\n👤 Step 1: Fetching employee details...");
        console.log(`   Email: ${email}`);
    }

    /**
     * Log employee details
     * @param {string} employeeNo - Employee number
     * @param {string} employeeName - Employee name
     * @param {string} solitonEmployeeId - Soliton employee ID
     */
    employeeDetails(employeeNo, employeeName, solitonEmployeeId) {
        console.log(`   Employee No: ${employeeNo}`);
        console.log(`   Employee Name: ${employeeName}`);
        console.log(`   Soliton Employee ID: ${solitonEmployeeId}`);
    }

    /**
     * Log preparing leave application step
     * @param {Object} leaveRequest - The leave request
     */
    stepPreparingLeaveApplication(leaveRequest) {
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
    stepSubmittingToGreytHR() {
        console.log("\n🚀 Step 3: Submitting to GreytHR...");
    }

    /**
     * Log leave application success summary
     * @param {string} employeeName - Employee name
     * @param {string} employeeNo - Employee number
     * @param {Object} leaveRequest - The leave request
     */
    leaveApplicationSuccessSummary(employeeName, employeeNo, leaveRequest) {
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
     * @param {string} errorMessage - The error message
     */
    leaveApplicationFailureSummary(errorMessage) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ Leave Application Failed!");
        console.error("=".repeat(60));
        console.error(`   Error: ${errorMessage}`);
        console.error("=".repeat(60) + "\n");
    }

    /**
     * Log GreytHR API request failed
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {number} status - HTTP status code
     * @param {any} responseData - Response data
     */
    greytHRAPIRequestFailed(method, endpoint, status = null, responseData = null) {
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
     * @param {number} port - Server port
     * @param {string} publicUrl - Public URL
     * @param {boolean} isHttps - Whether using HTTPS
     * @param {string} certPath - SSL certificate path (optional)
     */
    serverStartup(port, publicUrl, isHttps, certPath = null) {
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
     * @param {string} errorMessage - Error message
     * @param {string} keyPath - SSL key path
     * @param {string} certPath - SSL certificate path
     */
    serverStartupFailed(errorMessage, keyPath, certPath) {
        console.error("❌ Failed to start HTTPS server:");
        console.error("   Error:", errorMessage);
        console.error("\n💡 Check that SSL certificate files exist and are readable:");
        console.error(`   Key: ${keyPath}`);
        console.error(`   Cert: ${certPath}`);
    }
}

// Export a singleton instance
const logger = new LoggerService();
export default logger;
