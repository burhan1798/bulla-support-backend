import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// 🔹 Firebase Admin Initialize from ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// 🔹 Helper: Send message to Telegram
function sendMessage(chatId, text){
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// 🔹 Telegram Webhook
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if(!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();
  const [cmd, param] = text.split(" ");

  // 1️⃣ Registered Users Command
  if(cmd === "/registered"){
    const snapshot = await db.ref("users").once("value");
    let msg = "👥 *Registered Users:*\n\n";
    let i = 1;
    snapshot.forEach(child => {
      const u = child.val();
      msg += `${i++}. 👤 ${u.username || "N/A"} | 📱 ${u.phone || "N/A"}\n`;
    });
    sendMessage(chatId, msg || "⚠ No users found.");
  }

  // 2️⃣ Pending Orders Command
  else if(cmd === "/orders"){
    const snapshot = await db.ref("topupRequests").once("value");
    let msg = "📦 *Pending Orders:*\n\n";
    let found = false;

    snapshot.forEach(child => {
      const r = child.val();
      if(r.status && r.status.toLowerCase() === "pending"){
        found = true;
        msg += `━━━━━━━━━━━━━━━
🆔 *Order ID:* ${child.key}
👤 *User:* ${r.username}
💎 *Package:* ${r.package}
💰 *Amount:* ৳${r.amount}
📱 *Method:* ${r.method}

🔹 Copy & Paste:
✅ /complete ${child.key}
❌ /fail ${child.key}
`;
      }
    });

    sendMessage(chatId, found ? msg : "✅ No pending orders right now.");
  }

  // 3️⃣ Complete Order
  else if(cmd === "/complete"){
    if(!param) return sendMessage(chatId, "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Completed" });
    sendMessage(chatId, `✅ Order ${param} marked as *Completed*`);
  }

  // 4️⃣ Fail Order
  else if(cmd === "/fail"){
    if(!param) return sendMessage(chatId, "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Failed" });
    sendMessage(chatId, `❌ Order ${param} marked as *Failed*`);
  }

  else {
    sendMessage(chatId, `🤖 *Available Commands:*

/registered → Show all users
/orders → Show all pending orders
/complete <OrderID> → Mark order completed
/fail <OrderID> → Mark order failed`);
  }

  res.sendStatus(200);
});

// 🔹 Root Test
app.get("/", (req,res)=>res.send("🚀 Telegram Firebase Bot Running Successfully"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Bot server running on port ${PORT}`));
