import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import { processLeaveApplication } from "./services/leaveApplicationService.js";
import { parseLeaveRequest, MissingFieldsError } from "./services/email-parser-service/emailParser.js";
import { resolveLeaveEmailFromThread } from "./services/email-parser-service/emailThreadService.js";
import { getEmployeeByEmail } from "./services/greytHr-service/greytHrClient.js";
import {
    sendSuccessNotification,
    sendFailureNotification,
    sendErrorNotification,
    sendMissingFieldsNotification
} from "./services/notificationService.js";
import env from "./env.js";
import LOG from "./services/loggerService.js";
import { CloudAdapter, ConfigurationServiceClientCredentialFactory, TurnContext } from "botbuilder";
import https from 'https';
import http from 'http';
import fs from 'fs';
import type {
    EmailData,
    GraphNotificationPayload,
} from "./types/index.js";

const app = express();
app.use(bodyParser.json());

const credentialFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: env.BOT_APP_ID,
    MicrosoftAppPassword: env.BOT_APP_SECRET
});

const adapter = new CloudAdapter(credentialFactory as any);

app.post("/api/messages", (req: Request, res: Response) => {
    adapter.process(req, res, async (context: TurnContext) => {
        await context.sendActivity("Email bot is running.");
    });
});

// Email webhook — Microsoft Graph will POST here
app.post("/email-notification", async (req: Request, res: Response) => {
    LOG.graphNotificationReceived();

    // Handle subscription validation
    if (req.query['validationToken']) {
        LOG.graphValidationRequest(req.query['validationToken'] as string);
        // Microsoft Graph requires us to return the validation token with 200 OK
        res.status(200).send(req.query['validationToken']);
        return;
    }

    LOG.graphNotificationBody(req.body);
    res.sendStatus(200);

    const body = req.body as GraphNotificationPayload;
    const notif = body.value?.[0];
    if (!notif) return;

    const messageId = notif.resourceData?.id;
    if (!messageId) return;

    try {
        const token = await getGraphToken();

        // ── Step 1: Resolve the leave-request email from the conversation thread ──
        LOG.info(`🧵 Resolving leave request email from conversation thread...`);
        const { leaveEmail, senderEmail } = await resolveLeaveEmailFromThread(messageId, token);

        if (!senderEmail) {
            LOG.error(`❌ No sender email found in resolved leave email`);
            return;
        }

        // Prevent infinite loops: ignore emails sent by the bot itself
        if (senderEmail.toLowerCase() === env.MONITORED_EMAIL.toLowerCase()) {
            LOG.info(`⏩ Ignoring email from self (${senderEmail}) to prevent infinite loop.`);
            return;
        }

        LOG.info(`📧 Processing leave request from: ${senderEmail}`);

        // ── Step 2: Parse the leave request from the resolved email ──────────────
        LOG.info(`🤖 Parsing leave request with AI...`);
        const leaveRequest = await parseLeaveRequest(leaveEmail);

        // ── Step 3: Get employee details from GreytHR ────────────────────────────
        LOG.info(`👤 Fetching employee details from GreytHR...`);
        const employee = await getEmployeeByEmail(senderEmail);

        // ── Step 4: Submit leave application to GreytHR ──────────────────────────
        LOG.info(`🚀 Submitting leave application to GreytHR...`);
        const result = await processLeaveApplication(leaveRequest, employee);

        // ── Step 5: Send notification email ──────────────────────────────────────
        if (result.success) {
            LOG.info(`✅ Leave application submitted successfully!`);
            await sendSuccessNotification(leaveEmail, senderEmail, employee, leaveRequest, token);
        } else {
            LOG.error(`❌ Leave application failed!`);
            await sendFailureNotification(leaveEmail, senderEmail, employee, result, token);
        }

    } catch (error) {
        const err = error as Error;

        // Handle missing fields error specifically
        if (err instanceof MissingFieldsError) {
            LOG.error(`❌ Missing required fields: ${err.missingFields.join(', ')}`);
            try {
                const token = await getGraphToken();
                const { leaveEmail, senderEmail } = await resolveLeaveEmailFromThread(messageId, token);
                if (senderEmail) {
                    await sendMissingFieldsNotification(leaveEmail, senderEmail, err.missingFields, token);
                }
            } catch (notificationError) {
                LOG.error(`⚠️  Failed to send missing fields notification`);
            }
            return;
        }

        // Handle other errors
        LOG.error(`❌ Error processing email notification: ${err.message}`);

        // Try to send error notification if we have enough context
        try {
            const token = await getGraphToken();
            const { leaveEmail, senderEmail } = await resolveLeaveEmailFromThread(messageId, token);
            if (senderEmail) {
                await sendErrorNotification(leaveEmail, senderEmail, err.message, token);
            }
        } catch (notificationError) {
            LOG.error(`⚠️  Failed to send error notification`);
        }
    }
});

// Run server with HTTPS support
let server: https.Server | http.Server;

if (env.USE_HTTPS && env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
    // HTTPS mode with SSL certificates
    try {
        const httpsOptions = {
            key: fs.readFileSync(env.SSL_KEY_PATH),
            cert: fs.readFileSync(env.SSL_CERT_PATH)
        };

        server = https.createServer(httpsOptions, app);
        server.listen(env.PORT, () => {
            LOG.serverStartup(env.PORT, env.PUBLIC_URL, true, env.SSL_CERT_PATH);
        });
    } catch (error) {
        const err = error as Error;
        LOG.serverStartupFailed(err.message, env.SSL_KEY_PATH!, env.SSL_CERT_PATH!);
        process.exit(1);
    }
} else {
    // HTTP mode (fallback)
    server = http.createServer(app);
    server.listen(env.PORT, () => {
        LOG.serverStartup(env.PORT, env.PUBLIC_URL, false);
    });
}
