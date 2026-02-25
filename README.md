# Soliton Leaves Bot

A Microsoft Teams bot that automatically processes leave requests from emails using AI-powered parsing with OpenAI.

## 📋 Features

- **Email Integration**: Monitors mailbox for incoming leave request emails via Microsoft Graph API
- **AI-Powered Parsing**: Uses OpenAI to extract leave request details (type, dates, etc.)
- **GreytHR Integration**: Automatically applies for leave in GreytHR HRMS
- **Microsoft Teams Bot**: Integrates with Microsoft Teams for notifications
- **Automated Processing**: Validates and processes leave requests automatically
- **SQLite Database**: Logs every incoming email and leave application outcome for auditing
- **Analytics**: Yearly report script to view email and leave request statistics
- **Automated Backups**: Rotating 7-day database backup via cron
- **Centralized Configuration**: Environment variables managed in a single location

## 🚀 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Microsoft Azure account with Bot Service
- OpenAI API key
- Microsoft Graph API access

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Soliton-Leaves-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   The project supports separate environment files for development and production:

   ```bash
   cp .env.example .env.dev   # Local development
   cp .env.example .env.prod  # Production server
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Subscribe to mailbox notifications**
   ```bash
   npm run subscribe
   ```

6. **Start the server**
   ```bash
   npm start
   ```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_APP_ID` | Microsoft Bot Application ID | ✅ |
| `BOT_APP_SECRET` | Microsoft Bot Application Secret | ✅ |
| `TENANT_ID` | Azure AD Tenant ID | ✅ |
| `OPENAI_API_KEY` | OpenAI API Key | ✅ |
| `MONITORED_EMAIL` | The mailbox address to monitor for leave request emails | ✅ |
| `PUBLIC_URL` | Public URL for webhooks | ✅ |
| `PORT` | Local server port (default: 3978) | ❌ |
| `DEFAULT_LEAVE_TYPE` | Fallback leave type when email doesn't specify one (default: `Sick Leave`) | ❌ |
| `GREYTHR_API_URL` | GreytHR API Base URL | ✅ |
| `GREYTHR_AUTH_URL` | GreytHR Authentication URL | ✅ |
| `GREYTHR_DOMAIN` | GreytHR Domain ID | ✅ |
| `GREYTHR_USERNAME` | GreytHR API User | ✅ |
| `GREYTHR_PASSWORD` | GreytHR API Password | ✅ |

## 🌐 Persistent Deployment (Ubuntu/Linux)

