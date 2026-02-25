#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Leaves Bot — Database Backup Script
#
# Copies the data/ folder to /backup/leaves-bot/ on the machine root.
# Keeps 7 rotating daily copies (Monday → Sunday). Each day overwrites
# the same day's backup from the previous week.
#
# Usage:
#   ./backup/backup-db.sh
#
# Cron (runs every night at 3:00 AM):
#   0 3 * * * /path/to/Soliton-Leaves-Bot/backup/backup-db.sh >> /backup/leaves-bot/backup.log 2>&1
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/data"
BACKUP_ROOT="/backup/leaves-bot"

# Day of week as a name (Monday, Tuesday, etc.) — used as the folder name
DAY_NAME=$(date +%A)
BACKUP_DIR="$BACKUP_ROOT/$DAY_NAME"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# ── Preflight checks ─────────────────────────────────────────────────────────
if [ ! -d "$SOURCE_DIR" ]; then
    echo "[$TIMESTAMP] ❌ Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create the backup root if it doesn't exist
if [ ! -d "$BACKUP_ROOT" ]; then
    echo "[$TIMESTAMP] 📁 Creating backup root: $BACKUP_ROOT"
    mkdir -p "$BACKUP_ROOT"
fi

# ── Perform the backup ───────────────────────────────────────────────────────
# Remove the old backup for this day of week (if it exists)
if [ -d "$BACKUP_DIR" ]; then
    echo "[$TIMESTAMP] 🔄 Overwriting existing $DAY_NAME backup..."
    rm -rf "$BACKUP_DIR"
fi

# Copy the data folder
cp -r "$SOURCE_DIR" "$BACKUP_DIR"

echo "[$TIMESTAMP] ✅ Backup complete: $SOURCE_DIR → $BACKUP_DIR"
