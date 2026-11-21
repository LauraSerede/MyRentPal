// server/services/receiptCron.js
// Runs on the 1st of every month at 08:00 (Kenya time = UTC+3, so 05:00 UTC)
// Finds every approved tenancy → calculates previous month's rent balance → sends WhatsApp receipt
const cron          = require('node-cron');
const RentalApp     = require('../models/rentalApplicationModel');
const Payment       = require('../models/paymentModel');
const { sendReceipt } = require('./whatsapp');

// ── Core logic (exported so you can trigger it manually for testing) ─────────
async function sendMonthlyReceipts() {
  console.log('[ReceiptCron] Starting monthly receipt run…');

  // Previous month window
  const now   = new Date();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 1);

  // All approved tenancies with their tenant, landlord and property populated
  const tenancies = await RentalApp.find({ status: 'approved' })
    .populate('tenant',   'name email phone')
    .populate('landlord', 'name email phone')
    .populate('property', 'title address rentPerMonth');

  if (!tenancies.length) {
    console.log('[ReceiptCron] No active tenancies found.');
    return;
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const tenancy of tenancies) {
    const { tenant, landlord, property } = tenancy;

    // Skip if tenant has no phone number registered
    if (!tenant?.phone) {
      console.warn(`[ReceiptCron] Tenant ${tenant?.name} has no phone — skipping`);
      skipped++;
      continue;
    }

    // Payments for this tenant + property in the previous month
    const payments = await Payment.find({
      tenant:   tenant._id,
      property: property._id,
      month:    { $gte: start, $lt: end },
    });

    const amountPaid  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const outstanding = Math.max(0, (property.rentPerMonth || 0) - amountPaid);

    try {
      await sendReceipt({
        tenant:      { name: tenant.name, phone: tenant.phone },
        landlord:    { name: landlord?.name || 'Your Landlord' },
        property,
        month:       start,
        amountPaid,
        outstanding,
      });
      console.log(`[ReceiptCron] ✅ Sent receipt to ${tenant.name} (${tenant.phone})`);
      sent++;
    } catch (err) {
      console.error(`[ReceiptCron] ❌ Failed for ${tenant.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[ReceiptCron] Done — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`);
}

// ── Schedule: 08:00 EAT on the 1st of every month ───────────────────────────
// EAT = UTC+3, so 05:00 UTC
function startReceiptCron() {
  cron.schedule('0 5 1 * *', sendMonthlyReceipts, { timezone: 'UTC' });
  console.log('[ReceiptCron] Scheduled — runs 08:00 EAT on the 1st of each month');
}

module.exports = { startReceiptCron, sendMonthlyReceipts };
