/**
 * Logger Service
 * Centralised logging using Winston.
 *
 * Two layers:
 *  1. `LOG` (default export) – application-level logger that writes only to
 *     the console.  Used for startup, subscription, webhook validation, etc.
 *
 *  2. `createLeaveLogger(receivedDateTime, senderEmail)` – creates a per-request
 *     logger that writes to BOTH the console AND a dedicated log file at:
 *       logs/{year}/{YYYY-MM-DD_senderEmail}.log
 *
 *     The caller is responsible for calling `.destroy()` on the returned logger
 *     when the request is fully processed so the file transport is flushed.
 */

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import type { LeaveRequest } from "../types/index.js";

// ─── Root path resolution ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is 3 levels up from server/services/
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const LOGS_DIR = path.join(PROJECT_ROOT, "logs");

// ─── Shared formats ───────────────────────────────────────────────────────────
const timestampedConsoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
);

const timestampedFileFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
);

// ─── 1. Application-level console logger ────────────────────────────────────
class LoggerService {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: "info",
            transports: [
                new winston.transports.Console({ format: timestampedConsoleFormat })
            ]
        });
    }

    info(message: string, data: any = null): void {
        this.logger.info(data != null ? `${message} ${JSON.stringify(data)}` : message);
    }

    error(message: string, error: any = null): void {
        this.logger.error(error != null ? `${message} ${JSON.stringify(error)}` : message);
    }

    warn(message: string, data: any = null): void {
        this.logger.warn(data != null ? `${message} ${JSON.stringify(data)}` : message);
    }

    debug(message: string, data: any = null): void {
        this.logger.debug(data != null ? `${message} ${JSON.stringify(data)}` : message);
    }

    separator(length: number = 60): void { this.logger.info("=".repeat(length)); }
    section(title: string, length: number = 60): void {
        this.logger.info("\n" + "=".repeat(length));
        this.logger.info(title);
        this.logger.info("=".repeat(length));
    }

    graphNotificationReceived(): void { this.logger.info("📨 Received Graph notification"); }
    graphValidationRequest(token: string): void {
        this.logger.info("✅ Validation request received");
        this.logger.info(`Validation token: ${token}`);
    }
    graphNotificationBody(body: any): void { this.logger.info(`Graph notification body: ${JSON.stringify(body)}`); }
    fullEmail(emailData: any): void { this.logger.info(`Full email: ${JSON.stringify(emailData)}`); }
    parsingLeaveRequest(): void { this.logger.info("\n🔍 Parsing leave request from email..."); }
    validLeaveRequestParsed(leaveRequest: LeaveRequest): void {
        this.logger.info(`✅ Valid leave request parsed:`);
        this.logger.info(`   From: ${leaveRequest.fromEmail}`);
        this.logger.info(`   Leave Type: ${leaveRequest.leaveType}`);
        this.logger.info(`   Transaction: ${leaveRequest.transaction}`);
        this.logger.info(`   Start Date: ${leaveRequest.fromDate}`);
        this.logger.info(`   To Date: ${leaveRequest.toDate}`);
        this.logger.info(`   Reason: ${leaveRequest.reason || "N/A"}`);
        this.logger.info(`   Confidence: ${leaveRequest.confidence}`);
    }
    submittingToGreytHR(): void { this.logger.info("\n🚀 Submitting to GreytHR..."); }
    leaveApplicationSuccess(applicationId?: string): void {
        this.logger.info("✅ Leave application submitted successfully!");
        if (applicationId) this.logger.info(`   Application ID: ${applicationId}`);
    }
    leaveApplicationFailed(error: string): void {
        this.logger.error("❌ Leave application failed:");
        this.logger.error(`   Error: ${error}`);
    }
    incompleteLeaveRequest(missingFields: string[], confidence: string): void {
        this.logger.warn("⚠️ Incomplete leave request detected");
        this.logger.warn(`   Missing fields: ${missingFields.join(", ")}`);
        this.logger.warn(`   Confidence: ${confidence}`);
    }
    parsingEmailFrom(email: string): void { this.logger.info(`Parsing email from: ${email}`); }
    openAIResponse(response: string): void { this.logger.info(`OpenAI Response: ${response}`); }
    parsedLeaveRequest(result: LeaveRequest): void { this.logger.info(`Parsed leave request: ${JSON.stringify(result)}`); }
    greytHRAuthenticating(): void { this.logger.info("🔐 Authenticating with GreytHR..."); }
    greytHRAuthSuccess(): void { this.logger.info("✅ GreytHR authentication successful"); }
    greytHRRequestDetails(url: string, domain: string): void {
        this.logger.info(`URL: ${url}`);
        this.logger.info(`Domain: ${domain}`);
    }
    fetchingEmployeeDetails(email: string): void { this.logger.info(`🔍 Fetching employee details for: ${email}`); }
    employeeFound(name: string): void { this.logger.info(`✅ Found employee: ${name}`); }
    submittingLeaveApplication(leaveApplication: any): void {
        this.logger.info("📝 Submitting leave application to GreytHR...");
        this.logger.info(`   Leave Application: ${JSON.stringify(leaveApplication)}`);
    }
    leaveApplicationSubmitted(): void { this.logger.info("✅ Leave application submitted successfully"); }
    processingLeaveApplicationHeader(): void {
        this.logger.info("\n" + "=".repeat(60));
        this.logger.info("🚀 Processing Leave Application");
        this.logger.info("=".repeat(60));
    }
    stepFetchingEmployee(email: string): void {
        this.logger.info("\n👤 Step 1: Fetching employee details...");
        this.logger.info(`   Email: ${email}`);
    }
    employeeDetails(employeeNo: string, employeeName: string, solitonEmployeeId: string): void {
        this.logger.info(`   Employee No: ${employeeNo}`);
        this.logger.info(`   Employee Name: ${employeeName}`);
        this.logger.info(`   Soliton Employee ID: ${solitonEmployeeId}`);
    }
    stepPreparingLeaveApplication(leaveRequest: LeaveRequest): void {
        this.logger.info("\n📝 Step 2: Preparing leave application...");
        this.logger.info(`   Leave Type: ${leaveRequest.leaveType}`);
        this.logger.info(`   Transaction: ${leaveRequest.transaction}`);
        this.logger.info(`   From: ${leaveRequest.fromDate}`);
        this.logger.info(`   To: ${leaveRequest.toDate}`);
        this.logger.info(`   Reason: ${leaveRequest.reason || "Leave request via email"}`);
    }
    stepSubmittingToGreytHR(): void { this.logger.info("\n🚀 Step 3: Submitting to GreytHR..."); }
    leaveApplicationSuccessSummary(employeeName: string, employeeNo: string, leaveRequest: LeaveRequest): void {
        this.logger.info("\n" + "=".repeat(60));
        this.logger.info("✅ Leave Application Successful!");
        this.logger.info("=".repeat(60));
        this.logger.info(`   Employee: ${employeeName} (${employeeNo})`);
        this.logger.info(`   Leave Type: ${leaveRequest.leaveType}`);
        this.logger.info(`   Transaction: ${leaveRequest.transaction}`);
        this.logger.info(`   Duration: ${leaveRequest.fromDate} to ${leaveRequest.toDate}`);
        this.logger.info("=".repeat(60) + "\n");
    }
    leaveApplicationFailureSummary(errorMessage: string): void {
        this.logger.error("\n" + "=".repeat(60));
        this.logger.error("❌ Leave Application Failed!");
        this.logger.error("=".repeat(60));
        this.logger.error(`   Error: ${errorMessage}`);
        this.logger.error("=".repeat(60) + "\n");
    }
    greytHRAPIRequestFailed(method: string, endpoint: string, status: number | null = null, responseData: any = null): void {
        this.logger.error(`❌ GreytHR API request failed: ${method} ${endpoint}`);
        if (status) this.logger.error(`Status: ${status}`);
        if (responseData) this.logger.error(`Response: ${JSON.stringify(responseData)}`);
    }
    serverStartup(port: number, publicUrl: string, isHttps: boolean, certPath: string | null = null): void {
        if (isHttps) {
            this.logger.info(`✅ HTTPS Server listening on port ${port}`);
            if (certPath) this.logger.info(`🔒 SSL Certificate: ${certPath}`);
        } else {
            this.logger.warn(`⚠️  HTTP Server listening on port ${port}`);
        }
        this.logger.info(`🌐 Public URL: ${publicUrl}`);
    }
    serverStartupFailed(errorMessage: string, keyPath: string, certPath: string): void {
        this.logger.error("❌ Failed to start HTTPS server:");
        this.logger.error(`   Error: ${errorMessage}`);
        this.logger.error("\n💡 Check that SSL certificate files exist and are readable:");
        this.logger.error(`   Key: ${keyPath}`);
        this.logger.error(`   Cert: ${certPath}`);
    }
}

