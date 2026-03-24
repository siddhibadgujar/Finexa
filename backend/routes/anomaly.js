const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if authentication is needed

// Endpoint: GET /api/anomaly
// Logic: Fetch transactions, send to ML service, return results
router.get('/', anomalyController.detectAnomalies);

module.exports = router;
