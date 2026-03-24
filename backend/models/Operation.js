const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  metrics: {
    unitsProduced: { type: Number, default: 0 },
    itemsSold: { type: Number, default: 0 },
    ordersReceived: { type: Number, default: 0 },
    ordersCompleted: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },
    inventoryLevel: { type: Number, default: 0 },
    deliveryTimeAvg: { type: Number, default: 0 },
    returns: { type: Number, default: 0 },
    defects: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Operation', operationSchema);
