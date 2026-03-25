const express = require('express');
const router  = express.Router();
const anomalyController = require('../controllers/anomalyController');
const auth = require('../middleware/auth');

// GET  /api/anomaly          — detect anomalies for logged-in user
router.get('/',             auth, anomalyController.detectAnomalies);

// PUT  /api/anomaly/resolve/:id — mark a specific anomaly as resolved
router.put('/resolve/:id',  auth, anomalyController.resolveAnomaly);

module.exports = router;
