import axios, { AxiosError } from "axios";
import env from "../env.js";
import logger from "../services/loggerService.js";
import type { GreytHRAuthResponse } from "../types/index.js";

/**
 * Authenticate with GreytHR and get access token
 */
export async function getGreytHRToken(): Promise<string> {
    try {
        logger.greytHRAuthenticating();

        const response = await axios.post<GreytHRAuthResponse>(
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

        const accessToken = response.data.access_token;

        logger.greytHRAuthSuccess();
        return accessToken;

    } catch (error) {
        const err = error as AxiosError<any>;
        logger.error("❌ GreytHR authentication failed:", err.message);
        if (err.response) {
            logger.error("Response:", err.response.data);
        }
        throw new Error(`GreytHR authentication failed: ${err.message}`);
    }
}
