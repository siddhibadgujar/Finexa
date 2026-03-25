const mongoose = require('mongoose');

const anomalyResolutionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String, required: true },
  actionTaken:   { type: String, default: '' },
  resolvedAt:    { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate resolutions for the same tx
anomalyResolutionSchema.index({ userId: 1, transactionId: 1 }, { unique: true });

module.exports = mongoose.model('AnomalyResolution', anomalyResolutionSchema);
