const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    // simple response (can connect AI later)
    let reply = "I did not understand";

    if (message.toLowerCase().includes("profit")) {
      reply = "Your profit is based on income minus expenses.";
    } else if (message.toLowerCase().includes("spending")) {
      reply = "Your expenses are increasing recently.";
    } else if (message.toLowerCase().includes("business")) {
      reply = "Your business is performing well overall.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("Chatbot Route Error:", err);
    res.status(500).json({ reply: "Server error" });
  }
});

module.exports = router;