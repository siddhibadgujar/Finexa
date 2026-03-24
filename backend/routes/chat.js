const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    console.log("📩 Incoming request:", req.body);

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    if (!result || !result.response) {
      throw new Error("No response from Gemini");
    }

    const text = result.response.text();

    console.log("🤖 Gemini reply:", text);

    res.json({ reply: text });

  } catch (error) {
    console.error("🔥 FULL ERROR:", error);

    res.status(500).json({
      error: "Chatbot failed",
      details: error.message,
    });
  }
});

module.exports = router;