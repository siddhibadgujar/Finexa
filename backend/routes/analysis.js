const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analysisController = require('../controllers/analysisController');

// @route   GET /api/analysis
// @desc    Get complete business analysis intelligence
router.get('/', auth, analysisController.getAnalysis);

module.exports = router;
