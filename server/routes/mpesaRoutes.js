// server/routes/mpesaRoutes.js
const express   = require('express');
const router    = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { stkPush, registerC2BUrls } = require('../services/mpesa');
const Payment   = require('../models/paymentModel');
const Property  = require('../models/propertyModel');
const User      = require('../models/userModel');
const RentalApp = require('../models/rentalApplicationModel');
const { sendWhatsApp } = require('../services/whatsapp');

// ── POST /api/mpesa/stkpush ──────────────────────────────────────────────────
// Tenant initiates a rent payment — triggers M-Pesa STK Push to their phone
// Body: { propertyId, amount }   (phone comes from logged-in tenant's profile)
// Access: Private (tenant)
router.post('/stkpush', protect, async (req, res) => {
  const { propertyId, amount } = req.body;

  if (!propertyId || !amount) {
    return res.status(400).json({ message: 'propertyId and amount are required' });
  }

  const tenant = await User.findById(req.user._id);
  if (!tenant.phone) {
    return res.status(400).json({ message: 'Please add a phone number to your profile before paying via M-Pesa' });
  }

  const property = await Property.findById(propertyId);
  if (!property) return res.status(404).json({ message: 'Property not found' });

  try {
    const result = await stkPush({
      phone:       tenant.phone.replace(/\D/g, '').replace(/^0/, '254'),
      amount,
      reference:   `RENT-${propertyId.toString().slice(-6)}`,
      description: 'Rent Payment',
    });

    // Store the CheckoutRequestID so we can match the callback later
    res.json({
      message:           'STK Push sent! Check your phone and enter your M-Pesa PIN.',
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    });
  } catch (err) {
    console.error('[STK Push]', err.response?.data || err.message);
    res.status(500).json({ message: 'M-Pesa request failed', detail: err.response?.data });
  }
});

// ── POST /api/mpesa/callback ─────────────────────────────────────────────────
// Safaricom calls this after the tenant completes (or cancels) the STK Push
// Access: Public (Safaricom server) — no auth header
router.post('/callback', async (req, res) => {
  // Always respond 200 immediately so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const body     = req.body?.Body?.stkCallback;
  const resultCode = body?.ResultCode;

  if (resultCode !== 0) {
    console.log('[M-Pesa Callback] Transaction cancelled/failed:', body?.ResultDesc);
    return;
  }

  // Extract metadata from callback
  const items   = body?.CallbackMetadata?.Item || [];
  const get     = (name) => items.find(i => i.Name === name)?.Value;

  const amount     = get('Amount');
  const mpesaRef   = get('MpesaReceiptNumber');
  const phone      = String(get('PhoneNumber') || '');
  const rawAccount = get('AccountReference') || '';          // e.g. "RENT-abc123"
  const propertyShortId = rawAccount.replace('RENT-', '');  // last 6 chars of propertyId

  console.log(`[M-Pesa Callback] Paid KES ${amount} from ${phone} — ref: ${mpesaRef}`);

  try {
    // 1. Find tenant by phone number (normalise to match stored value)
    const normalised = phone.replace(/^254/, '0'); // store as 07xx in DB
    const tenant = await User.findOne({
      $or: [{ phone }, { phone: normalised }, { phone: `+${phone}` }],
    });

    if (!tenant) {
      console.warn('[M-Pesa Callback] No tenant found for phone:', phone);
      return;
    }

    // 2. Find property — look for an approved application matching this tenant
    const application = await RentalApp.findOne({ tenant: tenant._id, status: 'approved' });
    if (!application) {
      console.warn('[M-Pesa Callback] No approved tenancy for tenant:', tenant._id);
      return;
    }

    const property = await Property.findById(application.property);
    if (!property) return;

    // 3. Create payment record for current month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    await Payment.findOneAndUpdate(
      { tenant: tenant._id, property: property._id, month: monthStart },
      {
        landlord: property.landlord,
        amount,
        status:   'paid',
        paidAt:   new Date(),
        notes:    `Auto-recorded via M-Pesa STK Push. Ref: ${mpesaRef}`,
      },
      { upsert: true, new: true }
    );

    console.log(`[M-Pesa Callback] ✅ Payment recorded for ${tenant.name} — ${property.title}`);

    // 4. Send WhatsApp confirmation to tenant (if they have a phone)
    if (tenant.phone) {
      const msg = [
        `✅ *Payment Confirmed — MyRentPal*`,
        ``,
        `Hi ${tenant.name}, your rent payment has been received!`,
        `🏠 Property : ${property.title}`,
        `💰 Amount   : KES ${Number(amount).toLocaleString()}`,
        `📋 M-Pesa Ref: ${mpesaRef}`,
        `📅 Month    : ${monthStart.toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}`,
        ``,
        `Your landlord (${property.landlord}) has been notified.`,
      ].join('\n');

      await sendWhatsApp(tenant.phone, msg).catch(e =>
        console.error('[WhatsApp] Could not send confirmation:', e.message)
      );
    }
  } catch (err) {
    console.error('[M-Pesa Callback] Error processing:', err.message);
  }
});

// ── POST /api/mpesa/c2b/validate ─────────────────────────────────────────────
// Safaricom calls this before processing a C2B (paybill) transaction
// Return 0 to accept, any other code to reject
router.post('/c2b/validate', (req, res) => {
  console.log('[C2B Validate]', req.body);
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
});

// ── POST /api/mpesa/c2b/confirm ──────────────────────────────────────────────
// Safaricom calls this when a C2B paybill payment completes
router.post('/c2b/confirm', async (req, res) => {
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });

  const { TransactionAmount, MSISDN: phone, BillRefNumber } = req.body;
  console.log(`[C2B Confirm] KES ${TransactionAmount} from ${phone} — ref: ${BillRefNumber}`);

  try {
    const normalised = String(phone).replace(/^254/, '0');
    const tenant = await User.findOne({
      $or: [{ phone }, { phone: normalised }, { phone: `+${phone}` }],
    });
    if (!tenant) return console.warn('[C2B] No tenant for phone:', phone);

    const application = await RentalApp.findOne({ tenant: tenant._id, status: 'approved' });
    if (!application) return;

    const property = await Property.findById(application.property);
    if (!property) return;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    await Payment.findOneAndUpdate(
      { tenant: tenant._id, property: property._id, month: monthStart },
      {
        landlord: property.landlord,
        amount:   Number(TransactionAmount),
        status:   'paid',
        paidAt:   new Date(),
        notes:    `Auto-recorded via C2B Paybill. Ref: ${BillRefNumber}`,
      },
      { upsert: true, new: true }
    );

    console.log(`[C2B Confirm] ✅ Recorded KES ${TransactionAmount} for ${tenant.name}`);
  } catch (err) {
    console.error('[C2B Confirm] Error:', err.message);
  }
});

// ── POST /api/mpesa/register-urls ────────────────────────────────────────────
// One-time setup: tells Safaricom where to send C2B callbacks
// Access: Private (landlord/admin action)
router.post('/register-urls', protect, async (req, res) => {
  try {
    const result = await registerC2BUrls();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to register C2B URLs', detail: err.response?.data });
  }
});

module.exports = router;
