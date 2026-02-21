import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getGreytHRToken } from "./greytHrAuth.js";
import env from "../../env.js";
import logger from "../loggerService.js";
import type {
    HTTPMethod,
    GreytHREmployee,
    GreytHRLeaveApplication,
    GreytHROrgTree
} from "../../types/index.js";

/**
 * Make an authenticated API request to GreytHR
 */
async function greytHRRequest<T = any>(
    method: HTTPMethod,
    endpoint: string,
    data: any = null
): Promise<T> {
    try {
        const token = await getGreytHRToken();

        logger.greytHRRequestDetails(`${env.GREYTHR_API_URL}${endpoint}`, env.GREYTHR_DOMAIN);

        const config: AxiosRequestConfig = {
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
        const err = error as AxiosError;
        logger.greytHRAPIRequestFailed(
            method,
            endpoint,
            err.response?.status || null,
            err.response?.data || null
        );
        throw error;
    }
}

/**
 * Get employee details by email
 */
export async function getEmployeeByEmail(email: string): Promise<GreytHREmployee> {
    try {
        logger.fetchingEmployeeDetails(email);

        const response = await greytHRRequest<GreytHREmployee>(
            "get",
            `employee/v2/employees/lookup?q=${encodeURIComponent(email)}`
        );

        if (response.employeeId) {
            logger.employeeFound(response.name);
            return response;
        }

        throw new Error(`Employee not found with email: ${email}`);
    } catch (error) {
        const err = error as Error;
        logger.error("❌ Failed to fetch employee:", err.message);
        throw error;
    }
}

/**
 * Get the org tree (reporting hierarchy) for an employee by their GreytHR employee ID
 * Returns a list of managers, where index 0 is the immediate manager
 */
export async function getEmployeeOrgTree(employeeId: string): Promise<GreytHROrgTree> {
    try {
        logger.info(`🌳 Fetching org tree for employee ID: ${employeeId}`);
        const response = await greytHRRequest<GreytHROrgTree>(
            "get",
            `employee/v2/employees/${employeeId}/orgtree`
        );
        return response;
    } catch (error) {
        const err = error as Error;
        logger.error("❌ Failed to fetch org tree:", err.message);
        throw error;
    }
}

/**
 * Get employee details by their GreytHR numeric employee ID
 */
export async function getEmployeeById(employeeId: string): Promise<GreytHREmployee> {
    try {
        logger.info(`👤 Fetching employee by ID: ${employeeId}`);
        const response = await greytHRRequest<GreytHREmployee>(
            "get",
            `employee/v2/employees/${employeeId}`
        );
        if (response.employeeId) {
            logger.employeeFound(response.name);
            return response;
        }
        throw new Error(`Employee not found with ID: ${employeeId}`);
    } catch (error) {
        const err = error as Error;
        logger.error("❌ Failed to fetch employee by ID:", err.message);
        throw error;
    }
}

/**
 * Apply for leave
 */
export async function applyLeave(leaveApplication: GreytHRLeaveApplication): Promise<any> {
    try {
        logger.submittingLeaveApplication(leaveApplication);

        const response = await greytHRRequest(
            "post",
            `leave/v2/employee/transactions`,
            leaveApplication
        );

        logger.leaveApplicationSubmitted();
        return response;
    } catch (error) {
        const err = error as Error;
        logger.error("❌ Failed to submit leave application:", err.message);
        throw error;
    }
}