To run the application and ngrok persistently (so they don't stop when you close your terminal), follow these steps:

**Summary:**
1. Create the following folders under the project root: `logs, logs/<year>, logs/subscription`
2. Run the app
3. Run ngrok
4. Update the `PUBLIC_URL` env variable with the ngrok public URL, then restart the server and restart ngrok
5. Subscribe to mailbox notifications

### Running the App
**Option 1: Using tmux (Recommended)**
1. Use **`tmux`** to create a persistent session:
   ```bash
   tmux new -s leaves-ai
   ```
2. Inside the session, start the app:
   ```bash
   npm run prod
   ```
3. To detach (leave it running in background), press `Ctrl+B`, then `D`.
4. To check on it later, running: `tmux attach -t leaves-ai`

**Option 2: Using nohup (Simpler)**
To run the app in the background:
```bash
nohup npm run prod &
```
- To stop it, find the process ID: `pgrep -fl "node dist/server/server.js"`
- Kill the process: `kill <PID>`

### Running ngrok (in absence of domain + certificate)
**Option 1: Using tmux (Recommended)**
1. Start a new tmux session (or split your existing one):
   ```bash
   tmux new -s leaves-ngrok
   ```
2. Start ngrok on your app's port (default 3978):
   ```bash
   ngrok http <port number>
   ```
3. Detach with `Ctrl+B`, then `D`.
4. To check on it later, running: `tmux attach -t leaves-ngrok`

**Option 2: Using nohup (Simpler)**
If you don't want to use tmux, you can run ngrok in the background:
```bash
nohup ngrok http <port number> > /dev/null 2>&1 &
```
- To find the public URL, run: `curl http://localhost:4040/api/tunnels`
- **Important**:Replace the `PUBLIC_URL` env variable with the above public URL, then restart the server and restart ngrok
- To stop it, find the process ID with `pgrep ngrok` and run `kill <PID>`.

### Stopping the Persistent Processes
1. Attach to the session: `tmux attach -t leaves-ai` (or `leaves-ngrok`)
2. Press `Ctrl+C` to stop the process.
3. Type `exit` to close the session.

### Subscribe to Mailbox Notifications

> ⚠️ **This step is required every time you start the server for the first time, or whenever the webhook subscription expires.**

Once the app is running (and ngrok is running for dev), register the webhook with Microsoft Graph so it knows where to send email notifications:

**Development:**
```bash
npm run subscribe
```

**Production:**
```bash
npm run subscribe:prod
```

## Automating Subscription Renewal (Cron Job)

Microsoft Graph webhook subscriptions expire after **7 days** (the maximum allowed). You need to re-run `subscribe` regularly to keep the bot receiving email notifications.

### Setup

**1. Find the full paths** you'll need:
```bash
which npm          # e.g. /usr/bin/npm
cd Soliton-Leaves-Bot && pwd   # e.g. /home/youruser/Soliton-Leaves-Bot
```

**2. Open the crontab editor:**
```bash
crontab -e
```

**3. Add the following entry** (replacing the paths with yours):
```cron
0 2 */1 * * cd /home/youruser/Soliton-Leaves-Bot && /usr/bin/npm run subscribe:prod >> logs/subscription/cron.log 2>&1
```

This runs the subscription renewal at **2:00 AM every day**, and appends all output to `logs/subscription/cron.log` for auditing.

**4. Verify it was saved:**
```bash
crontab -l
```

### Checking the Logs
- **Cron output**: `logs/subscription/cron.log` — stdout and stderr from each cron run
- **Latest subscription**: `logs/subscription/subscription.json` — the full subscription object returned by Microsoft Graph, overwritten on each successful run (useful for checking the expiry date and subscription ID)

### Testing the Cron Command
Before relying on the cron job, verify it works manually:
```bash
cd /home/youruser/Soliton-Leaves-Bot && /usr/bin/npm run subscribe:prod
```
If it succeeds, the cron job will too.

## 🗄️ Database

The bot uses an embedded **SQLite** database (via `better-sqlite3`) to log every incoming email and leave application result. The database is auto-created on first server start — no manual setup needed.

### Location

```
data/leaves.db
```

> The `data/` directory is gitignored and created automatically.

### Schema

- **`email_logs`** — One row per incoming email notification
  - `received_at`, `sender_email`, `has_leaves`, `leave_count`
- **`parsed_leaves`** — One row per parsed leave request (linked to `email_logs`)
  - `leave_type`, `from_date`, `to_date`, `from_email`, `reason`, `confidence`, `applied_success`, `failure_reason`

### Querying the Database

You can inspect the database at any time using `sqlite3`:
```bash
sqlite3 data/leaves.db "SELECT * FROM email_logs ORDER BY id DESC LIMIT 10;"
sqlite3 data/leaves.db "SELECT * FROM parsed_leaves ORDER BY id DESC LIMIT 10;"
```

Or join for a full picture:
```sql
SELECT e.received_at, e.sender_email, p.leave_type, p.from_date, p.to_date, p.applied_success, p.failure_reason
FROM email_logs e
LEFT JOIN parsed_leaves p ON p.email_log_id = e.id
ORDER BY e.id DESC;
```

## 📊 Analytics

A standalone script to generate a yearly summary report from the database.

### Usage

```bash
npm run build && npm run analytics
```

### Sample Output

```
📊 Leaves Bot — 2026 Yearly Report
══════════════════════════════════════════════════

📧 Emails received:          42
📝 Leave requests parsed:    38
✅ Successfully applied:     35 / 38 (92.1%)
❌ Failed / pending:         3 / 38 (7.9%)

══════════════════════════════════════════════════
```

## 💾 Database Backup

A bash script that copies the `data/` folder to `/backup/leaves-bot/` on the machine root, keeping **7 rotating daily copies** (one per day of the week). Each day's backup overwrites the same day from the previous week.

### One-Time Setup (on the production server)

**1. Create the backup directory and set ownership:**
```bash
sudo mkdir -p /backup/leaves-bot
sudo chown $(whoami) /backup/leaves-bot
```

**2. Make the backup script executable** (if not already):
```bash
chmod +x backup/backup-db.sh
```

### Manual Run

```bash
./backup/backup-db.sh
```

### Automating with Cron

**1. Open the crontab editor:**
```bash
crontab -e
```

**2. Add the following entry** (replacing the path with yours):
```cron
0 3 * * * /home/youruser/Soliton-Leaves-Bot/backup/backup-db.sh >> /backup/leaves-bot/backup.log 2>&1
```

This runs at **3:00 AM every night**.

**3. Verify it was saved:**
```bash
crontab -l
```

### Backup Structure

```
/backup/leaves-bot/
├── Monday/        ← overwritten every Monday
├── Tuesday/       ← overwritten every Tuesday
├── Wednesday/
├── Thursday/
├── Friday/
├── Saturday/
├── Sunday/
└── backup.log     ← cron output log
```

### Checking the Logs

All backup output (success/failure messages) is appended to:
```
/backup/leaves-bot/backup.log
```

## �📦 Dependencies

### Production Dependencies
- **@microsoft/botbuilder** (^4.22.0) - Microsoft Bot Framework SDK
- **axios** (^1.6.5) - HTTP client for API requests
- **better-sqlite3** - Embedded SQLite database driver
- **body-parser** (^1.20.2) - Express middleware for parsing request bodies
- **dotenv** (^16.4.1) - Environment variable management
- **express** (^4.18.2) - Web server framework
- **openai** (^4.28.0) - OpenAI API client
- **qs** (^6.11.2) - Query string parser
- **winston** (^3.19.0) - Logging framework

### Development Dependencies
- **@types/better-sqlite3** - TypeScript definitions for better-sqlite3
- **nodemon** (^3.0.3) - Auto-restart server on file changes

## 🏗️ Project Structure

```
Soliton-Leaves-Bot/
├── analytics/
│   └── yearlyReport.ts        # Yearly statistics report script
├── backup/
│   └── backup-db.sh           # Database backup script (7-day rotation)
├── data/                      # Auto-created, gitignored
│   └── leaves.db              # SQLite database
├── graph-authentication/
│   ├── graphAuth.ts           # Microsoft Graph authentication
│   └── subscribe.ts           # Mailbox subscription setup
├── server/
│   ├── services/
│   │   ├── database-service/
│   │   │   └── databaseService.ts  # SQLite database operations
│   │   ├── email-parser-service/
│   │   │   ├── emailParser.ts      # Email parsing logic
│   │   │   └── prompts.ts          # AI prompts for parsing
│   │   ├── greytHr-service/        # GreytHR API integration
│   │   ├── notificationService.ts  # Email notification logic
│   │   ├── leaveApplicationService.ts # Leave request logic
│   │   └── loggerService.ts        # Centralized logging
│   ├── types/                 # TypeScript type definitions
│   ├── env.ts                 # Centralized environment config
│   └── server.ts              # Main server application
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Available Scripts

| Script | Env File | Description |
|--------|----------|-------------|
| `npm start` | `.env` | Start server (plain fallback, no env prefix) |
| `npm run dev` | `.env.dev` | Build + start with nodemon (auto-reload) |
| `npm run prod` | `.env.prod` | Build + start for production |
| `npm run subscribe` | `.env.dev` | Subscribe mailbox to Graph API notifications (dev) |
| `npm run subscribe:prod` | `.env.prod` | Subscribe mailbox to Graph API notifications (prod) |
| `npm run build` | — | Compile TypeScript to `dist/` |
| `npm run type-check` | — | Type-check without emitting files |
| `npm run clean` | — | Delete the `dist/` folder |
| `npm run analytics` | — | Run yearly analytics report from the database |

### Environment Files

The bot reads environment variables from a file determined by the `DOTENV_PATH` variable set in each npm script. This means you can maintain completely separate configurations without ever manually swapping `.env` files:

```
.env.dev    ← used by npm run dev / npm run subscribe
.env.prod   ← used by npm run prod / npm run subscribe:prod
.env        ← fallback for npm start (plain node invocations)
```

> All `.env*` files (except `.env.example`) are gitignored and should never be committed to the repository.

## 📝 How It Works

1. **Email Monitoring**: The bot subscribes to a mailbox using Microsoft Graph API
2. **Webhook Notifications**: When a new email arrives, Microsoft Graph sends a notification to `/email-notification`
3. **AI Parsing**: The email content is sent to OpenAI for extraction of leave details
4. **Employee Lookup**: Employee details are fetched from GreytHR using the sender's email
5. **Direct Submission**: Leave request is immediately submitted to GreytHR
6. **Notification**: Sender receives confirmation or error notification via email

## 🤖 API Endpoints

- `POST /api/messages` - Microsoft Bot Framework endpoint
- `POST /email-notification` - Microsoft Graph webhook for email notifications


