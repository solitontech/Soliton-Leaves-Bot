import axios from "axios";
import getGraphToken from "./graphAuth.js";
import env from "../server/env.js";
import logger from "../server/services/loggerService.js";

async function subscribeToMailbox() {
    try {
        logger.info("🔐 Getting Graph API token...");
        const token = await getGraphToken();
        logger.info("✅ Token obtained successfully");

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

        const res = await axios.post(
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
        logger.info("\n🎉 Your webhook is now active and will receive email notifications!");
    } catch (error) {
        logger.error("❌ Failed to create subscription");

        if (error.response) {
            logger.error("Status:", error.response.status);

            if (error.response.data?.error?.message) {
                logger.error("\n💡 Error message:", error.response.data.error.message);

                // Provide helpful hints based on error
                if (error.response.data.error.message.includes("Unable to connect")) {
                    logger.error("\n🔧 Troubleshooting steps:");
                    logger.error("   1. Make sure your server is running (npm start)");
                    logger.error("   2. Verify PUBLIC_URL in .env is correct and uses HTTPS");
                    logger.error("   3. Check if your server has a valid SSL certificate");
                    logger.error("   4. Test your webhook URL manually: curl -X POST " + env.PUBLIC_URL + "/email-notification?validationToken=test");
                } else {
                    logger.error("Error details:", JSON.stringify(error.response.data, null, 2));
                }
            }
        } else {
            logger.error("Error:", error.message);
        }

        process.exit(1);
    }
}

subscribeToMailbox();

