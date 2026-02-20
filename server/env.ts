/**
 * Environment Configuration
 * Centralized environment variable management
 * All environment variables should be accessed through this module
 */

import dotenv from "dotenv";
import type { EnvironmentConfig } from "./types/index.js";

const envFile = process.env['DOTENV_PATH'] ?? '.env';
dotenv.config({ path: envFile });

/**
 * Environment variables configuration object
 */
const env: EnvironmentConfig = {
    // Bot Configuration
    BOT_APP_ID: process.env['BOT_APP_ID']!,
    BOT_APP_SECRET: process.env['BOT_APP_SECRET']!,

    // Azure AD Configuration
    TENANT_ID: process.env['TENANT_ID']!,

    // OpenAI Configuration
    OPENAI_API_KEY: process.env['OPENAI_API_KEY']!,
    OPENAI_MODEL: process.env['OPENAI_MODEL'] || 'gpt-5-nano',

    // Server Configuration
    PUBLIC_URL: process.env['PUBLIC_URL']!,
    PORT: process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3978,
    USE_HTTPS: process.env['USE_HTTPS'] === 'true',

    // Monitored Email
    MONITORED_EMAIL: process.env['MONITORED_EMAIL']!,

    // Default leave type (used when the email does not specify one)
    DEFAULT_LEAVE_TYPE: process.env['DEFAULT_LEAVE_TYPE'] || 'Sick Leave',

    // SSL Certificate Configuration (optional, for HTTPS)
    SSL_KEY_PATH: process.env['SSL_KEY_PATH'],
    SSL_CERT_PATH: process.env['SSL_CERT_PATH'],

    // GreytHR Configuration
    GREYTHR_API_URL: "https://api.greythr.com/",
    GREYTHR_AUTH_URL: process.env['GREYTHR_AUTH_URL']!,
    GREYTHR_DOMAIN: process.env['GREYTHR_DOMAIN']!,
    GREYTHR_USERNAME: process.env['GREYTHR_USERNAME']!,
    GREYTHR_PASSWORD: process.env['GREYTHR_PASSWORD']!,
};

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required environment variable is missing
 */
function validateEnv(): void {
    const requiredVars: (keyof EnvironmentConfig)[] = [
        'BOT_APP_ID',
        'BOT_APP_SECRET',
        'TENANT_ID',
        'OPENAI_API_KEY',
        'PUBLIC_URL',
        'MONITORED_EMAIL',
        'GREYTHR_API_URL',
        'GREYTHR_AUTH_URL',
        'GREYTHR_DOMAIN',
        'GREYTHR_USERNAME',
        'GREYTHR_PASSWORD'
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

export default env;
