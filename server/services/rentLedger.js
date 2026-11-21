// server/services/rentLedger.js
// Applies a received payment to a tenancy's monthly rent records.
const Payment = require('../models/paymentModel');
const { allocatePayment, monthStart, outstandingOf } = require('./paymentAllocator');

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // Kenya is UTC+3

// The rent month a payment belongs to, in Kenya time (a payment at 00:30 on
// 1 December in Nairobi counts towards December, not November).
function kenyaMonth(date = new Date()) {
  return monthStart(new Date(new Date(date).getTime() + EAT_OFFSET_MS));
}

const toDue = (p) => ({
  id: p._id.toString(),
  month: p.month,
  amountDue: p.amount,
  amountPaid: p.amountPaid || 0,
  status: p.status,
});

/**
 * @param {object} args
 * @param {object} args.tenancy   RentalApplication with `property` populated (needs rentPerMonth)
 * @param {number} args.amount
 * @param {string} args.reference M-Pesa transaction ID
 * @param {Date}   args.paidAt
 * @returns {Promise<{ payments: object[], months: Date[], balance: number, unallocated: number }>}
 */
async function applyPayment({ tenancy, amount, reference, paidAt = new Date() }) {
  const tenantId = tenancy.tenant._id || tenancy.tenant;
  const propertyId = tenancy.property._id || tenancy.property;
  const landlordId = tenancy.landlord._id || tenancy.landlord;
  const rent = tenancy.property.rentPerMonth || 0;

  const existing = await Payment.find({ tenant: tenantId, property: propertyId });
  const { allocations, unallocated } = allocatePayment({
    dues: existing.map(toDue),
    amount,
    rent,
    currentMonth: kenyaMonth(paidAt),
  });

  const touched = [];
  for (const a of allocations) {
    let payment = a.id ? existing.find((p) => p._id.toString() === a.id) : null;
    if (!payment) {
      payment = new Payment({
        property: propertyId,
        tenant: tenantId,
        landlord: landlordId,
        amount: a.amountDue,
        month: a.month,
        notes: 'Created automatically from an M-Pesa payment',
      });
    }
    payment.amountPaid = (payment.amountPaid || 0) + a.apply;
    if (!payment.mpesaRefs.includes(reference)) payment.mpesaRefs.push(reference);
    if (payment.amountPaid >= payment.amount) {
      payment.status = 'paid';
      payment.paidAt = paidAt;
    }
    // eslint-disable-next-line no-await-in-loop
    await payment.save();
    touched.push(payment);
  }

  // Rent still owed across all months up to and including the current one
  const after = await Payment.find({ tenant: tenantId, property: propertyId });
  const current = kenyaMonth(paidAt).getTime();
  const balance = after
    .filter((p) => monthStart(p.month).getTime() <= current)
    .reduce((sum, p) => sum + outstandingOf(toDue(p)), 0);

  return { payments: touched, months: allocations.map((a) => a.month), balance, unallocated };
}

module.exports = { applyPayment, kenyaMonth };
