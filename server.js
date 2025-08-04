import express from "express";
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// 🔹 Firebase service account JSON parse from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// 🔹 Helper Function: Send Telegram Message
function sendMessage(chatId, text){
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// 🔹 Telegram Webhook Endpoint
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if(!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();
  const [cmd, param] = text.split(" ");

  // 1️⃣ Registered Users
  if(cmd === "/registered"){
    const snapshot = await db.ref("users").once("value");
    let msg = "📋 Registered Users:\n\n";
    let i = 1;
    snapshot.forEach(child => {
      const u = child.val();
      msg += `${i++}. 👤 ${u.username || "N/A"} | 📱 ${u.phone || "N/A"}\n`;
    });
    sendMessage(chatId, msg || "No users found.");
  }

  // 2️⃣ Pending Orders
  else if(cmd === "/orders"){
    const snapshot = await db.ref("topupRequests").once("value");
    let msg = "📦 Pending Orders:\n\n";
    let found = false;
    snapshot.forEach(child => {
      const r = child.val();
      if(r.status === "Pending"){
        found = true;
        msg += `🆔 ${child.key}\n👤 ${r.username}\n💎 ${r.package}\n💰 ৳${r.amount}\n---\n`;
      }
    });
    sendMessage(chatId, found ? msg : "✅ No pending orders.");
  }

  // 3️⃣ Complete Order
  else if(cmd === "/complete"){
    if(!param) return sendMessage(chatId, "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Completed" });
    sendMessage(chatId, `✅ Order ${param} marked as Completed`);
  }

  // 4️⃣ Fail Order
  else if(cmd === "/fail"){
    if(!param) return sendMessage(chatId, "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Failed" });
    sendMessage(chatId, `❌ Order ${param} marked as Failed`);
  }

  else {
    sendMessage(chatId, "❓ Unknown command. Try /registered /orders /complete <id> /fail <id>");
  }

  res.sendStatus(200);
});

app.get("/", (req,res)=>res.send("Telegram Firebase Bot ✅ Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Bot server running on port ${PORT}`));
