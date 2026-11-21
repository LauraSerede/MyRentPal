// server/routes/mpesaRoutes.js
const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { stkPush, registerC2BUrls, simulateC2B } = require('../services/mpesa');
const MpesaTransaction = require('../models/mpesaTransactionModel');
const { recordTransaction, processTransaction, findTenancyByAccount, resendReceipt } = require('../services/mpesaC2B');
const { parseC2B } = require('../services/c2bPayload');
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

// ═════════════════════════════════════════════════════════════════════════════
// C2B (Paybill): tenants pay to the Paybill with their account number, e.g. KIL-A2
// ═════════════════════════════════════════════════════════════════════════════

// Safaricom's callbacks carry no login, so the callback URLs contain a secret
// (MPESA_CALLBACK_SECRET). Requests with a wrong or missing secret get a 404.
function callbackSecretOk(req) {
  const expected = process.env.MPESA_CALLBACK_SECRET;
  const given = String(req.params.secret || '');
  if (!expected || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const simulatorEnabled = () => process.env.MPESA_DEV_SIMULATOR === 'true' && process.env.MPESA_ENV !== 'production';

const populateTx = (query) => query
  .select('-raw')
  .populate('tenant', 'name phone')
  .populate('property', 'title')
  .populate('tenancy', 'accountNumber');

// ── POST /api/mpesa/c2b/validate/:secret ────────────────────────────────────
// Safaricom asks "should I accept this payment?" (only if External Validation is
// enabled on the Paybill). Unknown account numbers are rejected so the payer sees
// an error straight away instead of the money going nowhere.
router.post('/c2b/validate/:secret', async (req, res) => {
  if (!callbackSecretOk(req)) return res.status(404).end();
  try {
    const { accountKey, billRef } = parseC2B(req.body);
    const rejectUnknown = process.env.MPESA_REJECT_UNKNOWN_ACCOUNTS !== 'false';
    if (rejectUnknown && !(await findTenancyByAccount(accountKey))) {
      console.warn(`[C2B Validate] Rejected unknown account "${billRef}"`);
      return res.json({ ResultCode: 'C2B00012', ResultDesc: 'Rejected' }); // invalid account number
    }
    return res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[C2B Validate]', err.message);
    return res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  }
});

// ── POST /api/mpesa/c2b/confirm/:secret ─────────────────────────────────────
// Safaricom says "this payment went through". Store it first, reply, then match it.
router.post('/c2b/confirm/:secret', async (req, res) => {
  if (!callbackSecretOk(req)) return res.status(404).end();
  let recorded;
  try {
    recorded = await recordTransaction(req.body, 'c2b');
  } catch (err) {
    console.error('[C2B Confirm] Could not record:', err.message);
    // Not 200, so Safaricom retries later instead of the payment being lost
    return res.status(500).json({ ResultCode: '1', ResultDesc: 'Temporary error' });
  }
  res.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  processTransaction(recorded.tx).catch((err) => console.error('[C2B Confirm] Processing failed:', err.message));
});

// ── GET /api/mpesa/config ───────────────────────────────────────────────────
// What tenants need to pay, and whether the test simulator is on.
router.get('/config', protect, (req, res) => {
  res.json({
    paybill: process.env.MPESA_SHORTCODE || null,
    environment: process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
    simulator: simulatorEnabled(),
    smsConfigured: Boolean(process.env.AT_API_KEY),
  });
});

// ── GET /api/mpesa/transactions ─────────────────────────────────────────────
// Landlord: payments matched to their tenancies, plus unmatched ones waiting to be assigned.
// (v1 assumes one Paybill for the whole MyRentPal deployment.)
router.get('/transactions', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const txs = await populateTx(MpesaTransaction.find({
      $or: [{ landlord: req.user._id }, { status: { $in: ['unmatched', 'received', 'processing'] } }],
    }))
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(txs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── POST /api/mpesa/transactions/:id/assign ─────────────────────────────────
// Landlord assigns an unmatched payment (e.g. the tenant typed a wrong account number).
// Body: { applicationId }
router.post('/transactions/:id/assign', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const tx = await MpesaTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status !== 'unmatched') return res.status(400).json({ message: 'This payment is already assigned' });

    const tenancy = await RentalApp.findOne({ _id: req.body.applicationId, landlord: req.user._id, status: 'approved' })
      .populate('tenant', 'name phone email')
      .populate('property', 'title rentPerMonth')
      .populate('landlord', 'name');
    if (!tenancy) return res.status(404).json({ message: 'Tenancy not found' });

    const done = await processTransaction(tx, tenancy);
    if (done?.status !== 'matched') return res.status(409).json({ message: 'This payment was just assigned by someone else' });
    res.json(await populateTx(MpesaTransaction.findById(tx._id)));
  } catch (err) {
    console.error('[C2B Assign]', err.message);
    res.status(500).json({ message: 'Could not assign payment' });
  }
});

// ── POST /api/mpesa/transactions/:id/resend-receipt ─────────────────────────
router.post('/transactions/:id/resend-receipt', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const tx = await MpesaTransaction.findOne({ _id: req.params.id, landlord: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    const outcome = await resendReceipt(tx);
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/mpesa/c2b/simulate ────────────────────────────────────────────
// Test a Paybill payment. Body: { accountNumber, amount }
// - MPESA_DEV_SIMULATOR=true: fakes Safaricom's confirmation locally (no keys or internet needed)
// - otherwise, in the sandbox: asks Safaricom's sandbox to send a real test callback
router.post('/c2b/simulate', protect, restrictTo('landlord'), async (req, res) => {
  const amount = Math.round(Number(req.body.amount));
  const accountNumber = String(req.body.accountNumber || '').trim();
  if (!accountNumber || !(amount > 0)) {
    return res.status(400).json({ message: 'accountNumber and a positive amount are required' });
  }
  if (process.env.MPESA_ENV === 'production') {
    return res.status(403).json({ message: 'Simulation is disabled in production' });
  }

  try {
    if (simulatorEnabled()) {
      const kenyaNow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const body = {
        TransactionType: 'Pay Bill',
        TransID: `SIM${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7)}`,
        TransTime: kenyaNow.slice(0, 19).replace(/[-T:]/g, ''),
        TransAmount: String(amount),
        BusinessShortCode: process.env.MPESA_SHORTCODE || '600000',
        BillRefNumber: accountNumber,
        MSISDN: '2547 ***** 123',
        FirstName: 'TEST',
      };
      const { tx } = await recordTransaction(body, 'simulator');
      await processTransaction(tx);
      return res.json({ mode: 'local', transaction: await populateTx(MpesaTransaction.findById(tx._id)) });
    }

    const result = await simulateC2B({ amount, billRef: accountNumber });
    return res.json({ mode: 'sandbox', result, message: 'Sent to the Safaricom sandbox. The payment appears here when Safaricom calls back.' });
  } catch (err) {
    console.error('[C2B Simulate]', err.response?.data || err.message);
    return res.status(500).json({ message: 'Simulation failed', detail: err.response?.data || err.message });
  }
});

// ── POST /api/mpesa/register-urls ────────────────────────────────────────────
// One-time setup: tells Safaricom where to send Paybill notifications.
router.post('/register-urls', protect, restrictTo('landlord'), async (req, res) => {
  try {
    const result = await registerC2BUrls();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to register C2B URLs', detail: err.response?.data || err.message });
  }
});

module.exports = router;
