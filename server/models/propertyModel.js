// server/models/propertyModel.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // The landlord who owns this listing
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
    required: [true, 'Please add a description'],
  },

  address: {
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    country: { type: String, required: true, default: 'Kenya' },
  },

  rentPerMonth: {
    type: Number,
    required: [true, 'Please add a monthly rent amount'],
  },

  bedrooms:  { type: Number, required: true },
  bathrooms: { type: Number, required: true },

  propertyType: {
    type: String,
    required: true,
    enum: ['apartment', 'house', 'studio', 'bedsitter', 'commercial'],
  },

  isAvailable: {
    type: Boolean,
    default: true,  // Listed as available by default
  },

  images: [String], // Array of image URLs

  // Amenities / features (e.g. ['Air Conditioning', 'Parking', 'WiFi'])
  features: [String],

}, {
  timestamps: true,
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
