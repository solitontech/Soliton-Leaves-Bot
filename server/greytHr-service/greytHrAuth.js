import axios from "axios";
import env from "../env.js";

/**
 * Authenticate with GreytHR and get access token
 * @returns {Promise<string>} Access token
 */
async function getGreytHRToken() {
    try {
        console.log("🔐 Authenticating with GreytHR...");

        const response = await axios.post(
            `${env.GREYTHR_AUTH_URL}/uas/v1/oauth2/client-token`,
            {
                auth: {
                    Username: env.GREYTHR_USERNAME,
                    Password: env.GREYTHR_PASSWORD
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        let accessToken = response.data.access_token

        console.log("✅ GreytHR authentication successful");
        return accessToken;

    } catch (error) {
        console.error("❌ GreytHR authentication failed:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
        throw new Error(`GreytHR authentication failed: ${error.message}`);
    }
}

export { getGreytHRToken };
