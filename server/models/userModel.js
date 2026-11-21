// server/models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['landlord', 'tenant']
  },
  // Kenyan phone number — used for M-Pesa STK Push and WhatsApp receipts
  // Store as 07xx or 254xxx or +254xxx; normalised at point of use
  phone: { type: String, default: '' },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;