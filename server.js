const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("OTP Server Running");
});

app.post("/send-otp", async (req, res) => {
  const { name, username, phone, password } = req.body;

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ success: true, sid: verification.sid });
  } catch (error) {
    console.error("OTP error:", error.message);
    res.json({ success: false, error: error.message });
  }
});
// Twilio OTP route gulo ekhane thakbe...

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
