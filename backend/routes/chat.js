const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Operation = require('../models/Operation');
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates a rule-based response based on context data and user question
 */
function getRuleBasedResponse(question, data) {
  const q = question.toLowerCase();
  
  const responses = {
    profit: [
      `Your current net profit is ₹${data.profit.toLocaleString()}. With total income at ₹${data.totalIncome.toLocaleString()} and expenses at ₹${data.totalExpense.toLocaleString()}, you are in a ${data.profit > 0 ? 'good position' : 'challenging phase'}.`,
      `Analysis shows a profit of ₹${data.profit.toLocaleString()}. I suggest focusing on ${data.topCategory} to further optimize your margins.`,
      `You've generated ₹${data.profit.toLocaleString()} in profit so far. Keeping an eye on your ₹${data.totalExpense.toLocaleString()} total expenses will help maintain this.`
    ],
    expense: [
      `Your biggest expense category is "${data.topCategory}", accounting for a significant portion of your ₹${data.totalExpense.toLocaleString()} total spending.`,
      `Most of your spending (₹${data.totalExpense.toLocaleString()}) is directed towards ${data.topCategory}. Reducing costs here could boost your profit.`,
      `Spending alert: You have spent ₹${data.totalExpense.toLocaleString()} in total, with ${data.topCategory} being the primary driver.`
    ],
    business: [
      `Overall performance: You're ${data.profit > 0 ? 'profitable' : 'running at a loss'}. Your operations show ${data.pendingOrders} pending orders and an inventory level of ${data.inventoryLevel}.`,
      `Business Summary: Revenue is ₹${data.totalIncome.toLocaleString()} vs Expenses of ₹${data.totalExpense.toLocaleString()}. Current efficiency is ${data.completionRate}% in order fulfillment.`,
      `Your business health is ${data.profit > data.totalIncome * 0.2 ? 'excellent' : 'stable'}. Focus on maintaining sales while controlling "${data.topCategory}" expenses.`
    ],
    orders: [
      `You have ${data.pendingOrders} orders pending. Your current order completion rate is ${data.completionRate}%.`,
      `Operations Update: ${data.ordersCompleted} out of ${data.ordersReceived} orders completed today. ${data.pendingOrders} are still in queue.`,
      `Order Flow: Completion rate is ${data.completionRate}%. I recommend prioritizing the ${data.pendingOrders} pending tasks.`
    ],
    inventory: [
      `Current inventory level is ${data.inventoryLevel} units. ${data.inventoryLevel < 50 ? 'I recommend restocking soon to avoid stockouts.' : 'Your stock levels look healthy for now.'}`,
      `Stock Status: ${data.inventoryLevel} items in hand. Based on your "${data.topCategory}" spending, ensure your supply chain remains efficient.`,
      `Inventory Check: ${data.inventoryLevel} units available. Keep monitoring this to match your order volume of ${data.ordersReceived}.`
    ]
  };

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (q.includes('profit')) return getRandom(responses.profit);
  if (q.includes('expense') || q.includes('spending')) return getRandom(responses.expense);
  if (q.includes('business') || q.includes('performance') || q.includes('how')) return getRandom(responses.business);
  if (q.includes('order')) return getRandom(responses.orders);
  if (q.includes('inventory') || q.includes('stock')) return getRandom(responses.inventory);
  
  return null; // Return null if no rule-based response matches
}

// @route   POST /api/chat
// @desc    Hybrid Chat Assistant (Rule-based + AI)
router.post('/', auth, async (req, res) => {
  const { question, message } = req.body;
  const input = question || message;
  
  if (!input) {
    return res.status(400).json({ message: 'Please provide a message or question' });
  }

  try {
    const userId = req.user.id;

    // 1. Fetch User Data for Context
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }
    });

    const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0]?.[0] || "General";
    const profit = totalIncome - totalExpense;

    const latestOp = await Operation.findOne({ userId }).sort({ date: -1 });
    const opMetrics = latestOp ? latestOp.metrics : { 
      pendingOrders: 0, ordersCompleted: 0, ordersReceived: 0, inventoryLevel: 0 
    };

    const completionRate = Math.round((opMetrics.ordersCompleted / (opMetrics.ordersReceived || 1)) * 100);

    const contextData = {
      totalIncome,
      totalExpense,
      profit,
      topCategory,
      pendingOrders: opMetrics.pendingOrders,
      ordersCompleted: opMetrics.ordersCompleted,
      ordersReceived: opMetrics.ordersReceived,
      inventoryLevel: opMetrics.inventoryLevel,
      completionRate
    };

    // 2. Try Rule-Based First (For fast, accurate data-related queries)
    const ruleReply = getRuleBasedResponse(input, contextData);

    if (ruleReply) {
      return res.json({ 
        reply: ruleReply, 
        source: "rule-based" 
      });
    }

    // 3. Fallback to Gemini AI (For general context and semantic understanding)
    console.log("🤖 Falling back to Gemini AI for:", input);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Provide some context to Gemini to make it aware of the user's business state
    const prompt = `
      The user is asking: "${input}"
      
      User's Current Business Data for Context:
      - Total Income: ₹${totalIncome}
      - Total Expense: ₹${totalExpense}
      - Net Profit: ₹${profit}
      - Main Expense Category: ${topCategory}
      - Pending Orders: ${opMetrics.pendingOrders}
      - Order Completion Rate: ${completionRate}%
      
      Provide a helpful, professional business advice response as Finexa AI. Keep it concise.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ 
      reply: text,
      source: "gemini-ai"
    });

  } catch (error) {
    console.error('Hybrid Chat Error:', error);
    res.status(500).json({ 
      reply: "I'm having trouble connecting to my brain right now. Please try again later.",
      source: "error",
      details: error.message
    });
  }
});

module.exports = router;
