const axios = require('axios');
const Transaction = require('../models/Transaction');

exports.detectAnomalies = async (req, res) => {
  try {
    // 1. Fetch transactions from MongoDB
    // Optimization: Only fetch last N transactions or within a date range if dataset is huge.
    // For now, fetching all to give Isolation Forest enough data.
    const transactions = await Transaction.find().sort({ date: 1 });

    if (transactions.length === 0) {
      return res.status(200).json({
        message: "No transaction data available for analysis",
        anomalies: []
      });
    }

    // 2. Format data for ML service
    const formattedData = transactions.map(t => ({
      date: t.date,
      amount: t.amount,
      type: t.type
    }));

    // 3. Send to Python API (Port 5001)
    try {
      console.log("Sending to ML:", formattedData);
      
      const mlResponse = await axios.post('http://localhost:5001/anomaly', { transactions: formattedData }, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log("ML Response Received:", mlResponse.status);
      let results = mlResponse.data;

      // 4. Advanced Analytics: Calculate Severity and Explanations
      const incomeTx = results.filter(t => t.type === 'income');
      const expenseTx = results.filter(t => t.type === 'expense');

      const calcMean = (arr) => arr.length > 0 ? arr.reduce((acc, curr) => acc + curr.amount, 0) / arr.length : 0;
      
      const incomeMean = calcMean(incomeTx);
      const expenseMean = calcMean(expenseTx);

      results = results.map(t => {
        if (t.anomaly === 1) {
          const mean = t.type === 'income' ? incomeMean : expenseMean;
          const ratio = mean > 0 ? t.amount / mean : 1;
          
          let severity = "Low";
          let explanation = "";

          if (t.type === 'expense') {
            if (ratio >= 2) severity = "High";
            else if (ratio >= 1.5) severity = "Medium";
            explanation = `Expense is ${ratio.toFixed(1)}x higher than average (₹${Math.round(mean)})`;
          } else {
            const dropPercent = mean > 0 ? ((mean - t.amount) / mean) * 100 : 0;
            if (dropPercent >= 50) severity = "High";
            else if (dropPercent >= 30) severity = "Medium";
            explanation = `Income dropped by ${Math.round(dropPercent)}% below average (₹${Math.round(mean)})`;
          }

          return { ...t, severity, explanation };
        }
        return { ...t, severity: "Normal", explanation: "Consistent with typical patterns" };
      });

      // Define 'anomalies' BEFORE using it in the Decision Engine
      const anomalies = results.filter(r => r.anomaly === 1);

      // 5. AI Decision Engine
      const highSeverity = anomalies.filter(a => a.severity === 'High');
      const medSeverity = anomalies.filter(a => a.severity === 'Medium');
      const incomeAnomalies = anomalies.filter(a => a.type === 'income');
      const expenseAnomalies = anomalies.filter(a => a.type === 'expense');

      // AI Summary
      let aiSummary = "Your financial patterns are generally stable. No major risks detected.";
      if (anomalies.length > 0) {
        if (highSeverity.length > 0) {
          aiSummary = `Urgent: ${highSeverity.length} high-severity deviations detected. Portions of your cashflow show extreme volatility.`;
        } else if (incomeAnomalies.length > 0) {
          aiSummary = "Warning: Unusual drops in revenue detected. Your income streams may be inconsistent.";
        } else {
          aiSummary = "Caution: Minor irregularities found in spending patterns. Manual review recommended.";
        }
      }

      // Risk Score (0-100)
      let riskVal = (highSeverity.length * 30) + (medSeverity.length * 20) + (anomalies.length * 10);
      const riskScore = Math.min(riskVal, 100);
      let riskLevel = "Low";
      if (riskScore >= 70) riskLevel = "High";
      else if (riskScore >= 30) riskLevel = "Medium";

      // Recommendation Engine
      const recommendations = [];
      if (expenseAnomalies.length > 0) {
        recommendations.push("Review high-value expense spikes and consider vendor renegotiation.");
        recommendations.push("Implement stricter approval workflows for non-recurring expenses.");
      }
      if (incomeAnomalies.length > 0) {
        recommendations.push("Investigate specific revenue drops and follow up on delayed receivables.");
        recommendations.push("Analyze sales conversion trends to identify the root cause of income dips.");
      }
      if (anomalies.length === 0) {
        recommendations.push("Continue maintaining current financial discipline.");
      }

      // Trend Insight
      let trendInsight = "All recent transactions align with your 30-day historical baseline.";
      if (anomalies.length > 0) {
        const last = anomalies[anomalies.length - 1];
        const mean = last.type === 'income' ? incomeMean : expenseMean;
        const ratio = mean > 0 ? (last.amount / mean).toFixed(1) : 1;
        
        if (last.type === 'expense') {
          trendInsight = `Current spending spike is ${ratio}x higher than your usual average of ₹${Math.round(mean)}.`;
        } else {
          const drop = mean > 0 ? (((mean - last.amount) / mean) * 100).toFixed(0) : 0;
          trendInsight = `Revenue has plummeted by ${drop}% below your typical baseline of ₹${Math.round(mean)}.`;
        }
      }

      // Return unified response
      res.status(200).json({
        message: anomalies.length > 0 ? "Anomalies detected" : "No anomalies detected",
        anomalies: results,
        count: anomalies.length,
        aiSummary,
        riskScore,
        riskLevel,
        recommendations,
        trendInsight
      });

    } catch (error) {
      console.error("ML Pipeline Error:", error.message);
      res.status(503).json({
        message: "ML Service is currently unavailable",
        error: error.message
      });
    }

  } catch (error) {
    console.error("Internal Controller Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
