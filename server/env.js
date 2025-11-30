/**
 * Environment Configuration
 * Centralized environment variable management
 * All environment variables should be accessed through this module
 */

require("dotenv").config();

/**
 * Environment variables configuration object
 */
const env = {
    // Bot Configuration
    BOT_APP_ID: process.env.BOT_APP_ID,
    BOT_APP_SECRET: process.env.BOT_APP_SECRET,

    // Azure AD Configuration
    TENANT_ID: process.env.TENANT_ID,

    // OpenAI Configuration
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Server Configuration
    PUBLIC_URL: process.env.PUBLIC_URL,
};

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required environment variable is missing
 */
function validateEnv() {
    const requiredVars = [
        'BOT_APP_ID',
        'BOT_APP_SECRET',
        'TENANT_ID',
        'OPENAI_API_KEY',
        'PUBLIC_URL'
    ];

    const missingVars = requiredVars.filter(varName => !env[varName]);

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}\n` +
            'Please check your .env file.'
        );
    }
}

// Validate on module load
validateEnv();

module.exports = env;
