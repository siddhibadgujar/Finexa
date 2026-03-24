const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Operational Data (Optional)
  unitsProduced: { type: Number, default: 0 },
  itemsSold: { type: Number, default: 0 },
  ordersReceived: { type: Number, default: 0 },
  ordersCompleted: { type: Number, default: 0 },
  pendingOrders: { type: Number, default: 0 },
  inventoryLevel: { type: Number, default: 0 },
  deliveryTimeAvg: { type: Number, default: 0 },
  returns: { type: Number, default: 0 },
  defects: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
