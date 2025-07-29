const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ OTP পাঠানোর Route
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  try {
    const verification = await client.verify
      .v2.services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ success: true, status: verification.status });
  } catch (error) {
    console.error("OTP পাঠাতে সমস্যা:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ OTP Verify করার Route
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  try {
    const verificationCheck = await client.verify
      .v2.services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    if (verificationCheck.status === "approved") {
      res.json({ verified: true });
    } else {
      res.json({ verified: false });
    }
  } catch (error) {
    console.error("OTP যাচাই করতে সমস্যা:", error.message);
    res.status(500).json({ verified: false, error: error.message });
  }
});

// ✅ Home route (optional)
app.get("/", (req, res) => {
  res.send("OTP Backend is running.");
});

app.listen(port, () => {
  console.log(`✅ Backend running on http://localhost:${port}`);
});
