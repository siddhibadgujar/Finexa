const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// @route   GET /api/report/download
// @desc    Download strategic business report PDF
router.get('/download', auth, reportController.downloadReport);

module.exports = router;
