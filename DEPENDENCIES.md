# NPM Package Dependencies

## Complete Package List

### Production Dependencies (7 packages)

1. **@microsoft/botbuilder** `^4.22.0`
   - Purpose: Microsoft Bot Framework SDK for building conversational AI
   - Used in: `server/server.js`
   - Why needed: Handles bot adapter and Teams integration

2. **axios** `^1.6.5`
   - Purpose: Promise-based HTTP client
   - Used in: `server/server.js`, `graph-authentication/graphAuth.js`, `graph-authentication/subscribe.js`, `server/email-parser-service/emailParser.js`
   - Why needed: Makes HTTP requests to Microsoft Graph API and other services

3. **body-parser** `^1.20.2`
   - Purpose: Express middleware for parsing request bodies
   - Used in: `server/server.js`
   - Why needed: Parses incoming JSON payloads from webhooks

4. **dotenv** `^16.4.1`
   - Purpose: Loads environment variables from .env file
   - Used in: `server/env.js`
   - Why needed: Manages configuration and secrets securely

5. **express** `^4.18.2`
   - Purpose: Fast, minimalist web framework for Node.js
   - Used in: `server/server.js`
   - Why needed: Creates HTTP server and handles routes

6. **openai** `^4.28.0`
   - Purpose: Official OpenAI API client
   - Used in: `server/email-parser-service/emailParser.js`
   - Why needed: Processes emails using AI to extract leave request information

7. **qs** `^6.11.2`
   - Purpose: Query string parser and stringifier
   - Used in: `graph-authentication/graphAuth.js`
   - Why needed: Formats OAuth token request data for Microsoft Graph

### Development Dependencies (1 package)

1. **nodemon** `^3.0.3`
   - Purpose: Automatically restarts Node.js application on file changes
   - Used in: npm scripts (`npm run dev`)
   - Why needed: Improves development experience with hot-reloading

## Installation Commands

### Install all dependencies:
```bash
npm install
```

### Install only production dependencies:
```bash
npm install --production
```

### Install a specific package:
```bash
npm install <package-name>
```

### Update all packages to latest compatible versions:
```bash
npm update
```

### Check for outdated packages:
```bash
npm outdated
```

## Total Package Count

- **Production**: 7 packages
- **Development**: 1 package
- **Total**: 8 packages

## Estimated Installation Size

Approximate disk space required: ~150-200 MB (including all dependencies and sub-dependencies)

## Node.js Version Requirements

- **Minimum Node.js**: 18.0.0
- **Minimum npm**: 9.0.0

Check your versions:
```bash
node --version
npm --version
```
