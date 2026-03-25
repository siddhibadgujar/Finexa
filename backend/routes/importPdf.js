const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// ─── Multer: memory storage, 5 MB limit, PDF only ───────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// ─── Auto-categorisation ─────────────────────────────────────
const categorise = (description = '') => {
  const d = description.toLowerCase();
  if (/swiggy|zomato|food|restaurant|cafe|hotel|domino|mcdonald|kfc/.test(d)) return 'Food';
  if (/uber|ola|rapido|auto|taxi|cab|petrol|fuel|diesel/.test(d))             return 'Transport';
  if (/salary|sal|payroll|ctc|stipend/.test(d))                               return 'Salary';
  if (/rent|landlord|pg|hostel/.test(d))                                      return 'Rent';
  if (/electricity|electric|eb |msedcl|bses|bescom|tneb|light bill/.test(d))  return 'Utilities';
  if (/amazon|flipkart|myntra|meesho|ajio|shopping|mart/.test(d))             return 'Shopping';
  if (/insurance|lic|premium|policy/.test(d))                                 return 'Insurance';
  if (/hospital|clinic|pharmacy|medical|doctor|health/.test(d))               return 'Healthcare';
  if (/school|tuition|college|fees|education/.test(d))                        return 'Education';
  if (/recharge|jio|airtel|vi |bsnl|broadband|internet/.test(d))              return 'Telecom';
  if (/credit|neft|imps|upi|transfer|received|deposit/.test(d))               return 'Income';
  return 'Others';
};

// ─── POST /api/transactions/import-pdf ───────────────────────
router.post('/import-pdf', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file provided' });
    }

    // 1. Forward PDF to ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'statement.pdf',
      contentType: 'application/pdf'
    });

    let mlData;
    try {
      const mlRes = await axios.post(`${mlServiceUrl}/parse-pdf`, form, {
        headers: form.getHeaders(),
        timeout: 30000
      });
      mlData = mlRes.data;
    } catch (mlErr) {
      const mlMsg = mlErr.response?.data?.error || mlErr.message;
      return res.status(502).json({ message: `ML service error: ${mlMsg}` });
    }

    if (!Array.isArray(mlData) || mlData.length === 0) {
      return res.status(422).json({
        message: 'No transactions could be extracted from this PDF. Please ensure it is a bank statement.'
      });
    }

    // 2. Convert ML output → Transaction documents
    const userId = req.user.id;
    let imported = 0;
    let skipped = 0;

    for (const entry of mlData) {
      const { date, description, debit, credit } = entry;

      // Determine type and amount
      const isCredit = credit && credit > 0;
      const isDebit  = debit  && debit  > 0;
      if (!isCredit && !isDebit) continue;

      const type   = isCredit ? 'income' : 'expense';
      const amount = isCredit ? credit : debit;
      const category = categorise(description);

      // Parse date safely
      const txDate = date ? new Date(date) : new Date();
      if (isNaN(txDate.getTime())) continue;

      // 3. Duplicate check: same userId + type + amount + date (day precision)
      const dayStart = new Date(txDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(txDate); dayEnd.setHours(23, 59, 59, 999);

      const exists = await Transaction.findOne({
        userId,
        type,
        amount,
        date: { $gte: dayStart, $lte: dayEnd }
      });

      if (exists) {
        skipped++;
        continue;
      }

      // 4. Save new transaction
      const tx = new Transaction({
        userId,
        type,
        amount,
        category,
        date: txDate
      });
      await tx.save();
      imported++;
    }

    return res.status(200).json({
      message: `Transactions imported successfully`,
      count: imported,
      skipped
    });

  } catch (err) {
    console.error('Import PDF Error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum allowed size is 5 MB.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
