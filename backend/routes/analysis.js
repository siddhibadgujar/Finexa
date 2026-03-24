const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analysisController = require('../controllers/analysisController');

// @route   GET /api/analysis
// @desc    Get complete business analysis intelligence
router.get('/', auth, analysisController.getAnalysis);

// @route   GET /api/analysis/trends
// @desc    Get 7-day comparative dashboard insights
router.get('/trends', auth, analysisController.getDashboardTrends);

// @route   GET /api/analysis/operations
// @desc    Get 7-day comparative operational patterns
router.get('/operations', auth, analysisController.getOperationalPatterns);

module.exports = router;
