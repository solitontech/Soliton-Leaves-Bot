import axios, { AxiosError } from "axios";
import getGraphToken from "./graphAuth.js";
import logger from "../server/services/loggerService.js";
import type { GraphSubscription } from "../server/types/index.js";

async function deleteAllSubscriptions(): Promise<void> {
    try {
        logger.info("🔐 Getting Graph API token...");
        const token = await getGraphToken();
        logger.info("✅ Token obtained successfully");

        const headers = { Authorization: `Bearer ${token}` };

        logger.info("🔍 Fetching all active subscriptions...");
        const res = await axios.get<{ value: GraphSubscription[] }>(
            "https://graph.microsoft.com/v1.0/subscriptions",
            { headers }
        );

        const subscriptions = res.data.value;

        if (subscriptions.length === 0) {
            logger.info("✅ No active subscriptions found. Nothing to delete.");
            return;
        }

        logger.info(`🗑️  Found ${subscriptions.length} subscription(s). Deleting...`);
        await Promise.all(
            subscriptions.map(async (sub) => {
                await axios.delete(
                    `https://graph.microsoft.com/v1.0/subscriptions/${sub.id}`,
                    { headers }
                );
                logger.info(`   🗑️  Deleted: ${sub.id} (resource: ${sub.resource})`);
            })
        );

        logger.info("✅ All subscriptions deleted successfully.");
    } catch (error) {
        const err = error as AxiosError<any>;
        logger.error("❌ Failed to delete subscriptions");

        if (err.response) {
            logger.error("Status:", err.response.status);
            logger.error("Error details:", JSON.stringify(err.response.data, null, 2));
        } else {
            logger.error("Error:", err.message);
        }

        process.exit(1);
    }
}

deleteAllSubscriptions();
