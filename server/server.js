import express from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { parseLeaveRequest, validateLeaveRequest } from "./email-parser-service/emailParser.js";
import { processLeaveApplication } from "./greytHr-service/leaveApplicationService.js";
import env from "./env.js";

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
    console.log("📨 Received Graph notification");

    // Handle subscription validation
    if (req.query.validationToken) {
        console.log("✅ Validation request received");
        console.log("Validation token:", req.query.validationToken);
        // Microsoft Graph requires us to return the validation token with 200 OK
        return res.status(200).send(req.query.validationToken);
    }

    console.log("Graph notification body:", req.body);
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

        console.log("Full email:", email.data);

        // Parse the email for leave request information
        try {
            console.log("\n🔍 Parsing leave request from email...");
            const leaveRequest = await parseLeaveRequest(email.data);
            const validation = validateLeaveRequest(leaveRequest);

            if (validation.isValid) {
                console.log("✅ Valid leave request parsed:");
                console.log(`   From: ${leaveRequest.fromEmail}`);
                console.log(`   Leave Type: ${leaveRequest.leaveType}`);
                console.log(`   Transaction: ${leaveRequest.transaction}`);
                console.log(`   Start Date: ${leaveRequest.fromDate}`);
                console.log(`   To Date: ${leaveRequest.toDate}`);
                console.log(`   Reason: ${leaveRequest.reason || "N/A"}`);
                console.log(`   Confidence: ${leaveRequest.confidence}`);

                // TODO: Process the leave request with GreytHR


                // Process the leave request with GreytHR
                try {
                    console.log("\n🚀 Submitting to GreytHR...");
                    const result = await processLeaveApplication(leaveRequest);

                    if (result.success) {
                        console.log("✅ Leave application submitted successfully!");
                        console.log(`   Application ID: ${result.applicationId}`);

                        // TODO: Send confirmation email to employee
                        // TODO: Save to database for tracking
                    } else {
                        console.error("❌ Leave application failed:");
                        console.error(`   Error: ${result.error}`);

                        // TODO: Send error notification to employee
                    }
                } catch (greytHrError) {
                    console.error("❌ GreytHR integration error:", greytHrError.message);
                    // TODO: Send error notification to employee
                }



            } else {
                console.log("⚠️ Incomplete leave request detected");
                console.log(`   Missing fields: ${validation.missingFields.join(", ")}`);
                console.log(`   Confidence: ${validation.confidence}`);
            }
        } catch (error) {
            console.error("❌ Error parsing leave request:", error.message);
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
            console.log(`✅ HTTPS Server listening on port 443`);
            console.log(`🔒 SSL Certificate: ${env.SSL_CERT_PATH}`);
            console.log(`🌐 Public URL: ${env.PUBLIC_URL}`);
        });
    } catch (error) {
        console.error("❌ Failed to start HTTPS server:");
        console.error("   Error:", error.message);
        console.error("\n💡 Check that SSL certificate files exist and are readable:");
        console.error(`   Key: ${env.SSL_KEY_PATH}`);
        console.error(`   Cert: ${env.SSL_CERT_PATH}`);
        process.exit(1);
    }
} else {
    // HTTP mode (fallback)
    server = http.createServer(app);
    server.listen(80, () => {
        console.log(`⚠️  HTTP Server listening on port 80`);
        console.log(`🌐 Public URL: ${env.PUBLIC_URL}`);
    });
}
