// server/routes/rentalApplicationRoutes.js
const express = require('express');
const router = express.Router();
const RentalApplication = require('../models/rentalApplicationModel');
const Property = require('../models/propertyModel');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// -------------------------------------------------------
// @route   POST /api/applications/:propertyId
// @desc    Tenant submits a rental application for a property
// @access  Private — tenants only
// -------------------------------------------------------
router.post('/:propertyId', protect, restrictTo('tenant'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (!property.isAvailable) {
      return res.status(400).json({ message: 'This property is no longer available' });
    }

    // Prevent a tenant from applying to their own... (safety check)
    // and prevent duplicate applications (handled by unique index, but give a clear error)
    const existing = await RentalApplication.findOne({
      tenant: req.user._id,
      property: req.params.propertyId,
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already applied for this property' });
    }

    const application = await RentalApplication.create({
      tenant: req.user._id,
      property: req.params.propertyId,
      landlord: property.landlord,
      message: req.body.message || '',
    });

    res.status(201).json(application);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/applications/my-applications
// @desc    Tenant views all their submitted applications
// @access  Private — tenants only
// -------------------------------------------------------
router.get('/my-applications', protect, restrictTo('tenant'), async (req, res) => {
  try {
    const applications = await RentalApplication.find({ tenant: req.user._id })
      .populate('property', 'title address rentPerMonth propertyType isAvailable')
      .populate('landlord', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/applications/received
// @desc    Landlord views all applications received for their properties
// @access  Private — landlords only
// -------------------------------------------------------
router.get('/received', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const applications = await RentalApplication.find({ landlord: req.user._id })
      .populate('property', 'title address rentPerMonth')
      .populate('tenant', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   PUT /api/applications/:id/status
// @desc    Landlord approves or rejects an application
// @access  Private — the landlord who received the application only
// -------------------------------------------------------
router.put('/:id/status', protect, restrictTo('landlord'), async (req, res) => {
  const { status, landlordMessage } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "rejected"' });
  }

  try {
    const application = await RentalApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Only the landlord who received this application can update it
    if (application.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    application.status = status;
    if (landlordMessage) application.landlordMessage = landlordMessage;
    await application.save();

    // If approved, mark the property as no longer available
    if (status === 'approved') {
      await Property.findByIdAndUpdate(application.property, { isAvailable: false });
    }

    res.json({ message: `Application ${status}`, application });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   DELETE /api/applications/:id
// @desc    Tenant withdraws a pending application
// @access  Private — the tenant who submitted it only
// -------------------------------------------------------
router.delete('/:id', protect, restrictTo('tenant'), async (req, res) => {
  try {
    const application = await RentalApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to withdraw this application' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending applications can be withdrawn' });
    }

    await application.deleteOne();

    res.json({ message: 'Application withdrawn' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
