import express from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { parseLeaveRequest, validateLeaveRequest } from "./email-parser-service/emailParser.js";
import { processLeaveApplication } from "./greytHr-service/leaveApplicationService.js";
import env from "./env.js";
import logger from "./services/loggerService.js";

const app = express();
app.use(bodyParser.json());

import { CloudAdapter, ConfigurationServiceClientCredentialFactory } from "botbuilder";

const credentialFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: env.BOT_APP_ID,
    MicrosoftAppPassword: env.BOT_APP_SECRET
});

const adapter = new CloudAdapter(credentialFactory);

app.post("/api/messages", (req, res) => {
    adapter.process(req, res, async (context) => {
        await context.sendActivity("Email bot is running.");
    });
});


// Email webhook — Microsoft Graph will POST here
app.post("/email-notification", async (req, res) => {
    logger.graphNotificationReceived();

    // Handle subscription validation
    if (req.query.validationToken) {
        logger.graphValidationRequest(req.query.validationToken);
        // Microsoft Graph requires us to return the validation token with 200 OK
        return res.status(200).send(req.query.validationToken);
    }

    logger.graphNotificationBody(req.body);
    res.sendStatus(200);

    const notif = req.body.value?.[0];
    if (!notif) return;

    const messageId = notif.resourceData?.id;

    if (messageId) {
        const token = await getGraphToken();
        const email = await axios.get(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        logger.fullEmail(email.data);

        // Parse the email for leave request information
        try {
            logger.parsingLeaveRequest();
            const leaveRequest = await parseLeaveRequest(email.data);
            const validation = validateLeaveRequest(leaveRequest);

            if (validation.isValid) {
                logger.validLeaveRequestParsed(leaveRequest);

                // Process the leave request with GreytHR
                try {
                    logger.submittingToGreytHR();
                    const result = await processLeaveApplication(leaveRequest);

                    if (result.success) {
                        logger.leaveApplicationSuccess(result.applicationId);

                        // TODO: Send confirmation email to employee
                        // TODO: Save to database for tracking
                    } else {
                        logger.leaveApplicationFailed(result.error);

                        // TODO: Send error notification to employee
                    }
                } catch (greytHrError) {
                    logger.error("❌ GreytHR integration error:", greytHrError.message);
                    // TODO: Send error notification to employee
                }

            } else {
                logger.incompleteLeaveRequest(validation.missingFields, validation.confidence);
            }
        } catch (error) {
            logger.error("❌ Error parsing leave request:", error.message);
        }
    }
});

// Run server with HTTPS support
import https from 'https';
import http from 'http';
import fs from 'fs';

let server;

if (env.USE_HTTPS && env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
    // HTTPS mode with SSL certificates
    try {
        const httpsOptions = {
            key: fs.readFileSync(env.SSL_KEY_PATH),
            cert: fs.readFileSync(env.SSL_CERT_PATH)
        };

        server = https.createServer(httpsOptions, app);
        server.listen(443, () => {
            logger.serverStartup(443, env.PUBLIC_URL, true, env.SSL_CERT_PATH);
        });
    } catch (error) {
        logger.serverStartupFailed(error.message, env.SSL_KEY_PATH, env.SSL_CERT_PATH);
        process.exit(1);
    }
} else {
    // HTTP mode (fallback)
    server = http.createServer(app);
    server.listen(80, () => {
        logger.serverStartup(80, env.PUBLIC_URL, false);
    });
}
