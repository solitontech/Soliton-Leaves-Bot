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
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   - `BOT_APP_ID`: Your Microsoft Bot Application ID
   - `BOT_APP_SECRET`: Your Microsoft Bot Application Secret
   - `TENANT_ID`: Your Azure AD Tenant ID
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PUBLIC_URL`: Your public-facing URL (for webhooks)
   - `GREYTHR_*`: GreytHR configuration details

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
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## 📦 Dependencies

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

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run subscribe` - Subscribe to mailbox notifications

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_APP_ID` | Microsoft Bot Application ID | ✅ |
| `BOT_APP_SECRET` | Microsoft Bot Application Secret | ✅ |
| `TENANT_ID` | Azure AD Tenant ID | ✅ |
| `OPENAI_API_KEY` | OpenAI API Key | ✅ |
| `PUBLIC_URL` | Public URL for webhooks | ✅ |
| `PORT` | Local server port (default: 3978) | ❌ |
| `GREYTHR_API_URL` | GreytHR API Base URL | ✅ |
| `GREYTHR_AUTH_URL` | GreytHR Authentication URL | ✅ |
| `GREYTHR_DOMAIN` | GreytHR Domain ID | ✅ |
| `GREYTHR_USERNAME` | GreytHR API User | ✅ |
| `GREYTHR_PASSWORD` | GreytHR API Password | ✅ |

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


