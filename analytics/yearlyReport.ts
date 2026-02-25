/**
 * Yearly Analytics Report
 *
 * Queries the leaves database and prints a summary for the current year:
 *   1. Total emails received
 *   2. Total leave requests parsed
 *   3. Number and percentage of successfully applied leaves
 *
 * Usage:
 *   npm run analytics
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// ── Resolve the DB path (same as databaseService.ts) ─────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "data", "leaves.db");

// ── Open the database (read-only) ───────────────────────────────────────────
const db = new Database(DB_PATH, { readonly: true });

const currentYear = new Date().getFullYear();
const yearStart = `${currentYear}-01-01`;
const yearEnd = `${currentYear + 1}-01-01`;

console.log(`\n📊 Leaves Bot — ${currentYear} Yearly Report`);
console.log("═".repeat(50));

// ── 1. Total emails received this year ──────────────────────────────────────
const emailCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM email_logs
    WHERE received_at >= @yearStart AND received_at < @yearEnd
`).get({ yearStart, yearEnd }) as { count: number };

console.log(`\n📧 Emails received:          ${emailCount.count}`);

// ── 2. Total leave requests parsed this year ────────────────────────────────
const leaveCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM parsed_leaves pl
    JOIN email_logs el ON pl.email_log_id = el.id
    WHERE el.received_at >= @yearStart AND el.received_at < @yearEnd
`).get({ yearStart, yearEnd }) as { count: number };

console.log(`📝 Leave requests parsed:    ${leaveCount.count}`);

// ── 3. Successful leaves (count + percentage) ──────────────────────────────
const successCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM parsed_leaves pl
    JOIN email_logs el ON pl.email_log_id = el.id
    WHERE el.received_at >= @yearStart AND el.received_at < @yearEnd
      AND pl.applied_success = 1
`).get({ yearStart, yearEnd }) as { count: number };

const successPct = leaveCount.count > 0
    ? ((successCount.count / leaveCount.count) * 100).toFixed(1)
    : "0.0";

console.log(`✅ Successfully applied:     ${successCount.count} / ${leaveCount.count} (${successPct}%)`);

// ── 4. Failed leaves ───────────────────────────────────────────────────────
const failedCount = leaveCount.count - successCount.count;
const failedPct = leaveCount.count > 0
    ? ((failedCount / leaveCount.count) * 100).toFixed(1)
    : "0.0";

console.log(`❌ Failed / pending:         ${failedCount} / ${leaveCount.count} (${failedPct}%)`);

console.log("\n" + "═".repeat(50) + "\n");

db.close();
