const express = require('express');
const router = express.Router();
const Payment = require('../models/paymentModel');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// -------------------------------------------------------
// @route   POST /api/payments
// @desc    Landlord creates a pending rent payment record
// @access  Private — landlords only
// -------------------------------------------------------
router.post('/', protect, restrictTo('landlord'), async (req, res) => {
  const { propertyId, tenantId, amount, month, notes } = req.body;
  try {
    const payment = await Payment.create({
      property: propertyId,
      tenant:   tenantId,
      landlord: req.user._id,
      amount,
      month:    new Date(month),
      notes,
    });
    const populated = await payment.populate([
      { path: 'property', select: 'title address' },
      { path: 'tenant',   select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   GET /api/payments
// @desc    Get all payment records for the landlord
// @access  Private — landlords only
// -------------------------------------------------------
router.get('/', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const payments = await Payment.find({ landlord: req.user._id })
      .populate('property', 'title address rentPerMonth')
      .populate('tenant', 'name email')
      .sort({ month: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   PUT /api/payments/:id/mark-paid
// @desc    Mark a payment as paid
// @access  Private — landlords only
// -------------------------------------------------------
router.put('/:id/mark-paid', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, landlord: req.user._id });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    const populated = await payment.populate([
      { path: 'property', select: 'title address rentPerMonth' },
      { path: 'tenant',   select: 'name email' },
    ]);
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
// @route   DELETE /api/payments/:id
// @desc    Delete a payment record
// @access  Private — landlords only
// -------------------------------------------------------
// @route   GET /api/payments/my-payments
// @desc    Get all payment records for the logged-in tenant
// @access  Private — tenants only
// -------------------------------------------------------
router.get('/my-payments', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ tenant: req.user._id })
      .populate('property', 'title address rentPerMonth')
      .populate('landlord', 'name email')
      .sort({ month: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -------------------------------------------------------
router.delete('/:id', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, landlord: req.user._id });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
