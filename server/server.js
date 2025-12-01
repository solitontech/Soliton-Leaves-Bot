import express from "express";
import bodyParser from "body-parser";
import getGraphToken from "../graph-authentication/graphAuth.js";
import axios from "axios";
import { parseLeaveRequest, validateLeaveRequest } from "./email-parser-service/emailParser.js";
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
            `https://graph.microsoft.com/v1.0/users/karthikeyan.balasubramanian@solitontech.in/messages/${messageId}`,
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
                console.log(`   Start Date: ${leaveRequest.startDate}`);
                console.log(`   End Date: ${leaveRequest.endDate}`);
                console.log(`   Confidence: ${leaveRequest.confidence}`);

                // TODO: Process the leave request
                // - Save to database
                // - Send to GreytHR service
                // - Send confirmation email

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

// Run server
app.listen(80, () => console.log("Backend listening on port 80"));
