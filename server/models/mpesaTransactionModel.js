// server/models/mpesaTransactionModel.js
// One document per M-Pesa Paybill payment that Safaricom tells us about.
// Stored before anything else happens, so no payment is ever lost, and
// TransID is unique, so a Safaricom retry never records a payment twice.
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    channel: { type: String, default: 'sms' },
    status:  { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    to:      { type: String },
    message: { type: String },
    error:   { type: String },
    sentAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const mpesaTransactionSchema = new mongoose.Schema(
  {
    transId:    { type: String, required: true, unique: true }, // M-Pesa receipt number, e.g. "SKL7X2ABC1"
    transType:  { type: String },
    amount:     { type: Number, required: true },
    billRef:    { type: String, default: '' },  // Account Number exactly as the payer typed it
    accountKey: { type: String, default: '' },  // billRef normalised for matching
    msisdn:     { type: String, default: '' },  // Safaricom masks or hashes this for Paybill payments
    payerName:  { type: String, default: '' },
    shortcode:  { type: String, default: '' },
    transTime:  { type: Date },
    source:     { type: String, enum: ['c2b', 'simulator'], default: 'c2b' },

    // received -> processing -> matched | unmatched
    // 'processing' is claimed in one atomic database step, so a Safaricom retry that
    // arrives while the first delivery is still being handled can never apply it twice.
    status: { type: String, enum: ['received', 'processing', 'matched', 'unmatched'], default: 'received' },
    tenancy:  { type: mongoose.Schema.Types.ObjectId, ref: 'RentalApplication' },
    tenant:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
    // Money left over after every month up to the allocation limit was paid
    unallocated: { type: Number, default: 0 },

    receipts: [receiptSchema],
    raw: { type: Object }, // the original Safaricom payload, for audits
  },
  { timestamps: true }
);

mpesaTransactionSchema.index({ landlord: 1, createdAt: -1 });
mpesaTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MpesaTransaction', mpesaTransactionSchema);
