const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Operation = require("../models/Operation");

exports.downloadReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000); // 14 days

    // 1. Fetch Transactions
    const txsCurr = await Transaction.aggregate([
      { $match: { userId, date: { $gte: currentStart, $lt: now } } },
      { $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
      }}
    ]);
    const currIncome = txsCurr[0]?.income || 0;
    const currExpense = txsCurr[0]?.expense || 0;
    const currProfit = currIncome - currExpense;

    const txsPrev = await Transaction.aggregate([
      { $match: { userId, date: { $gte: previousStart, $lt: currentStart } } },
      { $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
      }}
    ]);
    const prevIncome = txsPrev[0]?.income || 0;
    const prevExpense = txsPrev[0]?.expense || 0;
    const prevProfit = prevIncome - prevExpense;

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const incomeTrend = Math.round(calcTrend(currIncome, prevIncome));
    const expenseTrend = Math.round(calcTrend(currExpense, prevExpense));
    const profitTrend = Math.round(calcTrend(currProfit, prevProfit));

    const getArrow = (val) => val >= 0 ? `↑ ${val}` : `↓ ${Math.abs(val)}`;

    // 2. Fetch Operational Performance
    const ops = await Operation.aggregate([
        { $match: { userId, date: { $gte: currentStart, $lt: now } } },
        { $group: { 
            _id: null, 
            orders: { $sum: "$metrics.ordersReceived" },
            completed: { $sum: "$metrics.ordersCompleted" },
            pending: { $sum: "$metrics.pendingOrders" },
            deliveryTime: { $avg: "$metrics.deliveryTimeAvg" },
            defects: { $sum: "$metrics.defects" }
        }}
    ]);
    const opCurr = {
      orders: ops[0]?.orders || 0,
      completed: ops[0]?.completed || 0,
      pending: ops[0]?.pending || 0,
      deliveryTime: Math.round(ops[0]?.deliveryTime || 0),
      defects: ops[0]?.defects || 0
    };
    const compRate = opCurr.orders > 0 ? Math.round((opCurr.completed / opCurr.orders) * 100) : 0;

    const opsPrev = await Operation.aggregate([
        { $match: { userId, date: { $gte: previousStart, $lt: currentStart } } },
        { $group: { 
            _id: null, 
            orders: { $sum: "$metrics.ordersReceived" },
            completed: { $sum: "$metrics.ordersCompleted" },
            deliveryTime: { $avg: "$metrics.deliveryTimeAvg" },
            defects: { $sum: "$metrics.defects" }
        }}
    ]);
    const opPrev = {
      orders: opsPrev[0]?.orders || 0,
      completed: opsPrev[0]?.completed || 0,
      deliveryTime: opsPrev[0]?.deliveryTime || 0,
      defects: opsPrev[0]?.defects || 0
    };
    
    // Patterns
    const ordersTrend = calcTrend(opCurr.orders, opPrev.orders);
    const delTrend = calcTrend(opCurr.deliveryTime, opPrev.deliveryTime);
    const defTrend = calcTrend(opCurr.defects, opPrev.defects);
    const compRatePrev = opPrev.orders > 0 ? (opPrev.completed / opPrev.orders) * 100 : 0;
    const compTrend = calcTrend(compRate, compRatePrev);

    let patterns = [];
    if (ordersTrend > 5) patterns.push("Workload increasing");
    if (ordersTrend < -5) patterns.push("Demand decreasing");
    if (delTrend > 5) patterns.push("Delivery getting slower");
    if (defTrend > 5) patterns.push("Quality issues rising");
    if (compTrend < -5) patterns.push("Efficiency decreasing");
    if (patterns.length === 0) patterns.push("No operational patterns available");

    // Insights
    let insights = [];
    if (expenseTrend > 5) insights.push("Expenses increased");
    else if (expenseTrend < -5) insights.push("Expenses decreased");
    if (profitTrend < -5) insights.push("Profit declining");
    else if (profitTrend > 5) insights.push("Profit growing");
    if (insights.length === 0) insights.push("Not enough data for trend analysis");

    // Cashflow
    const allTxs = await Transaction.aggregate([
      { $match: { userId } },
      { $group: {
          _id: null,
          totalBal: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", { $multiply: ["$amount", -1] }] } }
      }}
    ]);
    const lifetimeBal = allTxs[0]?.totalBal || 0;
    const avgDailyExpense = Math.round(currExpense / 7) || 0;
    const daysLeft = avgDailyExpense > 0 ? Math.round(lifetimeBal / avgDailyExpense) : "N/A";

    // Categories
    const catAgg = await Transaction.aggregate([
      { $match: { userId, type: "expense", date: { $gte: currentStart, $lt: now } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);
    let highestCat = "None";
    let catInc = 0;
    if (catAgg.length > 0) {
      highestCat = catAgg[0]._id;
      const prevCatAgg = await Transaction.aggregate([
        { $match: { userId, type: "expense", category: highestCat, date: { $gte: previousStart, $lt: currentStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const prevCatTot = prevCatAgg[0]?.total || 0;
      catInc = Math.round(calcTrend(catAgg[0].total, prevCatTot));
    }

    // Recommendations
    let recs = [];
    if (highestCat !== "None" && catInc > 5) recs.push(`Reduce high expense category (${highestCat})`);
    if (compTrend < -5 || compRate < 70) recs.push("Improve efficiency");
    if (delTrend > 5) recs.push("Optimize delivery time");
    if (recs.length === 0) recs.push("Operations are structurally sound. Maintain current strategy.");

    // ------------ PDF GENERATION ------------
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    doc.pipe(res);

    // TITLE
    doc.fontSize(20).text("Finexa Strategic Business Report", { align: "center" });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown(2);

    // SECTION 1: FINANCIAL SUMMARY
    doc.fontSize(16).text("SECTION 1: FINANCIAL SUMMARY", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Total Income: ₹${currIncome.toLocaleString()}`);
    doc.text(`Total Expense: ₹${currExpense.toLocaleString()}`);
    doc.text(`Profit: ₹${currProfit.toLocaleString()}`);
    doc.moveDown(1.5);

    // SECTION 2: TREND ANALYSIS
    doc.fontSize(16).text("SECTION 2: TREND ANALYSIS", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    if (currIncome === 0 && currExpense === 0) {
        doc.text("Not enough data for trend analysis");
    } else {
        doc.text(`Income Trend: ${getArrow(incomeTrend)}%`);
        doc.text(`Expense Trend: ${getArrow(expenseTrend)}%`);
        doc.text(`Profit Trend: ${getArrow(profitTrend)}%`);
    }
    doc.moveDown(1.5);

    // SECTION 3: COMPARISON
    doc.fontSize(16).text("SECTION 3: COMPARISON", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text("This Week vs Last Week:");
    doc.text(`  Income: ${getArrow(incomeTrend)}%`);
    doc.text(`  Expense: ${getArrow(expenseTrend)}%`);
    doc.moveDown(1.5);

    // SECTION 4: KEY INSIGHTS
    doc.fontSize(16).text("SECTION 4: KEY INSIGHTS", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    insights.forEach(i => doc.text("• " + i));
    doc.moveDown(1.5);

    // SECTION 5: OPERATIONAL PERFORMANCE
    doc.fontSize(16).text("SECTION 5: OPERATIONAL PERFORMANCE", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    if (opCurr.orders === 0 && opCurr.completed === 0) {
        doc.text("No operational data available");
    } else {
        doc.text(`Orders Completed: ${opCurr.completed}`);
        doc.text(`Pending Orders: ${opCurr.pending}`);
        doc.text(`Completion Rate: ${compRate}%`);
        doc.text(`Defects: ${opCurr.defects}`);
        doc.text(`Delivery Time: ${opCurr.deliveryTime} days`);
    }
    doc.moveDown(1.5);

    // SECTION 6: OPERATIONAL PATTERNS
    doc.fontSize(16).text("SECTION 6: OPERATIONAL PATTERNS", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    patterns.forEach(p => doc.text("• " + p));
    doc.moveDown(1.5);

    // SECTION 7: CATEGORY ANALYSIS
    doc.fontSize(16).text("SECTION 7: CATEGORY ANALYSIS", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Highest expense category: ${highestCat}`);
    doc.text(`Category increase: ${catInc}%`);
    doc.moveDown(1.5);

    // SECTION 8: CASH FLOW
    doc.fontSize(16).text("SECTION 8: CASH FLOW", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Avg Daily Expense: ₹${avgDailyExpense.toLocaleString()}`);
    doc.text(`Estimated Days Left: ${daysLeft}`);
    doc.moveDown(1.5);

    // SECTION 9: RECOMMENDATIONS
    doc.fontSize(16).text("SECTION 9: RECOMMENDATIONS", { underline: true });
    doc.fontSize(12).moveDown(0.5);
    recs.forEach(r => doc.text("• " + r));

    doc.end();

  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
};
