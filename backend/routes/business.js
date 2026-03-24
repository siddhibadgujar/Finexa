const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const Transaction = require('../models/Transaction');
const Operation = require('../models/Operation');

// @route   POST /api/business/setup
// @desc    Complete business setup (Info, Income, Operations)
router.post('/setup', auth, async (req, res) => {
  const { businessInfo, income, operations } = req.body;
  const userId = req.user.id;

  console.log("Setup request body:", req.body);

  try {
    // 1. Save Business Info
    const business = new Business({
      userId,
      businessName: businessInfo?.businessName,
      businessType: businessInfo?.businessType
    });
    await business.save();

    // 2. Save Initial Income (Transactions)
    if (income && Array.isArray(income) && income.length > 0) {
      const txsToSave = income.map(tx => ({ 
        ...tx, 
        userId,
        type: 'income' // Force type as income
      }));
      await Transaction.insertMany(txsToSave);
    }

    // 3. Save Initial Operational Data
    if (operations) {
      const operation = new Operation({
        userId,
        date: operations.date || new Date(),
        metrics: {
          ordersReceived: Number(operations.metrics?.ordersReceived) || 0,
          ordersCompleted: Number(operations.metrics?.ordersCompleted) || 0,
          inventoryLevel: Number(operations.metrics?.inventoryLevel) || 0,
          unitsProduced: Number(operations.metrics?.unitsProduced) || 0
        }
      });
      await operation.save();
    }

    // IMPORTANT: Return business object so frontend can store it in localStorage
    res.status(201).json({ 
      message: 'Business setup complete',
      business 
    });
  } catch (err) {
    console.error("Setup Error:", err.message);
    res.status(500).json({ message: 'Server error during setup', error: err.message });
  }
});

// @route   GET /api/business/me
// @desc    Check if user has a business setup
router.get('/me', auth, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user.id });
    if (business) {
      return res.json({ exists: true, business });
    }
    res.json({ exists: false });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
