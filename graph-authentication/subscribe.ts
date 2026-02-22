import axios, { AxiosError } from "axios";
import fs from "fs";
import path from "path";
import getGraphToken from "./graphAuth.js";
import env from "../server/env.js";
import logger from "../server/services/loggerService.js";
import type { GraphSubscription } from "../server/types/index.js";

const SUBSCRIPTION_DIR = path.resolve("logs", "subscription");
const SUBSCRIPTION_FILE = path.join(SUBSCRIPTION_DIR, "subscription.json");

/** Write the result (success or error) to subscription.json with a timestamp header */
function writeSubscriptionLog(content: string): void {
    const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
    const output = `Time of update: ${timestamp}\n${content}\n`;
    fs.mkdirSync(SUBSCRIPTION_DIR, { recursive: true });
    fs.writeFileSync(SUBSCRIPTION_FILE, output, "utf-8");
    logger.info(`💾 Subscription log saved to: ${SUBSCRIPTION_FILE}`);
}

async function deleteExistingSubscriptions(token: string): Promise<void> {
    const headers = { Authorization: `Bearer ${token}` };

    logger.info("🔍 Checking for existing subscriptions...");
    const res = await axios.get<{ value: GraphSubscription[] }>(
        "https://graph.microsoft.com/v1.0/subscriptions",
        { headers }
    );

    const existing = res.data.value;
    if (existing.length === 0) {
        logger.info("✅ No existing subscriptions found.");
        return;
    }

    logger.info(`🗑️  Found ${existing.length} existing subscription(s). Deleting...`);
    await Promise.all(
        existing.map(async (sub) => {
            await axios.delete(
                `https://graph.microsoft.com/v1.0/subscriptions/${sub.id}`,
                { headers }
            );
            logger.info(`   🗑️  Deleted subscription: ${sub.id}`);
        })
    );
    logger.info("✅ All existing subscriptions deleted.");
}

async function subscribeToMailbox(): Promise<void> {
    try {
        logger.info("🔐 Getting Graph API token...");
        const token = await getGraphToken();
        logger.info("✅ Token obtained successfully");

        // Clean up any existing subscriptions before creating a new one
        await deleteExistingSubscriptions(token);

        const notificationUrl = env.PUBLIC_URL + "/email-notification";
        logger.info("📍 Notification URL:", notificationUrl);

        // Check if URL is HTTPS (required by Microsoft Graph)
        if (!notificationUrl.startsWith("https://")) {
            logger.warn("⚠️  WARNING: Microsoft Graph requires HTTPS for webhook URLs!");
            logger.warn("   Your PUBLIC_URL should start with 'https://'");
        }

        logger.info("📤 Creating subscription...");

        // Calculate expiration date (7 days from now - maximum allowed by Microsoft Graph)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 6);
        const expirationDateTime = expirationDate.toISOString();

        logger.info(`📅 Subscription will expire on: ${expirationDateTime}`);

        const res = await axios.post<GraphSubscription>(
            "https://graph.microsoft.com/v1.0/subscriptions",
            {
                changeType: "created",
                notificationUrl: notificationUrl,
                resource: `users/${env.MONITORED_EMAIL}/messages`,
                expirationDateTime: expirationDateTime,
                clientState: "YOUR_SECRET_STATE"
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        logger.info("✅ Subscription created successfully!");
        logger.info("📋 Subscription details:", JSON.stringify(res.data, null, 2));

        writeSubscriptionLog(JSON.stringify(res.data, null, 2));

        logger.info("\n🎉 Your webhook is now active and will receive email notifications!");
    } catch (error) {
        const err = error as AxiosError<any>;
        logger.error("❌ Failed to create subscription");

        // Build a human-readable error string and save to subscription.json
        let errorSummary = `Error: Failed to create subscription`;
        if (err.response) {
            errorSummary += `\nStatus: ${err.response.status}`;
            if (err.response.data?.error?.message) {
                errorSummary += `\nMessage: ${err.response.data.error.message}`;
            } else {
                errorSummary += `\nDetails: ${JSON.stringify(err.response.data, null, 2)}`;
            }
        } else {
            errorSummary += `\nMessage: ${err.message}`;
        }

        logger.error(errorSummary);
        writeSubscriptionLog(errorSummary);
        process.exit(1);
    }
}

subscribeToMailbox();
