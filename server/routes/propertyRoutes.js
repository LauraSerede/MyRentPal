// server/routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const Property = require('../models/propertyModel');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// -------------------------------------------------------
// @route   POST /api/properties
// @desc    Create a new property listing
// @access  Private — landlords only
// -------------------------------------------------------
router.post('/', protect, restrictTo('landlord'), async (req, res) => {
  const { title, description, address, rentPerMonth, bedrooms, bathrooms, propertyType, images } = req.body;

  try {
    const property = await Property.create({
      landlord: req.user._id, // Comes from the protect middleware
      title,
      description,
      address,
      rentPerMonth,
      bedrooms,
      bathrooms,
      propertyType,
      images,
    });

    res.status(201).json(property);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/properties
// @desc    Get all available property listings (public)
// @access  Public
// -------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    // Support filtering by city, propertyType, or availability via query params
    // e.g. /api/properties?city=Nairobi&propertyType=apartment
    const filter = { isAvailable: true };

    if (req.query.city)         filter['address.city'] = new RegExp(req.query.city, 'i');
    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.maxRent)      filter.rentPerMonth = { $lte: Number(req.query.maxRent) };
    if (req.query.bedrooms)     filter.bedrooms = Number(req.query.bedrooms);

    const properties = await Property.find(filter)
      .populate('landlord', 'name email') // Show landlord's name & email
      .sort({ createdAt: -1 });            // Newest first

    res.json(properties);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/properties/my-listings
// @desc    Get all listings created by the logged-in landlord
// @access  Private — landlords only
// -------------------------------------------------------
router.get('/my-listings', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.user._id }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/properties/:id
// @desc    Get a single property by ID
// @access  Public
// -------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('landlord', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   PUT /api/properties/:id
// @desc    Update a property listing
// @access  Private — the landlord who owns this listing only
// -------------------------------------------------------
router.put('/:id', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Make sure the logged-in landlord owns this listing
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,           // Return the updated document
      runValidators: true, // Re-run schema validators on update
    });

    res.json(updated);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   DELETE /api/properties/:id
// @desc    Delete a property listing
// @access  Private — the landlord who owns this listing only
// -------------------------------------------------------
router.delete('/:id', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Make sure the logged-in landlord owns this listing
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await property.deleteOne();

    res.json({ message: 'Property listing removed' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
