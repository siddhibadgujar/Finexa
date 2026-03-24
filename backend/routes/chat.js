const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const { GoogleGenerativeAI } = require("@google/generative-ai");



// @route   POST /api/chat
// @desc    Chat with AI business assistant
router.post('/', auth, async (req, res) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ message: 'Please provide a question' });
  }

  try {
    // Initialize Gemini with the current environment variable
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
    
    // 1. Fetch user data for context
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    
    let totalRevenue = 0, totalExpense = 0, itemsSold = 0, ordersReceived = 0, ordersCompleted = 0, pendingOrders = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') totalRevenue += t.amount;
      else totalExpense += t.amount;
      itemsSold += (t.itemsSold || 0);
      ordersReceived += (t.ordersReceived || 0);
      ordersCompleted += (t.ordersCompleted || 0);
      pendingOrders += (t.pendingOrders || 0);
    });

    const profit = totalRevenue - totalExpense;

    // 2. Construct Prompt
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `
    You are a smart business assistant for small business owners using the Finexa platform.
    
    Based on this user's business data:
    - Total Income: ₹${totalRevenue}
    - Total Expense: ₹${totalExpense}
    - Net Profit: ₹${profit}
    - Items Sold: ${itemsSold}
    - Orders Received: ${ordersReceived}
    - Orders Completed: ${ordersCompleted}
    - Pending Orders: ${pendingOrders}
    
    The user's question: "${question}"
    
    INSTRUCTIONS:
    - Answer the question in the SAME language as the user (English, Hindi, or Marathi).
    - Keep the answer simple, professional, and actionable.
    - If the user asks for advice, use the data provided to give specific suggestions.
    - If you cannot answer based on data, give general business advice.
    - Reply in the same language as the question.
    `;

    // 3. Call Gemini API
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ answer: responseText });

  } catch (error) {
    console.error('DETAILED Gemini API Error:', error);
    
    // 4. Robust Fallback Logic (Rule-Based & Data-Driven)
    function getFallbackResponse(question, data) {
      const q = question.toLowerCase();
      
      const rules = {
        profit: [
          `Your profit is ₹${data.profit}. It is low due to high expenses, especially in ${data.topCategory || 'General'}.`,
          `Current net profit stands at ₹${data.profit}. Controlling costs in ${data.topCategory} could improve this.`,
          `You've earned ₹${data.profit} in profit. I recommend reviewing ${data.topCategory} spending.`
        ],
        expense: [
          `You are spending most of your money on ${data.topCategory || 'General'}. Consider reducing unnecessary costs.`,
          `Highest spending is in ${data.topCategory}. Total expenses are ₹${data.totalExpense}.`,
          `Your biggest expense category is ${data.topCategory}. Keeping an eye here will help your margins.`
        ],
        status: [
          `Your business is currently ${data.status}. However, expenses are ${data.expenseTrend} and profit is ${data.profitTrend}.`,
          `Performance check: Business is ${data.status}. Revenue is ₹${data.totalRevenue} vs ₹${data.totalExpense} in costs.`,
          `Currently, you are ${data.status}. Increasing efficiency in operations could boost your ${data.profitTrend} profit.`
        ],
        orders: [
          `You have ${data.pendingOrders} pending orders and a completion rate of ${data.completionRate}%.`,
          `Order status: ${data.ordersCompleted}/${data.ordersReceived} completed. Completion rate is ${data.completionRate}%.`,
          `Operations update: ${data.pendingOrders} orders still need attention. Overall rate: ${data.completionRate}%.`
        ],
        inventory: [
          `Your current inventory sales level is ${data.itemsSold} units. Consider restocking if demand is high.`,
          `Stock update: You have moved ${data.itemsSold} items. Monitor your supply chain closely.`,
          `Sales data: ${data.itemsSold} units sold. Keep an eye on inventory for upcoming busy periods.`
        ],
        default: [
          `I analyzed your business data. You can improve performance by controlling expenses and increasing efficiency.`,
          `AI is currently sleeping, but looking at your data, focusing on ${data.topCategory} might be a good move.`,
          `I'm here to help! Based on your ₹${data.profit} profit, your business is showing interesting patterns.`
        ]
      };

      const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

      if (q.includes('profit')) return getRandom(rules.profit);
      if (q.includes('expense') || q.includes('spending')) return getRandom(rules.expense);
      if (q.includes('business') || q.includes('performance') || q.includes('how')) return getRandom(rules.status);
      if (q.includes('order')) return getRandom(rules.orders);
      if (q.includes('inventory') || q.includes('stock')) return getRandom(rules.inventory);
      
      return getRandom(rules.default);
    }

    // Prepare fallback data
    const categoryTotals = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0]?.[0] || "General";
    const completionRate = Math.round((ordersCompleted / (ordersReceived || 1)) * 100);
    const status = profit > 0 ? "profitable" : profit < 0 ? "running at a loss" : "breaking even";
    const expenseTrend = totalExpense > totalRevenue * 0.7 ? "high" : "moderate";
    const profitTrend = profit > 0 ? "positive" : "stable";

    const fallbackData = {
      totalRevenue, totalExpense, profit, itemsSold, 
      ordersReceived, ordersCompleted, pendingOrders,
      topCategory, completionRate, status, expenseTrend, profitTrend
    };

    const fallbackText = getFallbackResponse(question, fallbackData);

    res.json({ 
        answer: fallbackText, 
        source: "fallback",
        error_context: error.message 
    });
  }
});

module.exports = router;