// ─── 2. Per-request leave logger factory ────────────────────────────────────

/**
 * A per-request logger that writes to both the console and a dedicated log file.
 * Call `.destroy()` when the request is complete to flush the file transport.
 */
export interface LeaveLogger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    destroy(): Promise<void>;
}

/**
 * Build the log file path:
 *   logs/{year}/{YYYY-MM-DD_senderEmail}.log
 *
 * @param receivedDateTime - ISO string of when the email was received
 * @param senderEmail      - email address of the leave requester
 */
export function createLeaveLogger(receivedDateTime: string, senderEmail: string): LeaveLogger {
    const date = new Date(receivedDateTime);
    const year = date.getUTCFullYear();
    const yyyy = year.toString();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");

    // Sanitise the email so it's a safe filename segment
    const safeEmail = senderEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
    const fileName = `${yyyy}-${mm}-${dd}_${safeEmail}.log`;
    const filePath = path.join(LOGS_DIR, yyyy, fileName);

    const winstonLogger = winston.createLogger({
        level: "info",
        transports: [
            new winston.transports.Console({ format: timestampedConsoleFormat }),
            new winston.transports.File({
                filename: filePath,
                format: timestampedFileFormat
            })
        ]
    });

    return {
        info(message: string) { winstonLogger.info(message); },
        warn(message: string) { winstonLogger.warn(message); },
        error(message: string) { winstonLogger.error(message); },
        destroy(): Promise<void> {
            return new Promise((resolve) => {
                winstonLogger.on("finish", resolve);
                winstonLogger.end();
            });
        }
    };
}

// ─── Singleton application logger ────────────────────────────────────────────
const LOG = new LoggerService();
export default LOG;
