const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analysisController = require('../controllers/analysisController');

// @route   GET /api/analysis/trends
// @desc    Get business trends data
router.get('/trends', auth, analysisController.getTrends);

module.exports = router;
