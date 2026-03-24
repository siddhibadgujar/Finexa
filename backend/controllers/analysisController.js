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

// Helper: Dynamic Insight Generator with data-driven text
const generateInsights = (summary, range) => {
  const insights = [];
  const { revenueTrend, expenseTrend, profitTrend, ordersTrend } = summary;
  const periodStr = range === '7d' ? 'last week' : range === '30d' ? 'last month' : 'the previous period';

  if (revenueTrend > 0) {
    insights.push(`Revenue increased by ${revenueTrend.toFixed(0)}% compared to ${periodStr}`);
  } else if (revenueTrend < 0) {
    insights.push(`Revenue decreased by ${Math.abs(revenueTrend).toFixed(0)}% compared to ${periodStr}`);
  }

  if (expenseTrend > 0) {
    insights.push(`Expenses rose by ${expenseTrend.toFixed(0)}% compared to ${periodStr}`);
  }

  if (profitTrend > 0) {
    insights.push(`Profit margin improved by ${profitTrend.toFixed(0)}% compared to ${periodStr}`);
  } else if (profitTrend < 0) {
    insights.push(`Profit margin dropped by ${Math.abs(profitTrend).toFixed(0)}% compared to ${periodStr}`);
  }

  if (insights.length === 0) {
    insights.push("Business performance is maintaining stable baselines.");
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

exports.getAnalysis = async (req, res) => {
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

    // 6. Native Data-Driven Insights
    const insights = generateInsights(finalSummary, range);
    const executiveAdvisory = generateExecutiveAdvisory(finalSummary);

    // 7. Comparison Payload
    const comparison = {
      incomeChange: finalSummary.revenueTrend,
      expenseChange: finalSummary.expenseTrend,
      profitChange: finalSummary.profitTrend
    };

    // 8. Operations Analysis Payload
    const operationsData = await Operation.find({ userId }).sort({ date: -1 }).limit(1);
    let operationsInsights = [];
    if (operationsData.length > 0) {
      const todayOp = operationsData[0];
      const { ordersReceived = 0, ordersCompleted = 0, pendingOrders = 0, deliveryTimeAvg = 0, defects = 0 } = todayOp.metrics || {};
      const completionRate = ordersReceived > 0 ? (ordersCompleted / ordersReceived) : 0;
      const pendingRatio = ordersReceived > 0 ? (pendingOrders / ordersReceived) : 0;
      
      if (pendingRatio > 0.4) operationsInsights.push({ message: "⚠️ High pending orders → workload issue", type: "warning" });
      if (ordersReceived > 0 && completionRate < 0.6) operationsInsights.push({ message: "⚠️ Low completion rate → efficiency issue", type: "warning" });
      if (deliveryTimeAvg > 24) operationsInsights.push({ message: "⚠️ Delivery time increasing → slow operations", type: "warning" });
      if (ordersCompleted > 0 && (defects / ordersCompleted) > 0.1) operationsInsights.push({ message: "⚠️ Defects increasing → quality issue", type: "warning" });
      if (operationsInsights.length === 0) operationsInsights.push({ message: "✅ Operations running efficiently", type: "positive" });
    } else {
      operationsInsights.push({ message: "No operational constraints detected", type: "info" });
    }

    // 9. Category Aggregations Payload
    const categoryAgg = await Transaction.aggregate([
      { $match: { userId, type: "expense", date: { $gte: midTime, $lte: currentTime } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);
    
    let categoryInsights = [];
    if (categoryAgg.length > 0) {
      const topCategory = categoryAgg[0]._id;
      categoryInsights.push({ message: `You spend most on ${topCategory || 'External Services'}`, type: "info" });
      
      const prevCategoryAgg = await Transaction.aggregate([
        { $match: { userId, type: "expense", category: topCategory, date: { $gte: startTime, $lte: midTime } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const prevTotal = prevCategoryAgg[0]?.total || 0;
      const currTotal = categoryAgg[0].total;
      const catChange = calculateTrend(currTotal, prevTotal);

      if (catChange > 0) {
        categoryInsights.push({ message: `${topCategory || 'Category'} expenses increased by ${catChange.toFixed(0)}%`, type: "warning" });
      } else if (catChange < 0) {
        categoryInsights.push({ message: `${topCategory || 'Category'} expenses decreased by ${Math.abs(catChange).toFixed(0)}%`, type: "positive" });
      }
    } else {
      categoryInsights.push({ message: "No heavy spending categories detected.", type: "positive" });
    }

    // 10. Cashflow Payload
    const totalAgg = await Transaction.aggregate([
      { $match: { userId } },
      { $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
      }}
    ]);
    const balance = (totalAgg[0]?.totalIn || 0) - (totalAgg[0]?.totalOut || 0);
    const numDays = rangeMs / (24 * 60 * 60 * 1000) / 2 || 1; 
    const avgDailyExpense = currentTotals.expense / numDays;
    const daysLeft = avgDailyExpense > 0 ? (balance / avgDailyExpense) : 999;
    
    let cashflowInsights = [];
    if (balance <= 0) {
      cashflowInsights.push({ message: "⚠️ Negative or zero cash balance", type: "critical" });
    } else if (daysLeft < 30) {
      cashflowInsights.push({ message: `⚠️ Risk of running out of cash (approx. ${Math.floor(daysLeft)} days left)`, type: "warning" });
    } else {
      cashflowInsights.push({ message: `✅ Cash reserves will last for approx. ${Math.floor(daysLeft)} days`, type: "positive" });
    }

    // 11. Custom Predictions Payload
    let predictions = [];
    if (finalSummary.expenseTrend > 10) {
      predictions.push({ message: "⚠️ If expenses continue increasing, profit may decrease next period.", type: "warning" });
    }
    if (finalSummary.ordersTrend > 5) {
      predictions.push({ message: "📈 Orders likely to increase next week based on current demand trend.", type: "positive" });
    }
    if (finalSummary.revenueTrend < -5) {
      predictions.push({ message: "📉 Revenue is cooling down. Consider promotional activities.", type: "info" });
    }
    if (predictions.length === 0) {
      predictions.push({ message: "🚀 Consistent growth trajectory predicted if overheads remain stable.", type: "positive" });
    }

    // Complete Business Intelligence Response
    res.json({ 
      comparison,
      trends: { trendData, summary: finalSummary, insights },
      operations: { insights: operationsInsights },
      categories: { insights: categoryInsights },
      cashflow: { avgDailyExpense, daysLeft, insights: cashflowInsights },
      predictions,
      executiveAdvisory 
    });

  } catch (err) {
    console.error("Dynamic Aggregation Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDashboardTrends = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    let { range = '30d', groupBy = 'day' } = req.query;

    // Calculate Time Windows (similar to getAnalysis)
    const now = new Date();
    let rangeMs = 30 * 24 * 60 * 60 * 1000; // default 30d
    if (range === '1h') rangeMs = 60 * 60 * 1000;
    if (range === '24h') rangeMs = 24 * 60 * 60 * 1000;
    if (range === '7d') rangeMs = 7 * 24 * 60 * 60 * 1000;

    const currentStart = new Date(now.getTime() - (rangeMs / 2));
    const previousStart = new Date(now.getTime() - rangeMs);

    const getAgg = async (start, end) => {
      const txs = await Transaction.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        { $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
        }}
      ]);
      const ops = await Operation.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        { $group: { _id: null, orders: { $sum: "$metrics.ordersReceived" } } }
      ]);
      return {
        income: txs[0]?.income || 0,
        expense: txs[0]?.expense || 0,
        profit: (txs[0]?.income || 0) - (txs[0]?.expense || 0),
        orders: ops[0]?.orders || 0
      };
    };

    const current = await getAgg(currentStart, now);
    const previous = await getAgg(previousStart, currentStart);

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const incomeTrend = Math.round(calcTrend(current.income, previous.income));
    const expenseTrend = Math.round(calcTrend(current.expense, previous.expense));
    const profitTrend = Math.round(calcTrend(current.profit, previous.profit));
    const ordersTrend = Math.round(calcTrend(current.orders, previous.orders));

    let insights = [];

    // Trend insight generation
    if (incomeTrend > 5) insights.push({ message: `📈 Income increased by ${incomeTrend}%` });
    else if (incomeTrend < -5) insights.push({ message: `⚠️ Income decreased by ${Math.abs(incomeTrend)}%` });

    if (expenseTrend > 5) insights.push({ message: `⚠️ Expenses increased by ${expenseTrend}%` });
    else if (expenseTrend < -5) insights.push({ message: `✅ Expenses reduced by ${Math.abs(expenseTrend)}%` });

    if (profitTrend > 5) insights.push({ message: `💰 Profit improved by ${profitTrend}%` });
    else if (profitTrend < -5) insights.push({ message: `📉 Profit declined by ${Math.abs(profitTrend)}%` });

    if (ordersTrend > 5) insights.push({ message: `📦 Orders increasing (${ordersTrend}%)` });
    else if (ordersTrend < -5) insights.push({ message: `⚠️ Orders decreasing (${Math.abs(ordersTrend)}%)` });

    if (insights.length === 0) {
      if (previous.income === 0 && previous.expense === 0) {
        insights.push({ message: "Not enough data to calculate trends" });
      } else {
        insights.push({ message: "No significant trends detected for this period" });
      }
    }

    res.json({ insights: insights.slice(0, 4) });

  } catch (err) {
    console.error("Trend API error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getOperationalPatterns = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days prior

    const getAgg = async (start, end) => {
      const ops = await Operation.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        { $group: { 
            _id: null, 
            orders: { $sum: "$metrics.ordersReceived" },
            completed: { $sum: "$metrics.ordersCompleted" },
            deliveryTime: { $avg: "$metrics.deliveryTimeAvg" },
            defects: { $sum: "$metrics.defects" }
        }}
      ]);
      return {
        orders: ops[0]?.orders || 0,
        completed: ops[0]?.completed || 0,
        deliveryTime: ops[0]?.deliveryTime || 0,
        defects: ops[0]?.defects || 0
      };
    };

    const current = await getAgg(currentStart, now);
    const previous = await getAgg(previousStart, currentStart);

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const ordersTrend = calcTrend(current.orders, previous.orders);
    
    // completion rate = completed / orders
    const currentCompRate = current.orders > 0 ? current.completed / current.orders : 0;
    const previousCompRate = previous.orders > 0 ? previous.completed / previous.orders : 0;
    const completionTrend = calcTrend(currentCompRate, previousCompRate);
    
    const deliveryTimeTrend = calcTrend(current.deliveryTime, previous.deliveryTime);
    const defectsTrend = calcTrend(current.defects, previous.defects);

    let patterns = [];

    if (ordersTrend > 5) patterns.push({ message: "📈 Workload increasing" });
    if (ordersTrend < -5) patterns.push({ message: "⚠️ Demand decreasing" });
    if (deliveryTimeTrend > 5) patterns.push({ message: "🚚 Delivery getting slower" });
    if (defectsTrend > 5) patterns.push({ message: "⚠️ Quality issues increasing" });
    if (completionTrend < -5) patterns.push({ message: "⚠️ Efficiency decreasing" });

    if (patterns.length === 0) {
      patterns.push({ message: "No operational patterns available" });
    }

    res.json(patterns);

  } catch (err) {
    console.error("Operational Patterns API error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
