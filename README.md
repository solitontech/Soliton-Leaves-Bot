# Soliton Leaves Bot

A Microsoft Teams bot that automatically processes leave requests from emails using AI-powered parsing with OpenAI.

## 📋 Features

- **Email Integration**: Monitors mailbox for incoming leave request emails via Microsoft Graph API
- **AI-Powered Parsing**: Uses OpenAI to extract leave request details (type, dates, etc.)
- **GreytHR Integration**: Automatically applies for leave in GreytHR HRMS
- **Microsoft Teams Bot**: Integrates with Microsoft Teams for notifications
- **Automated Processing**: Validates and processes leave requests automatically
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
   tmux new -s bot
   ```
2. Inside the session, start the app:
   ```bash
   npm run prod
   ```
3. To detach (leave it running in background), press `Ctrl+B`, then `D`.
4. To check on it later, running: `tmux attach -t bot`

**Option 2: Using nohup (Simpler)**
To run the app in the background:
```bash
nohup npm run prod &
```
- To stop it, find the process ID: `pgrep -fl "node dist/server/server.js"`
- Kill the process: `kill <PID>`

**Option 1: Using tmux (Recommended)**
1. Start a new tmux session (or split your existing one):
   ```bash
   tmux new -s ngrok
   ```
2. Start ngrok on your app's port (default 3978):
   ```bash
   ngrok http <port number>
   ```
3. Detach with `Ctrl+B`, then `D`.

**Option 2: Using nohup (Simpler)**
If you don't want to use tmux, you can run ngrok in the background:
```bash
nohup ngrok http <port number> > /dev/null 2>&1 &
```
- To find the public URL, run: `curl http://localhost:4040/api/tunnels`
- **Important**:Replace the `PUBLIC_URL` env variable with the above public URL, then restart the server and restart ngrok
- To stop it, find the process ID with `pgrep ngrok` and run `kill <PID>`.

### Stopping the Persistent Processes
1. Attach to the session: `tmux attach -t bot` (or `ngrok`)
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

## �📦 Dependencies

### Production Dependencies
- **@microsoft/botbuilder** (^4.22.0) - Microsoft Bot Framework SDK
- **axios** (^1.6.5) - HTTP client for API requests
- **body-parser** (^1.20.2) - Express middleware for parsing request bodies
- **dotenv** (^16.4.1) - Environment variable management
- **express** (^4.18.2) - Web server framework
- **openai** (^4.28.0) - OpenAI API client
- **qs** (^6.11.2) - Query string parser

### Development Dependencies
- **nodemon** (^3.0.3) - Auto-restart server on file changes

## 🏗️ Project Structure

```
Soliton-Leaves-Bot/
├── graph-authentication/
│   ├── graphAuth.ts          # Microsoft Graph authentication
│   └── subscribe.ts           # Mailbox subscription setup
├── server/
│   ├── email-parser-service/
│   │   ├── emailParser.ts    # Email parsing logic
│   │   └── prompts.ts        # AI prompts for parsing
│   ├── services/
│   │   ├── greytHr-service/  # GreytHR API integration
│   │   ├── notificationService.ts # Email notification logic
│   │   ├── leaveApplicationService.ts # Leave request logic
│   │   └── loggerService.ts  # Centralized logging
│   ├── types/                # TypeScript type definitions
│   ├── env.ts                # Centralized environment config
│   └── server.ts             # Main server application
├── .env.example              # Environment variables template
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


