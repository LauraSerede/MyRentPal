const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:   { type: Number, required: true },
    month:    { type: Date, required: true },   // e.g. 2026-02-01 (first day of the month)
    status:   { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt:   { type: Date },
    notes:    { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
