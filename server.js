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
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" })
  });
}

// 🔹 Telegram Webhook
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if(!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();
  const [cmd, param] = text.split(" ");

  // 1️⃣ Command list header
  const commandList = `🤖 *Available Commands:*
/registered → Show all users
/orders → Show all pending orders
/complete <OrderID> → Mark as Completed
/fail <OrderID> → Mark as Failed

`;

  // 2️⃣ Registered Users
  if(cmd === "/registered"){
    const snapshot = await db.ref("users").once("value");
    let msg = commandList + "👥 *Registered Users:*\n\n";
    let i = 1;
    snapshot.forEach(child => {
      const u = child.val();
      msg += `${i++}\\. 👤 ${u.username || "N/A"} | 📱 ${u.phone || "N/A"}\n`;
    });
    sendMessage(chatId, msg || commandList + "⚠ No users found.");
  }

  // 3️⃣ Pending Orders
  else if(cmd === "/orders"){
    const snapshot = await db.ref("topupRequests").once("value");
    let found = false;
    let msg = commandList + "📦 *Pending Orders:*\n\n";

    snapshot.forEach(child => {
      const r = child.val();
      if(r.status && r.status.toLowerCase() === "pending"){
        found = true;
        msg += `🆔 Order ID: (\`${child.key}\`)
👤 User: ${r.username}
💎 Package: ${r.package}
💰 Amount: ৳${r.amount}
📱 Method: ${r.method}
━━━━━━━━━━━━━━━
`;
      }
    });

    sendMessage(chatId, found ? msg : commandList + "✅ No pending orders right now.");
  }

  // 4️⃣ Complete Order
  else if(cmd === "/complete"){
    if(!param) return sendMessage(chatId, commandList + "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Completed" });
    sendMessage(chatId, `✅ Order \`${param}\` marked as *Completed*`);
  }

  // 5️⃣ Fail Order
  else if(cmd === "/fail"){
    if(!param) return sendMessage(chatId, commandList + "⚠ Please provide Order ID");
    await db.ref("topupRequests/"+param).update({ status: "Failed" });
    sendMessage(chatId, `❌ Order \`${param}\` marked as *Failed*`);
  }

  // 6️⃣ Unknown command
  else {
    sendMessage(chatId, commandList + "❓ Unknown command.");
  }

  res.sendStatus(200);
});

// 🔹 Root Test
app.get("/", (req,res)=>res.send("🚀 Telegram Firebase Bot Running Successfully"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Bot server running on port ${PORT}`));
