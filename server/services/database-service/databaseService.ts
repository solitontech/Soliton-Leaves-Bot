import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { LeaveRequest, LeaveApplicationResult } from "../../types/index.js";
import LOG from "../loggerService.js";

// ── Resolve the data directory relative to the project root ──────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "leaves.db");

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Initialize the database ──────────────────────────────────────────────────
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Create tables ────────────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        received_at     TEXT    NOT NULL,
        sender_email    TEXT    NOT NULL,
        has_leaves      INTEGER NOT NULL DEFAULT 0,
        leave_count     INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parsed_leaves (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        email_log_id    INTEGER NOT NULL REFERENCES email_logs(id),
        leave_type      TEXT,
        transaction_type TEXT   NOT NULL,
        from_date       TEXT,
        to_date         TEXT,
        from_email      TEXT   NOT NULL,
        reason          TEXT,
        confidence      TEXT,
        applied_success INTEGER NOT NULL DEFAULT 0,
        failure_reason  TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
`);

LOG.info("📦 Database initialized at: " + DB_PATH);

// ── Prepared statements ──────────────────────────────────────────────────────
const insertEmailLog = db.prepare(`
    INSERT INTO email_logs (received_at, sender_email)
    VALUES (@receivedAt, @senderEmail)
`);

const updateEmailLog = db.prepare(`
    UPDATE email_logs
    SET has_leaves = @hasLeaves, leave_count = @leaveCount
    WHERE id = @id
`);

const insertParsedLeave = db.prepare(`
    INSERT INTO parsed_leaves (
        email_log_id, leave_type, transaction_type, from_date, to_date,
        from_email, reason, confidence, applied_success, failure_reason
    )
    VALUES (
        @emailLogId, @leaveType, @transactionType, @fromDate, @toDate,
        @fromEmail, @reason, @confidence, @appliedSuccess, @failureReason
    )
`);

const updateLeaveResult = db.prepare(`
    UPDATE parsed_leaves
    SET applied_success = @appliedSuccess, failure_reason = @failureReason
    WHERE id = @id
`);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an incoming email notification to the database.
 * Call this immediately when the email is received, before any parsing.
 *
 * @returns The email_log row ID (used to link parsed leaves later)
 */
export function addEmailToDB(
    receivedAt: string,
    senderEmail: string
): number {
    const result = insertEmailLog.run({ receivedAt, senderEmail });
    return Number(result.lastInsertRowid);
}

/**
 * Update an email log with the parsing results.
 * Call this after AI parsing to record whether leaves were found.
 */
export function updateEmailInDB(
    emailLogId: number,
    leaveCount: number
): void {
    updateEmailLog.run({
        id: emailLogId,
        hasLeaves: leaveCount > 0 ? 1 : 0,
        leaveCount,
    });
}

/**
 * Add a single parsed leave request to the database.
 * Call this once per leave request found in the email, BEFORE attempting to apply it.
 *
 * @returns The parsed_leave row ID (use this to update the result later)
 */
export function addLeaveToDB(
    emailLogId: number,
    leaveRequest: LeaveRequest
): number {
    const result = insertParsedLeave.run({
        emailLogId,
        leaveType: leaveRequest.leaveType,
        transactionType: leaveRequest.transaction,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        fromEmail: leaveRequest.fromEmail,
        reason: leaveRequest.reason,
        confidence: leaveRequest.confidence,
        appliedSuccess: 0,
        failureReason: null,
    });
    return Number(result.lastInsertRowid);
}

/**
 * Update a parsed leave row with the application result.
 * Call this after attempting to apply the leave in GreytHR.
 */
export function updateLeaveInDB(
    parsedLeaveId: number,
    result: LeaveApplicationResult
): void {
    updateLeaveResult.run({
        id: parsedLeaveId,
        appliedSuccess: result.success ? 1 : 0,
        failureReason: result.success ? null : result.error,
    });
}

/**
 * Mark a parsed leave as failed in the database with a custom error message.
 * Use this when an exception is thrown during processing.
 */
export function markLeaveFailedInDB(
    parsedLeaveId: number,
    errorMessage: string
): void {
    updateLeaveResult.run({
        id: parsedLeaveId,
        appliedSuccess: 0,
        failureReason: errorMessage,
    });
}

/**
 * Gracefully close the database connection.
 * Call this on server shutdown if needed.
 */
export function closeDatabase(): void {
    db.close();
    LOG.info("📦 Database connection closed.");
}

export default {
    addEmailToDB,
    updateEmailInDB,
    addLeaveToDB,
    updateLeaveInDB,
    markLeaveFailedInDB,
    closeDatabase,
};
