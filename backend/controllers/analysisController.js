const Transaction = require('../models/Transaction');
const Operation = require('../models/Operation');
const mongoose = require('mongoose');

// Helper: Safe Trend Calculation
const calculateTrend = (current, previous) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

// Helper: Dynamic Insight Generator
const generateInsights = (summary) => {
  const insights = [];
  const { revenueTrend, expenseTrend, profitTrend, ordersTrend } = summary;

  // Revenue logic
  if (revenueTrend > 20) {
    insights.push("Revenue is growing strongly, indicating high demand.");
  } else if (revenueTrend > 0) {
    insights.push("Revenue is increasing steadily.");
  } else if (revenueTrend < 0) {
    insights.push("Revenue is declining. Investigate sales performance.");
  }

  // Expense logic
  if (expenseTrend > revenueTrend) {
    insights.push("Expenses are rising faster than revenue, reducing profitability.");
  }

  // Profit logic
  if (profitTrend > 0) {
    insights.push("Profit margins are improving.");
  } else if (profitTrend < 0) {
    insights.push("Profit is declining. Cost control is needed.");
  }

  // Orders logic
  if (ordersTrend > 10) {
    insights.push("Order volume is scaling up rapidly.");
  } else if (ordersTrend < 0) {
    insights.push("Order volume is decreasing. Demand may be weakening.");
  }

  if (insights.length === 0) {
    insights.push("Business performance is currently stable.");
  }

  return insights;
};

// Helper: Advanced Executive Advisory Engine
const generateExecutiveAdvisory = (summary) => {
  const { revenueTrend, expenseTrend, profitTrend, ordersTrend } = summary;

  const advisory = {
    health: "",
    warnings: [],
    suggestions: [],
    opportunities: [],
    priority: "LOW"
  };

  // 1. Financial Health Logic
  if (profitTrend > 20 && revenueTrend > 10) {
    advisory.health = "Strong business growth with healthy profitability.";
  } else if (profitTrend > 0) {
    advisory.health = "Business is stable with moderate growth.";
  } else if (profitTrend < 0) {
    advisory.health = "Business performance is declining. Immediate attention required.";
  } else {
    advisory.health = "Business performance is maintaining a neutral trend.";
  }

  // 2. Multi-Condition Logic
  if (revenueTrend > 0 && expenseTrend > revenueTrend) {
    advisory.warnings.push("Expenses are increasing faster than revenue.");
    advisory.suggestions.push("Optimize operational costs to protect profit margins.");
  }

  if (profitTrend < 0) {
    advisory.warnings.push("Profit is declining.");
    advisory.suggestions.push("Review pricing strategy or reduce unnecessary expenses.");
  }

  if (ordersTrend > 20) {
    advisory.opportunities.push("Order volume is growing rapidly.");
    advisory.suggestions.push("Scale operations and inventory to meet demand.");
  }

  if (ordersTrend < 0) {
    advisory.warnings.push("Order volume is decreasing.");
    advisory.suggestions.push("Improve marketing or customer acquisition strategies.");
  }

  // Fallback for stable state
  if (advisory.warnings.length === 0 && advisory.opportunities.length === 0) {
    advisory.suggestions.push("Maintain current overheads and focus on recurring revenue.");
  }

  // 3. Priority System
  if (advisory.warnings.length > 0) {
    advisory.priority = "HIGH";
  } else if (advisory.opportunities.length > 0) {
    advisory.priority = "MEDIUM";
  } else {
    advisory.priority = "LOW";
  }

  return advisory;
};

exports.getTrends = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    let { range = '30d', groupBy = 'day' } = req.query;

    // 1. Validate & Override Invalid Combinations
    if (range === '1h' && (groupBy === 'hour' || groupBy === 'day' || groupBy === 'week')) {
      groupBy = 'minute';
    }
    if (range === '24h' && (groupBy === 'day' || groupBy === 'week')) {
      groupBy = 'hour';
    }
    if (range === '7d' && (groupBy === 'week')) {
      groupBy = 'day';
    }

    // 2. Calculate Time Windows
    const currentTime = new Date();
    let rangeMs = 30 * 24 * 60 * 60 * 1000; // default 30d
    if (range === '1h') rangeMs = 60 * 60 * 1000;
    if (range === '24h') rangeMs = 24 * 60 * 60 * 1000;
    if (range === '7d') rangeMs = 7 * 24 * 60 * 60 * 1000;

    const startTime = new Date(currentTime.getTime() - rangeMs);
    const midTime = new Date(startTime.getTime() + rangeMs / 2);

    // 3. Define Grouping Format
    let dateFormat = "%Y-%m-%d";
    if (groupBy === 'minute') dateFormat = "%Y-%m-%d %H:%M";
    if (groupBy === 'hour') dateFormat = "%Y-%m-%d %H";
    if (groupBy === 'week') dateFormat = "%Y-W%V"; // ISO Week format

    const groupingProjection = groupBy === '5min' 
      ? { $dateToString: { 
          format: "%Y-%m-%d %H:%M", 
          date: { $add: [
            { $subtract: [ "$date", { $mod: [ { $toLong: "$date" }, 300000 ] } ] },
            0
          ]}
        }}
      : { $dateToString: { format: dateFormat, date: "$date" } };

    // 3. Aggregate for Summary (Current vs Previous)
    const getAggregatedData = async (start, end) => {
      const txs = await Transaction.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
          }
        }
      ]);

      const ops = await Operation.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, orders: { $sum: "$metrics.ordersReceived" } } }
      ]);

      return {
        revenue: txs[0]?.revenue || 0,
        expense: txs[0]?.expense || 0,
        profit: (txs[0]?.revenue || 0) - (txs[0]?.expense || 0),
        orders: ops[0]?.orders || 0
      };
    };

    const currentTotals = await getAggregatedData(midTime, currentTime);
    const previousTotals = await getAggregatedData(startTime, midTime);

    // 4. Calculate Trends
    const finalSummary = {
      revenueTrend: calculateTrend(currentTotals.revenue, previousTotals.revenue),
      expenseTrend: calculateTrend(currentTotals.expense, previousTotals.expense),
      profitTrend: calculateTrend(currentTotals.profit, previousTotals.profit),
      ordersTrend: calculateTrend(currentTotals.orders, previousTotals.orders)
    };

    // 5. Aggregate for Chart (Current Period Grouped)
    const chartTransactions = await Transaction.aggregate([
      { $match: { userId, date: { $gte: midTime, $lte: currentTime } } },
      {
        $group: {
          _id: groupingProjection,
          revenue: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const chartOperations = await Operation.aggregate([
      { $match: { userId, date: { $gte: midTime, $lte: currentTime } } },
      {
        $group: {
          _id: groupingProjection,
          orders: { $sum: "$metrics.ordersReceived" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Merge chart data
    const mergedMap = new Map();
    chartTransactions.forEach(item => {
      mergedMap.set(item._id, { date: item._id, revenue: item.revenue, expense: item.expense, profit: item.revenue - item.expense, orders: 0 });
    });
    chartOperations.forEach(item => {
      if (mergedMap.has(item._id)) {
        mergedMap.get(item._id).orders = item.orders;
      } else {
        mergedMap.set(item._id, { date: item._id, revenue: 0, expense: 0, profit: 0, orders: item.orders });
      }
    });

    const trendData = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Final Logic-Based Insights
    const insights = generateInsights(finalSummary);
    const executiveAdvisory = generateExecutiveAdvisory(finalSummary);

    res.json({ 
      trendData, 
      summary: finalSummary, 
      insights,
      executiveAdvisory 
    });

  } catch (err) {
    console.error("Dynamic Aggregation Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
