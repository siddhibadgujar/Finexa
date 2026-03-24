const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// @route   GET /api/insights
// @desc    Generate rule-based business insights
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.find({ userId }).sort({ date: 1 });

    if (transactions.length === 0) {
      return res.json([{ message: "Add some transactions to get insights!", type: "info" }]);
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Period calculations (Last 7 days vs Prev 7 days)
    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(today.getDate() - 7);
    const prev7DaysStart = new Date(last7DaysStart);
    prev7DaysStart.setDate(last7DaysStart.getDate() - 7);

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByDate = {};
    const expenseByDate = {};
    const expenseByCategory = {};
    const prevExpenseByCategory = {};
    let currentPeriodIncome = 0;
    let currentPeriodExpense = 0;
    let prevPeriodIncome = 0;
    let prevPeriodExpense = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const dateStr = tDate.toISOString().split('T')[0];
      
      if (t.type === 'income') {
        totalIncome += t.amount;
        incomeByDate[dateStr] = (incomeByDate[dateStr] || 0) + t.amount;
        if (tDate >= last7DaysStart) currentPeriodIncome += t.amount;
        else if (tDate >= prev7DaysStart) prevPeriodIncome += t.amount;
      } else {
        totalExpense += t.amount;
        expenseByDate[dateStr] = (expenseByDate[dateStr] || 0) + t.amount;
        
        if (tDate >= last7DaysStart) {
          currentPeriodExpense += t.amount;
          expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
        } else if (tDate >= prev7DaysStart) {
          prevPeriodExpense += t.amount;
          prevExpenseByCategory[t.category] = (prevExpenseByCategory[t.category] || 0) + t.amount;
        }
      }
    });

    const profit = totalIncome - totalExpense;
    const numDays = Object.keys({...incomeByDate, ...expenseByDate}).length || 1;
    const avgDailyIncome = totalIncome / numDays;
    const avgDailyExpense = totalExpense / numDays;

    const insights = [];
    const addInsight = (message, type, priority) => {
      // Prioritize: critical (3), warning (2), info (1), positive (0)
      const weights = { "critical": 100, "warning": 75, "info": 50, "positive": 25 };
      insights.push({ message, type, weight: weights[type] + priority });
    };

    // --- INCOME RULES ---
    if (currentPeriodIncome > prevPeriodIncome && prevPeriodIncome > 0) addInsight("📈 Income increased compared to last period", "positive", 10);
    if (currentPeriodIncome < prevPeriodIncome && prevPeriodIncome > 0) addInsight("⚠️ Income is decreasing - check sales funnel", "warning", 15);
    
    let maxInc = 0, bestDay = '';
    Object.entries(incomeByDate).forEach(([d, v]) => { if (v > maxInc) { maxInc = v; bestDay = d; } });
    if (bestDay) addInsight(`🎉 Highest income recorded on ${bestDay}`, "positive", 5);

    // --- EXPENSE RULES ---
    if (currentPeriodExpense > prevPeriodExpense && prevPeriodExpense > 0) addInsight("⚠️ Expenses increased significantly", "warning", 20);
    const todayExp = expenseByDate[todayStr] || 0;
    if (todayExp > avgDailyExpense && avgDailyExpense > 0) addInsight("🚨 High spending detected today compared to average", "critical", 25);
    const yestExp = expenseByDate[yesterdayStr] || 0;
    if (todayExp > yestExp && yestExp > 0) addInsight(`Expense today is higher than yesterday by ₹${(todayExp-yestExp).toLocaleString()}`, "info", 10);

    // --- PROFIT RULES ---
    if ((currentPeriodIncome - currentPeriodExpense) < (prevPeriodIncome - prevPeriodExpense)) addInsight("📉 Profit margin is declining", "critical", 30);
    if (profit > 0) addInsight("💰 Business is currently profitable", "positive", 10);
    if (profit > 0 && profit < (totalIncome * 0.1)) addInsight("⚠️ Profit margin is below 10% - review costs", "warning", 18);

    // --- CATEGORY RULES ---
    let highestExpCat = '';
    let maxCatVal = 0;
    Object.entries(expenseByCategory).forEach(([cat, val]) => {
      if (val > maxCatVal) { maxCatVal = val; highestExpCat = cat; }
    });
    if (highestExpCat) addInsight(`💡 You spend most on ${highestExpCat}`, "info", 8);

    // --- ANOMALY DETECTION ---
    if (todayExp > 1.5 * avgDailyExpense && avgDailyExpense > 0) addInsight("🚨 CRITICAL: Unusual expense spike detected today!", "critical", 40);

    // --- CASH FLOW & RATIOS ---
    if (avgDailyExpense > 0 && profit > 0) {
      const daysLeft = Math.floor(profit / avgDailyExpense);
      if (daysLeft < 7) addInsight("🚨 CRITICAL: Cash runway is less than 7 days!", "critical", 45);
      else addInsight(`💰 Your current cash will last approx ${daysLeft} days`, "info", 5);
    }

    if (totalIncome > 0) {
      const ratio = totalExpense / totalIncome;
      if (ratio > 0.8) addInsight("⚠️ High Expense-to-Income ratio ( > 80% )", "warning", 22);
      else if (ratio < 0.5) addInsight("👍 Excellent Expense-to-Income ratio ( < 50% )", "positive", 15);
    }

    // --- RECOMMENDATIONS ---
    if (profit <= 0) addInsight("💡 RECOMMENDATION: Increase pricing or pivot strategy to improve cash flow", "critical", 35);
    if (highestExpCat && expenseByCategory[highestExpCat] > (totalExpense * 0.4)) addInsight(`💡 RECOMMENDATION: Aim to reduce ${highestExpCat} spending by 15%`, "warning", 12);

    // Sort by importance and return top 8
    const finalInsights = insights
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map(i => ({ message: i.message, type: i.type }));

    res.json(finalInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating insights' });
  }
});

module.exports = router;
