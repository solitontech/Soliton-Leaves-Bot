# Quick Installation Guide

## Step-by-Step Installation

### 1. Install Node.js Dependencies

Run this command in the project root:

```bash
npm install
```

This will install all the following packages:

**Production Dependencies:**
- @microsoft/botbuilder@^4.22.0
- axios@^1.6.5
- body-parser@^1.20.2
- dotenv@^16.4.1
- express@^4.18.2
- openai@^4.28.0
- qs@^6.11.2

**Development Dependencies:**
- nodemon@^3.0.3

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your credentials
nano .env  # or use your preferred editor
```

### 3. Verify Installation

Check that all packages are installed:

```bash
npm list --depth=0
```

### 4. Run the Application

**Production mode:**
```bash
npm start
```

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Subscribe to mailbox:**
```bash
npm run subscribe
```

## Troubleshooting

### If you get module not found errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

### If you get permission errors:
```bash
sudo npm install
```

### If you need a specific Node version:
Use nvm (Node Version Manager):
```bash
nvm install 18
nvm use 18
npm install
```

## Package Versions

All packages use caret (^) versioning, which means:
- Compatible with the specified version
- Will update to the latest minor/patch version
- Won't break compatibility

For example: `^4.22.0` will install 4.22.x or 4.x.x (but not 5.0.0)
