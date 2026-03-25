const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');
const auth = require('../middleware/auth');

// Endpoint: GET /api/anomaly
// Logic: Fetch user-specific transactions, send to ML service, return results
router.get('/', auth, anomalyController.detectAnomalies);

module.exports = router;
