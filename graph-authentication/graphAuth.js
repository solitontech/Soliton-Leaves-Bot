const axios = require("axios");
const qs = require("qs");
const env = require("../server/env");

async function getGraphToken() {
    const url = `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`;

    const data = qs.stringify({
        client_id: env.BOT_APP_ID,
        client_secret: env.BOT_APP_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
    });

    const res = await axios.post(url, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    return res.data.access_token;
}

module.exports = getGraphToken;
