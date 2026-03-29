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
router.post('/import-pdf', auth, (req, res, next) => {
  // If it's a multipart request (file upload), use multer
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return upload.single('file')(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    let rawTransactions = [];

    // 1. Check if transactions are provided directly in request body
    if (req.body.transactions && Array.isArray(req.body.transactions)) {
      rawTransactions = req.body.transactions;
    } 
    // 2. Otherwise, check if a file was uploaded to be parsed
    else if (req.file) {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'statement.pdf',
        contentType: 'application/pdf'
      });

      try {
        const mlRes = await axios.post(`${mlServiceUrl}/parse-pdf`, form, {
          headers: form.getHeaders(),
          timeout: 45000
        });
        rawTransactions = mlRes.data;
      } catch (mlErr) {
        const mlMsg = mlErr.response?.data?.error || mlErr.message;
        return res.status(502).json({ message: `ML service error: ${mlMsg}` });
      }
    } else {
      return res.status(400).json({ message: 'No transactions or PDF file provided' });
    }

    if (!Array.isArray(rawTransactions) || rawTransactions.length === 0) {
      return res.status(422).json({
        message: 'No transactions found to import.'
      });
    }

    // 3. Convert input data to Transaction documents
    const userId = req.user.id;
    let imported = 0;
    let skipped = 0;

    for (const entry of rawTransactions) {
      // Handle both formats: 
      // A) { date, description, debit, credit } -> From ML parse-pdf
      // B) { date, description, amount, type, category } -> From ML analyze-statement
      let { date, description, debit, credit, amount, type, category } = entry;

      let finalType;   // 'income' or 'expense'
      let finalAmount;
      let finalCategory;

      if (type && amount !== undefined) {
        // Format B
        finalType = (type === 'credit' || type === 'income') ? 'income' : 'expense';
        finalAmount = Number(amount);
        finalCategory = category || categorise(description);
      } else {
        // Format A
        const isCredit = credit && Number(credit) > 0;
        const isDebit  = debit  && Number(debit)  > 0;
        if (!isCredit && !isDebit) continue;

        finalType   = isCredit ? 'income' : 'expense';
        finalAmount = isCredit ? Number(credit) : Number(debit);
        finalCategory = categorise(description);
      }

      // Parse date safely
      const txDate = date ? new Date(date) : new Date();
      if (isNaN(txDate.getTime())) continue;

      // 4. Duplicate check: same userId + type + amount + date (day precision)
      const dayStart = new Date(txDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(txDate); dayEnd.setHours(23, 59, 59, 999);

      const exists = await Transaction.findOne({
        userId,
        type: finalType,
        amount: finalAmount,
        date: { $gte: dayStart, $lte: dayEnd },
        description: description // Added description for better uniqueness
      });

      if (exists) {
        skipped++;
        continue;
      }

      // 5. Save new transaction
      const tx = new Transaction({
        userId,
        type: finalType,
        amount: finalAmount,
        category: finalCategory,
        date: txDate,
        description: description
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
    console.error('Import Error:', err.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ─── POST /api/transactions/analyze-statement ──────────────────
// Sends the PDF to the ML service and returns a full analysis
// JSON (totalReceived, totalSpent, categories, people, transactions).
// Does NOT save anything to the database — analysis only.
router.post('/analyze-statement', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file provided' });
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'statement.pdf',
      contentType: 'application/pdf'
    });

    let analysisData;
    try {
      const mlRes = await axios.post(`${mlServiceUrl}/analyze-statement`, form, {
        headers: form.getHeaders(),
        timeout: 60000
      });
      analysisData = mlRes.data;
    } catch (mlErr) {
      const mlMsg = mlErr.response?.data?.error || mlErr.message;
      return res.status(502).json({ message: `Analysis service error: ${mlMsg}` });
    }

    return res.status(200).json(analysisData);

  } catch (err) {
    console.error('Analyze Statement Error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum allowed size is 5 MB.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
