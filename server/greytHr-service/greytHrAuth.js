import axios from "axios";
import env from "../env.js";
import logger from "../services/loggerService.js";

/**
 * Authenticate with GreytHR and get access token
 * @returns {Promise<string>} Access token
 */
async function getGreytHRToken() {
    try {
        logger.greytHRAuthenticating();

        const response = await axios.post(
            `${env.GREYTHR_AUTH_URL}/uas/v1/oauth2/client-token`,
            {},
            {
                auth: {
                    username: env.GREYTHR_USERNAME,
                    password: env.GREYTHR_PASSWORD
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        let accessToken = response.data.access_token;

        logger.greytHRAuthSuccess();
        return accessToken;

    } catch (error) {
        logger.error("❌ GreytHR authentication failed:", error.message);
        if (error.response) {
            logger.error("Response:", error.response.data);
        }
        throw new Error(`GreytHR authentication failed: ${error.message}`);
    }
}

export { getGreytHRToken };
