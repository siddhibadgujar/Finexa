const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  businessType: { 
    type: String, 
    enum: [
      "Retail / E-commerce",
      "Manufacturing",
      "Service Business",
      "Food & Restaurant",
      "Wholesale / Distribution",
      "Freelancer / Individual"
    ], 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
