const axios = require("axios");
const getGraphToken = require("./graphAuth");
const env = require("../server/env");

async function subscribeToMailbox() {
    const token = await getGraphToken();

    const res = await axios.post(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
            changeType: "created",
            notificationUrl: env.PUBLIC_URL + "/email-notification",
            resource: "users/karthikeyan.balasubramanian@solitontech.in/messages",
            expirationDateTime: "2027-01-01T00:00:00Z",
            clientState: "YOUR_SECRET_STATE"
        },
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    console.log("Subscription created:", res.data);
}

subscribeToMailbox();
