import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { parseLeaveRequest, validateLeaveRequest } from "./email-parser-service/emailParser.js";
import { processLeaveApplication } from "./greytHr-service/leaveApplicationService.js";
import env from "./env.js";
import LOG from "./services/loggerService.js";
import { CloudAdapter, ConfigurationServiceClientCredentialFactory, TurnContext } from "botbuilder";
import https from 'https';
import http from 'http';
import fs from 'fs';
import type {
    GraphNotificationPayload,
    EmailData
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

    if (messageId) {
        const token = await getGraphToken();

        // Fetch the current email to get the conversationId
        // Note: We need this because the Graph notification doesn't include conversationId
        const email = await axios.get<EmailData>(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        LOG.fullEmail(email.data);

        // Step 1: Fetch all emails in the conversation thread using the conversationId
        const conversationId = email.data.conversationId;
        LOG.info(`📧 Fetching email thread for conversation: ${conversationId}`);

        const threadResponse = await axios.get<{ value: EmailData[] }>(
            `https://graph.microsoft.com/v1.0/users/${env.MONITORED_EMAIL}/messages?$filter=conversationId eq '${conversationId}'&$orderby=receivedDateTime desc`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const threadMessages = threadResponse.data.value;
        LOG.info(`📧 Found ${threadMessages.length} messages in thread`);

        // Step 2: Search for the email containing "Leave Type" and "Transaction"
        let leaveEmail: EmailData | null = null;

        for (const msg of threadMessages) {
            const emailBody = (msg.body?.content || msg.bodyPreview || "").toLowerCase();

            // Check if this email contains both "leave type" and "transaction"
            if (emailBody.includes("leave type") && emailBody.includes("transaction")) {
                leaveEmail = msg;
                LOG.info(`✅ Found leave request email from: ${msg.from?.emailAddress?.address} at ${msg.receivedDateTime}`);
                break;
            }
        }

        // If no email with keywords found, fall back to the current email
        if (!leaveEmail) {
            LOG.info(`⚠️  No email with "Leave Type" and "Transaction" found in thread`);
            leaveEmail = email.data;
        }

        // Step 3: Parse the specific email containing the leave request
        try {
            LOG.parsingLeaveRequest();
            const leaveRequest = await parseLeaveRequest(leaveEmail);
            const validation = validateLeaveRequest(leaveRequest);

            if (validation.isValid) {
                LOG.validLeaveRequestParsed(leaveRequest);

                // Process the leave request with GreytHR
                try {
                    LOG.submittingToGreytHR();
                    const result = await processLeaveApplication(leaveRequest);

                    if (result.success) {
                        LOG.leaveApplicationSuccess(result.applicationId);
                    } else {
                        LOG.leaveApplicationFailed(result.error);
                    }
                } catch (greytHrError) {
                    const err = greytHrError as Error;
                    LOG.error("❌ GreytHR integration error:", err.message);
                }

            } else {
                LOG.incompleteLeaveRequest(validation.missingFields, validation.confidence);
            }
        } catch (error) {
            const err = error as Error;
            LOG.error("❌ Error parsing leave request:", err.message);
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
        server.listen(443, () => {
            LOG.serverStartup(443, env.PUBLIC_URL, true, env.SSL_CERT_PATH);
        });
    } catch (error) {
        const err = error as Error;
        LOG.serverStartupFailed(err.message, env.SSL_KEY_PATH!, env.SSL_CERT_PATH!);
        process.exit(1);
    }
} else {
    // HTTP mode (fallback)
    server = http.createServer(app);
    server.listen(80, () => {
        LOG.serverStartup(80, env.PUBLIC_URL, false);
    });
}
