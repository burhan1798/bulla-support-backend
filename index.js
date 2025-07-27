const express = require("express");
const cors = require("cors");
const { Configuration, OpenAIApi } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ⛔ এখানে তোমার OpenAI API key বসাও
const openai = new OpenAIApi(new Configuration({
  apiKey: "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"
}));

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "OpenAI API Error" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
