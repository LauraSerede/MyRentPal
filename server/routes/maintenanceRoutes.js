// server/routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const MaintenanceRequest = require('../models/maintenanceModel');
const RentalApplication  = require('../models/rentalApplicationModel');
const { protect } = require('../middleware/authMiddleware');

// ── POST /api/maintenance ─────────────────────────────────────────
// Tenant submits a new maintenance request.
// Requires an approved tenancy on that property.
router.post('/', protect, async (req, res) => {
  try {
    const { propertyId, title, description, photo, priority } = req.body;

    if (!propertyId || !title || !description) {
      return res.status(400).json({ message: 'propertyId, title and description are required' });
    }

    // Verify tenant has an approved tenancy on this property
    const tenancy = await RentalApplication.findOne({
      tenant:   req.user._id,
      property: propertyId,
      status:   'approved',
    });

    if (!tenancy) {
      return res.status(403).json({ message: 'You need an approved tenancy for this property to submit a maintenance request' });
    }

    const request = await MaintenanceRequest.create({
      tenant:      req.user._id,
      property:    propertyId,
      landlord:    tenancy.landlord,
      title:       title.trim(),
      description,
      photo:       photo || '',
      priority:    priority || 'medium',
    });

    const populated = await MaintenanceRequest.findById(request._id)
      .populate('property', 'title address rentPerMonth images')
      .populate('tenant',   'name email')
      .populate('landlord', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/maintenance ──────────────────────────────────────────
// Landlord gets all maintenance requests for their properties.
router.get('/', protect, async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ landlord: req.user._id })
      .populate('property', 'title address rentPerMonth images')
      .populate('tenant',   'name email phone')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/maintenance/my-requests ─────────────────────────────
// Tenant gets their own maintenance requests.
router.get('/my-requests', protect, async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ tenant: req.user._id })
      .populate('property', 'title address rentPerMonth images')
      .populate('landlord', 'name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/maintenance/:id/status ──────────────────────────────
// Landlord updates the status (and optional note) of a request.
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, landlordNote } = req.body;

    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'status must be open, in-progress, or resolved' });
    }

    const update = { status };
    if (landlordNote !== undefined) update.landlordNote = landlordNote;

    const request = await MaintenanceRequest.findOneAndUpdate(
      { _id: req.params.id, landlord: req.user._id },
      update,
      { new: true }
    )
      .populate('property', 'title address')
      .populate('tenant',   'name email');

    if (!request) return res.status(404).json({ message: 'Request not found or not authorised' });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/maintenance/:id ───────────────────────────────────
// Tenant or landlord can delete a request.
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const isOwner =
      request.tenant.toString()   === req.user._id.toString() ||
      request.landlord.toString() === req.user._id.toString();

    if (!isOwner) return res.status(403).json({ message: 'Not authorised' });

    await request.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
