import axios from "axios";
import { getGreytHRToken } from "./greytHrAuth.js";
import env from "../env.js";

/**
 * Make an authenticated API request to GreytHR
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data
 * @returns {Promise<Object>} API response
 */
async function greytHRRequest(method, endpoint, data = null) {
    try {
        const token = await getGreytHRToken();

        console.log(`URL: ${env.GREYTHR_API_URL}${endpoint}`);
        console.log(`Domain: ${env.GREYTHR_DOMAIN}`);

        const config = {
            method,
            url: `${env.GREYTHR_API_URL}${endpoint}`,
            maxBodyLength: Infinity,
            headers: {
                "ACCESS-TOKEN": `${token}`,
                "x-greythr-domain": env.GREYTHR_DOMAIN,
                "Content-Type": "application/json",
            },
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ GreytHR API request failed: ${method} ${endpoint}`);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Response:", error.response.data);
        }
        throw error;
    }
}

/**
 * Get employee details by email
 * @param {string} email - Employee email address
 * @returns {Promise<Object>} Employee details with employeeId and name
 */
export async function getEmployeeByEmail(email) {
    try {
        console.log(`🔍 Fetching employee details for: ${email}`);

        const response = await greytHRRequest(
            "get",
            `employee/v2/employees/lookup?q=${encodeURIComponent(email)}`
        );

        if (response.employeeId) {
            console.log(`✅ Found employee: ${response.name}`);
            return response;
        }

        throw new Error(`Employee not found with email: ${email}`);
    } catch (error) {
        console.error("❌ Failed to fetch employee:", error.message);
        throw error;
    }
}

/**
 * Apply for leave
 * @param {Object} leaveApplication - Leave application details
 * @param {string} leaveApplication.employeeNo - Employee number
 * @param {string} leaveApplication.fromDate - Start date
 * @param {string} leaveApplication.toDate - End date
 * @param {string} leaveApplication.leaveTypeDescription - Leave type
 * @param {string} leaveApplication.leaveTransactionTypeDescription - Transaction type (availed/cancelled)
 * @param {string} leaveApplication.reason - Reason for leave
 * @returns {Promise<Object>} Application response
 */
export async function applyLeave(leaveApplication) {
    try {
        console.log("📝 Submitting leave application to GreytHR...");
        console.log("   Leave Application:", leaveApplication);

        const response = await greytHRRequest(
            "post",
            `leave/v2/employee/transactions`,
            leaveApplication
        );

        console.log("✅ Leave application submitted successfully");
        return response;
    } catch (error) {
        console.error("❌ Failed to submit leave application:", error.message);
        throw error;
    }
}
