const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });

    let totalRevenue = 0;
    let totalExpense = 0;
    let totalUnitsProduced = 0;
    let totalItemsSold = 0;
    let totalOrdersReceived = 0;
    let totalOrdersCompleted = 0;
    let totalPendingOrders = 0;
    let latestInventory = 0;
    let totalDeliveryTime = 0;
    let deliveryEntries = 0;
    let totalReturns = 0;
    let totalDefects = 0;
    let inventoryFound = false;

    // Grouping for charts
    const expensesByCategory = {};
    const trendsByDate = {}; // store daily income/expense for line chart

    transactions.forEach((t, index) => {
      // Calculate totals
      if (t.type === 'income') {
        totalRevenue += t.amount;
      } else {
        totalExpense += t.amount;
        // Group by category for pie chart
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }

      // Operational Aggregates
      totalUnitsProduced += (t.unitsProduced || 0);
      totalItemsSold += (t.itemsSold || 0);
      totalOrdersReceived += (t.ordersReceived || 0);
      totalOrdersCompleted += (t.ordersCompleted || 0);
      totalPendingOrders += (t.pendingOrders || 0);
      totalReturns += (t.returns || 0);
      totalDefects += (t.defects || 0);
      
      if (t.deliveryTimeAvg > 0) {
        totalDeliveryTime += t.deliveryTimeAvg;
        deliveryEntries++;
      }
      
      // For inventory, we take the most recent non-zero entry's level
      if (!inventoryFound && t.inventoryLevel > 0) {
        latestInventory = t.inventoryLevel;
        inventoryFound = true;
      }
      // Fallback: Use the very latest if all are zero
      if (index === 0 && !inventoryFound) {
        latestInventory = t.inventoryLevel || 0;
      }

      // Group by date (YYYY-MM-DD string) for line chart
      const dateStr = t.date.toISOString().split('T')[0];
      if (!trendsByDate[dateStr]) {
        trendsByDate[dateStr] = { date: dateStr, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        trendsByDate[dateStr].income += t.amount;
      } else {
        trendsByDate[dateStr].expense += t.amount;
      }
    });

    const profit = totalRevenue - totalExpense;
    const balance = profit; // Assuming balance is derived from profit

    // Format chart data
    const pieChartData = Object.keys(expensesByCategory).map(key => ({
      name: key,
      value: expensesByCategory[key]
    })).sort((a, b) => b.value - a.value);

    // Sort by date for the line chart
    const lineChartData = Object.values(trendsByDate).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Dashboard Insights Logic
    const insights = [];
    if (totalExpense > totalRevenue && totalRevenue > 0) {
      insights.push({ type: 'critical', text: 'Critical: Expenses exceed total revenue.' });
    } else if (totalExpense > (totalRevenue * 0.8)) {
      insights.push({ type: 'warning', text: 'Warning: High expense ratio. You are spending 80% or more of your revenue.' });
    } else if (totalRevenue > 0) {
      insights.push({ type: 'info', text: 'Good standing: Expenses are well within healthy limits.' });
    }

    if (pieChartData.length > 0) {
      insights.push({ type: 'info', text: `Highest spending is in the '${pieChartData[0].name}' category.` });
    }

    // Health Score (0-100)
    let healthScore = 100;
    if (totalRevenue > 0) {
      const expenseRatio = totalExpense / totalRevenue;
      healthScore = Math.max(0, Math.floor(100 - (expenseRatio * 100)));
      if (healthScore > 100) healthScore = 100;
      if (healthScore === 0 && totalRevenue > totalExpense) healthScore = 50; // fallback just in case
    } else if (totalExpense > 0) {
      healthScore = 0; // Only expenses, no revenue
    } else {
      healthScore = 50; // No transactions yet
    }

    res.json({
      transactions: transactions.slice(0, 5), // Return recent 5 transactions
      metrics: {
        totalRevenue,
        totalExpense,
        profit,
        balance,
        healthScore,
        // Added operational metrics
        unitsProduced: totalUnitsProduced,
        totalItemsSold,
        ordersReceived: totalOrdersReceived,
        totalOrdersCompleted,
        totalPendingOrders,
        latestInventory,
        deliveryTimeAvg: deliveryEntries > 0 ? (totalDeliveryTime / deliveryEntries).toFixed(1) : 0,
        totalReturns,
        defects: totalDefects
      },
      charts: {
        pieChartData,
        lineChartData
      },
      insights
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
});

// @route   POST /api/transactions/add
// @desc    Add a new transaction
router.post('/add', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type, amount, category, date,
      unitsProduced, itemsSold, ordersReceived, ordersCompleted, pendingOrders, inventoryLevel, deliveryTimeAvg, returns, defects 
    } = req.body;
    
    if (!type || (amount === undefined || amount === null) || !category) {
      return res.status(400).json({ message: 'Please provide type, amount, and category' });
    }

    const newTransaction = new Transaction({
      userId,
      type,
      amount,
      category,
      date: date || Date.now(),
      unitsProduced: unitsProduced || 0,
      itemsSold: itemsSold || 0,
      ordersReceived: ordersReceived || 0,
      ordersCompleted: ordersCompleted || 0,
      pendingOrders: pendingOrders || 0,
      inventoryLevel: inventoryLevel || 0,
      deliveryTimeAvg: deliveryTimeAvg || 0,
      returns: returns || 0,
      defects: defects || 0
    });

    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving transaction' });
  }
});

module.exports = router;
