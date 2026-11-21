// server/models/maintenanceModel.js
const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'Please describe the issue'],
    },

    photo: {
      type: String,
      default: '',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
    },

    // Landlord's internal note / update message
    landlordNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaintenanceRequest', maintenanceSchema);
