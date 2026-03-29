const axios = require('axios');
const Transaction = require('../models/Transaction');
const AnomalyResolution = require('../models/AnomalyResolution');

// ─── Rule-based detection threshold ──────────────────────────────────────────
const HIGH_VALUE_THRESHOLD = 100000; // ₹1 lakh

// ─── Anomaly type classifier ─────────────────────────────────────────────────
// Returns one of: HIGH_EXPENSE | SPIKE_PATTERN | INCOME_DROP |
//                 UNUSUAL_CATEGORY | FREQUENT_TRANSACTIONS
function classifyAnomalyType(t, incomeMean, expenseMean, allTransactions) {
  // High-value expense (rule threshold)
  if (t.type === 'expense' && t.amount > HIGH_VALUE_THRESHOLD) {
    return 'HIGH_EXPENSE';
  }

  // Income drop — income is below 50% of mean
  if (t.type === 'income') {
    const drop = incomeMean > 0 ? ((incomeMean - t.amount) / incomeMean) * 100 : 0;
    if (drop >= 30) return 'INCOME_DROP';
  }

  // Spike pattern — expense is > 2x mean
  if (t.type === 'expense') {
    const ratio = expenseMean > 0 ? t.amount / expenseMean : 1;
    if (ratio >= 2) return 'SPIKE_PATTERN';
  }

  // Frequent transactions — 3+ transactions in the same category within 3 days
  if (allTransactions && t.category) {
    const txDate = new Date(t.date).getTime();
    const nearby = allTransactions.filter(other => {
      if (other.id === t.id && other._id === t._id) return false;
      const diff = Math.abs(new Date(other.date).getTime() - txDate);
      return diff <= 3 * 24 * 60 * 60 * 1000 && other.category === t.category;
    });
    if (nearby.length >= 2) return 'FREQUENT_TRANSACTIONS';
  }

  // Unusual category — expense in a category not seen before (rare)
  if (t.type === 'expense' && t.category && allTransactions) {
    const categoryCount = allTransactions.filter(other => other.category === t.category).length;
    if (categoryCount <= 1) return 'UNUSUAL_CATEGORY';
  }

  // Default fallback
  return t.type === 'income' ? 'INCOME_DROP' : 'HIGH_EXPENSE';
}

