// index.js

import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { OpenAI } from 'openai';

const app = express();

// ✅ CORS ঠিক মতো allow করা
app.use(cors({
  origin: "https://burhan1798.github.io", // তোমার GitHub Page এর URL
}));

app.use(express.json());

// ✅ OpenAI init
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.send("✅ Server is working!");
});

// ✅ Chat route
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("❌ API Error:", err?.message || err);
    res.status(500).json({ reply: "❌ Something went wrong!" });
  }
});

// ✅ Render or local port support
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
