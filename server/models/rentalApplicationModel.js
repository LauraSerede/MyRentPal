// server/models/rentalApplicationModel.js
const mongoose = require('mongoose');

const rentalApplicationSchema = new mongoose.Schema({
  // The tenant submitting the application
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // The property being applied for
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },

  // The landlord who owns the property (stored for easy querying)
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Optional message from the tenant to the landlord
  message: {
    type: String,
    default: '',
  },

  // Optional reply message from the landlord
  landlordMessage: {
    type: String,
    default: '',
  },

  // Landlord can approve or reject; starts as pending
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

}, {
  timestamps: true,
});

// A tenant can only apply once per property
rentalApplicationSchema.index({ tenant: 1, property: 1 }, { unique: true });

const RentalApplication = mongoose.model('RentalApplication', rentalApplicationSchema);

module.exports = RentalApplication;
