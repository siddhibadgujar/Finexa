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

module.exports = router;
