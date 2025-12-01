import axios from "axios";
import getGraphToken from "./graphAuth.js";
import env from "../server/env.js";

async function subscribeToMailbox() {
    try {
        console.log("🔐 Getting Graph API token...");
        const token = await getGraphToken();
        console.log("✅ Token obtained successfully");

        const notificationUrl = env.PUBLIC_URL + "/email-notification";
        console.log("📍 Notification URL:", notificationUrl);

        // Check if URL is HTTPS (required by Microsoft Graph)
        if (!notificationUrl.startsWith("https://")) {
            console.warn("⚠️  WARNING: Microsoft Graph requires HTTPS for webhook URLs!");
            console.warn("   Your PUBLIC_URL should start with 'https://'");
        }

        console.log("📤 Creating subscription...");
        const res = await axios.post(
            "https://graph.microsoft.com/v1.0/subscriptions",
            {
                changeType: "created",
                notificationUrl: notificationUrl,
                resource: "users/karthikeyan.balasubramanian@solitontech.in/messages",
                expirationDateTime: "2027-01-01T00:00:00Z",
                clientState: "YOUR_SECRET_STATE"
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        console.log("✅ Subscription created successfully!");
        console.log("📋 Subscription details:", JSON.stringify(res.data, null, 2));
        console.log("\n🎉 Your webhook is now active and will receive email notifications!");
    } catch (error) {
        console.error("❌ Failed to create subscription");

        if (error.response) {
            console.error("Status:", error.response.status);
            //console.error("Error details:", JSON.stringify(error.response.data, null, 2));

            if (error.response.data?.error?.message) {
                console.error("\n💡 Error message:", error.response.data.error.message);

                // Provide helpful hints based on error
                if (error.response.data.error.message.includes("Unable to connect")) {
                    console.error("\n🔧 Troubleshooting steps:");
                    console.error("   1. Make sure your server is running (npm start)");
                    console.error("   2. Ensure port 443 (HTTPS) is open and accessible");
                    console.error("   3. Verify PUBLIC_URL in .env is correct and uses HTTPS");
                    console.error("   4. Check if your server has a valid SSL certificate");
                    console.error("   5. Test your webhook URL manually: curl -X POST " + env.PUBLIC_URL + "/email-notification?validationToken=test");
                }
            }
        } else {
            console.error("Error");
            //console.error("Error:", error.message);
        }

        process.exit(1);
    }
}

subscribeToMailbox();

