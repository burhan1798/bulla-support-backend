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

// Twilio OTP route gulo ekhane thakbe...

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
