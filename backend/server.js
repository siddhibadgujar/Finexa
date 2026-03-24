require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/operations', require('./routes/operations'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/report', require('./routes/report'));
app.use('/api/anomaly', require('./routes/anomaly'));
//app.use('/api/chat', require('./routes/chat'));

// Sample Route
app.get('/api/test', (req, res) => {
  res.send('Finexa API working');
});

const PORT = process.env.PORT || 5555;

// Connect to MongoDB before starting server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
