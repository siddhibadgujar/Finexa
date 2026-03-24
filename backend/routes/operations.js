const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Operation = require('../models/Operation');

// @route   GET /api/operations
// @desc    Get all operational data for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const operations = await Operation.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(operations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
// @route   POST /api/operations
// @desc    Add new operational data for logged in user
router.post('/', auth, async (req, res) => {
  try {
    const { unitsProduced, itemsSold, ordersReceived, ordersCompleted, pendingOrders, inventoryLevel, deliveryTimeAvg, returns, defects } = req.body;
    
    const newOperation = new Operation({
      userId: req.user.id,
      metrics: {
        unitsProduced, itemsSold, ordersReceived, ordersCompleted, pendingOrders, inventoryLevel, deliveryTimeAvg, returns, defects
      }
    });

    const operation = await newOperation.save();
    res.json(operation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/operations/analysis
// @desc    Get operational analysis based on rules
router.get('/analysis', auth, async (req, res) => {
  try {
    const operations = await Operation.find({ userId: req.user.id }).sort({ date: -1 }).limit(1);
    
    if (!operations || operations.length === 0) {
      return res.json({
        performance: null,
        metrics: null,
        insights: [{ message: "No operational data available", type: "info" }]
      });
    }

    const todayOp = operations[0];

    const { 
      ordersReceived = 0, 
      ordersCompleted = 0, 
      pendingOrders = 0, 
      deliveryTimeAvg = 0, 
      defects = 0 
    } = todayOp.metrics || {};

    const completionRate = ordersReceived > 0 ? (ordersCompleted / ordersReceived) : 0;
    const pendingRatio = ordersReceived > 0 ? (pendingOrders / ordersReceived) : 0;
    const defectRate = ordersCompleted > 0 ? (defects / ordersCompleted) : 0;

    let insights = [];

    // Independent checks triggering array push
    if (pendingRatio > 0.4) {
      insights.push({ message: "⚠️ Pending workload is increasing", type: "warning", priority: 2 });
    }

    if (ordersReceived > 0 && completionRate < 0.6) {
      insights.push({ message: "⚠️ Low completion efficiency", type: "warning", priority: 2 });
    }

    if (deliveryTimeAvg > 3) {
      insights.push({ message: "⚠️ Delivery is slow", type: "warning", priority: 2 });
    }

    if (ordersCompleted > 0 && defectRate > 0.1) {
      insights.push({ message: "⚠️ Quality issues detected", type: "warning", priority: 2 });
    }

    // Default insight exclusively when passing all boundaries
    if (insights.length === 0) {
      insights.push({ message: "✅ Operations running smoothly", type: "positive", priority: 4 });
    }

    insights.sort((a, b) => a.priority - b.priority);
    const finalInsights = insights.slice(0, 5).map(i => ({ message: i.message, type: i.type }));

    res.json({
      performance: null,
      metrics: todayOp.metrics,
      insights: finalInsights
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
