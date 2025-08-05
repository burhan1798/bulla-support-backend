import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json()); // ✅ Parse JSON body

// 🔹 ENV variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// 🔹 Helper: Send plain text to Telegram
function sendMessage(chatId, text){
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }) // ✅ plain text
  }).catch(err => console.error("Telegram Send Error:", err));
}

// 🔹 Telegram Webhook
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const message = req.body.message;

  // ✅ Step 1: Always respond immediately to prevent timeout
  res.sendStatus(200);

  if(!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const parts = text.split(" ");
  const cmd = parts[0];
  const param = parts[1];

  console.log("Received command:", cmd, "Param:", param);

  try {
    // 1️⃣ Ping
    if(cmd === "/ping"){
      sendMessage(chatId, "✅ Bot Alive!");
    }

    // 2️⃣ Registered Users
    else if(cmd === "/registered"){
      const snapshot = await db.ref("users").once("value");
      let msg = "👥 Registered Users:\n\n";
      let i = 1;
      snapshot.forEach(child => {
        const u = child.val();
        msg += `${i++}. ${u.username || "N/A"} | ${u.phone || "N/A"}\n`;
      });
      sendMessage(chatId, msg || "⚠ No users found.");
    }

    // 3️⃣ Pending Orders
    else if(cmd === "/orders"){
  const snapshot = await db.ref("topupRequests").once("value");
  let msg = "📦 Pending Orders:\n\n";
  let found = false;

  snapshot.forEach(child => {
    const r = child.val();
    if(r.status && r.status.toLowerCase() === "pending"){ // ✅ Only pending
      found = true;
      msg += `Order ID: (${child.key})\nUser: ${r.username}\nPackage: ${r.package}\nAmount: ৳${r.amount}\nMethod: ${r.method}\n-----------------------\n`;
    }
  });

  sendMessage(chatId, found ? msg : "✅ No pending orders right now.");
}

    // 4️⃣ Complete Order
    else if(cmd === "/complete"){
  if(!param) return sendMessage(chatId, "⚠ Please provide Order ID");

  const orderRef = db.ref("topupRequests/"+param);
  const snapshot = await orderRef.once("value");

  if(!snapshot.exists()){
    return sendMessage(chatId, "⚠ Order not found");
  }

  const order = snapshot.val();
  order.status = "Completed";      // change status
  order.updatedAt = new Date().toISOString(); // optional for tracking

  await orderRef.set(order); // ✅ replace whole object so listener triggers

  sendMessage(chatId, `✅ Order ${param} marked as Completed`);
}

    // 6️⃣ Unknown command
    else {
      sendMessage(chatId, "🤖 Available Commands:\n/ping\n/registered\n/orders\n/complete <OrderID>\n/fail <OrderID>");
    }

  } catch (err) {
    console.error("Command Error:", err);
    sendMessage(chatId, "⚠ Internal error occurred.");
  }
});

// 🔹 Root Test
app.get("/", (req,res)=>res.send("🚀 Telegram Firebase Bot Running Successfully (Non-Blocking)"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Bot server running on port ${PORT}`));