// ─── Apply rule-based anomaly detection on top of any existing results ────────
// Marks every transaction with amount > 100000 as anomaly=1 if not already.
// Adds severity + explanation without touching ML-detected ones.
function applyRuleBasedDetection(results, incomeMean, expenseMean) {
  return results.map(t => {
    // Already flagged by ML — enrich with anomalyType if missing
    if (t.anomaly === 1) {
      const anomalyType = t.anomalyType || classifyAnomalyType(t, incomeMean, expenseMean, results);
      return { ...t, anomalyType };
    }

    // Rule: high-value transaction
    if (t.amount > HIGH_VALUE_THRESHOLD) {
      const mean  = t.type === 'income' ? incomeMean : expenseMean;
      const ratio = mean > 0 ? t.amount / mean : 1;
      const anomalyType = classifyAnomalyType(t, incomeMean, expenseMean, results);
      let severity = 'High';
      let explanation = `High-value transaction: ₹${t.amount.toLocaleString()} exceeds ₹${HIGH_VALUE_THRESHOLD.toLocaleString()} threshold`;
      if (t.type === 'expense') {
        explanation += ` (${ratio.toFixed(1)}x your average expense of ₹${Math.round(mean)})`;
      } else {
        explanation += ` — unusually large income entry`;
      }
      return { ...t, anomaly: 1, severity, explanation, anomalyType, ruleDetected: true };
    }
    return t;
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/anomaly  — Detect & return user-specific anomalies
// ─────────────────────────────────────────────────────────────
exports.detectAnomalies = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });

    if (transactions.length === 0) {
      return res.status(200).json({
        message: "No transaction data available for analysis",
        anomalies: []
      });
    }

    // Fetch resolved transaction IDs for this user
    const resolved = await AnomalyResolution.find({ userId: req.user.id }).select('transactionId');
    const resolvedSet = new Set(resolved.map(r => r.transactionId));

    // Format — include _id so frontend can reference for resolve
    const formattedData = transactions.map(t => ({
      _id:      t._id.toString(),
      date:     t.date,
      amount:   t.amount,
      type:     t.type,
      category: t.category
    }));

    // ── Compute means for rule-based detection ──────────────────────────────
    const calcMean = (arr) => arr.length > 0 ? arr.reduce((acc, curr) => acc + curr.amount, 0) / arr.length : 0;
    const incomeMean  = calcMean(formattedData.filter(t => t.type === 'income'));
    const expenseMean = calcMean(formattedData.filter(t => t.type === 'expense'));

    // ── Send to Python ML service ─────────────────────────────────────────────
    let results;
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      const mlResponse = await axios.post(`${mlServiceUrl}/anomaly`, { transactions: formattedData }, {
        timeout: 10000
      });
      results = mlResponse.data;

      // Ensure each item has a consistent `id` = MongoDB _id string
      results = results.map(t => ({
        ...t,
        id: t.id || t._id,
        isResolved: resolvedSet.has(t.id || t._id)
      }));

      // ── ML-based severity + explanation + anomaly type ──────────────────────
      results = results.map(t => {
        if (t.anomaly === 1) {
          const mean  = t.type === 'income' ? incomeMean : expenseMean;
          const ratio = mean > 0 ? t.amount / mean : 1;
          let severity    = 'Low';
          let explanation = '';
          if (t.type === 'expense') {
            if (ratio >= 2)        severity = 'High';
            else if (ratio >= 1.5) severity = 'Medium';
            explanation = `Expense is ${ratio.toFixed(1)}x higher than average (₹${Math.round(mean)})`;
          } else {
            const dropPercent = mean > 0 ? ((mean - t.amount) / mean) * 100 : 0;
            if (dropPercent >= 50)   severity = 'High';
            else if (dropPercent >= 30) severity = 'Medium';
            explanation = `Income dropped by ${Math.round(dropPercent)}% below average (₹${Math.round(mean)})`;
          }
          const anomalyType = classifyAnomalyType(t, incomeMean, expenseMean, results);
          return { ...t, severity, explanation, anomalyType };
        }
        return { ...t, severity: 'Normal', explanation: 'Consistent with typical patterns' };
      });

    } catch (mlError) {
      console.warn('[Finexa] ML service unavailable — falling back to rule-based detection:', mlError.message);

      // ── Rule-based fallback: build results from raw transactions ─────────────
      results = formattedData.map(t => ({
        id:         t._id,
        _id:        t._id,
        date:       t.date,
        amount:     t.amount,
        type:       t.type,
        category:   t.category,
        anomaly:    0,
        severity:   'Normal',
        explanation:'Consistent with typical patterns',
        isResolved: resolvedSet.has(t._id)
      }));
    }

    // ── Apply rule-based detection on top of ML results ───────────────────────
    // This ensures EVERY transaction > ₹1 lakh is flagged, regardless of ML output.
    results = applyRuleBasedDetection(results, incomeMean, expenseMean);

    // Re-stamp isResolved after rule-based pass (id may have changed)
    results = results.map(t => ({
      ...t,
      isResolved: resolvedSet.has(t.id)
    }));

    // ── Active anomalies ─────────────────────────────────────────────────────
    const anomalies       = results.filter(r => r.anomaly === 1);
    const activeAnomalies = anomalies.filter(a => !a.isResolved);

    // ── AI Decision Engine ───────────────────────────────────────────────────
    const highSeverity     = activeAnomalies.filter(a => a.severity === 'High');
    const medSeverity      = activeAnomalies.filter(a => a.severity === 'Medium');
    const incomeAnomalies  = activeAnomalies.filter(a => a.type === 'income');
    const expenseAnomalies = activeAnomalies.filter(a => a.type === 'expense');

    let aiSummary = 'Your financial patterns are generally stable. No major risks detected.';
    if (activeAnomalies.length > 0) {
      if (highSeverity.length > 0)
        aiSummary = `Urgent: ${highSeverity.length} high-severity deviation(s) detected. Portions of your cashflow show extreme volatility.`;
      else if (incomeAnomalies.length > 0)
        aiSummary = 'Warning: Unusual drops in revenue detected. Your income streams may be inconsistent.';
      else
        aiSummary = 'Caution: Minor irregularities found in spending patterns. Manual review recommended.';
    }

    const riskVal   = (highSeverity.length * 30) + (medSeverity.length * 20) + (activeAnomalies.length * 10);
    const riskScore = Math.min(riskVal, 100);
    let riskLevel = 'Low';
    if (riskScore >= 70)      riskLevel = 'High';
    else if (riskScore >= 30) riskLevel = 'Medium';

    const recommendations = [];
    if (expenseAnomalies.length > 0) {
      recommendations.push('Review high-value expense spikes and consider vendor renegotiation.');
      recommendations.push('Implement stricter approval workflows for non-recurring expenses.');
    }
    if (incomeAnomalies.length > 0) {
      recommendations.push('Investigate specific revenue drops and follow up on delayed receivables.');
      recommendations.push('Analyze sales conversion trends to identify the root cause of income dips.');
    }
    if (activeAnomalies.length === 0) {
      recommendations.push('Continue maintaining current financial discipline.');
    }

    // ── Trend Insight ────────────────────────────────────────────────────────
    let trendInsight = activeAnomalies.length > 0
      ? `Unusual transactions detected — ${activeAnomalies.length} active anomaly(ies) requiring attention.`
      : 'System Stable — All recent transactions align with your 30-day historical baseline.';

    if (activeAnomalies.length > 0) {
      const last  = activeAnomalies[activeAnomalies.length - 1];
      const mean  = last.type === 'income' ? incomeMean : expenseMean;
      const ratio = mean > 0 ? (last.amount / mean).toFixed(1) : 1;
      if (last.type === 'expense')
        trendInsight = `Current spending spike is ${ratio}x higher than your usual average of ₹${Math.round(mean)}.`;
      else {
        const drop = mean > 0 ? (((mean - last.amount) / mean) * 100).toFixed(0) : 0;
        trendInsight = `Revenue has plummeted by ${drop}% below your typical baseline of ₹${Math.round(mean)}.`;
      }
    }

    res.status(200).json({
      message:  activeAnomalies.length > 0 ? 'Unusual transactions detected' : 'System Stable',
      anomalies: results,   // full list with anomaly flag + isResolved for graph
      count:     activeAnomalies.length,
      aiSummary,
      riskScore,
      riskLevel,
      recommendations,
      trendInsight
    });

  } catch (error) {
    console.error('Internal Controller Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/anomaly/resolve/:id  — Mark anomaly as resolved
// ─────────────────────────────────────────────────────────────
exports.resolveAnomaly = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionTaken = '' } = req.body;

    // Verify the transaction belongs to this user
    const tx = await Transaction.findOne({ _id: id, userId: req.user.id });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Upsert resolution record
    await AnomalyResolution.findOneAndUpdate(
      { userId: req.user.id, transactionId: id },
      { userId: req.user.id, transactionId: id, actionTaken, resolvedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Anomaly resolved successfully', transactionId: id });
  } catch (error) {
    console.error('Resolve Anomaly Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
