// server/services/mpesaC2B.js
// Handles a Paybill payment end to end:
//   record it -> match it to a tenancy by account number -> apply it to rent -> SMS a receipt.
const MpesaTransaction = require('../models/mpesaTransactionModel');
const RentalApplication = require('../models/rentalApplicationModel');
const { parseC2B } = require('./c2bPayload');
const { applyPayment } = require('./rentLedger');
const { buildReceiptSms } = require('./receiptMessage');
const { sendSms } = require('./sms');

// Step 1: store the transaction. Returns { tx, isNew }.
// TransID is unique, so a Safaricom retry finds the existing record instead of a duplicate.
async function recordTransaction(body, source = 'c2b') {
  const data = parseC2B(body);
  if (!data.transId || data.amount <= 0) {
    throw new Error('Invalid C2B payload: missing TransID or amount');
  }
  try {
    const tx = await MpesaTransaction.create({ ...data, source, raw: body });
    return { tx, isNew: true };
  } catch (err) {
    if (err.code === 11000) {
      return { tx: await MpesaTransaction.findOne({ transId: data.transId }), isNew: false };
    }
    throw err;
  }
}

function findTenancyByAccount(accountKey) {
  if (!accountKey) return null;
  return RentalApplication.findOne({ accountKey, status: 'approved' })
    .populate('tenant', 'name phone email')
    .populate('property', 'title rentPerMonth')
    .populate('landlord', 'name');
}

async function sendReceipt(tx, tenancy, result) {
  const message = buildReceiptSms({
    tenantName: tenancy.tenant?.name,
    accountNumber: tenancy.accountNumber,
    amount: tx.amount,
    transId: tx.transId,
    months: result.months,
    balance: result.balance,
    credit: result.unallocated,
  });
  // Safaricom hides the payer's number on Paybill payments, so receipts go to the
  // phone number on the tenant's MyRentPal profile.
  const outcome = await sendSms(tenancy.tenant?.phone, message);
  tx.receipts.push({ channel: 'sms', message, ...outcome });
  return outcome;
}

// Step 2: match and apply. Safe to call more than once, even at the same time:
// only the call that atomically moves the transaction to 'processing' does the work.
async function processTransaction(txOrId, tenancyOverride = null) {
  const id = txOrId._id || txOrId;
  const tx = await MpesaTransaction.findOneAndUpdate(
    { _id: id, status: { $in: ['received', 'unmatched'] } },
    { $set: { status: 'processing' } },
    { new: true }
  );
  if (!tx) return MpesaTransaction.findById(id); // already processed, or being processed right now

  try {
    return await matchAndApply(tx, tenancyOverride);
  } catch (err) {
    // Release the claim so a Safaricom retry (or the landlord, when assigning) can try again
    const releaseTo = tenancyOverride ? 'unmatched' : 'received';
    await MpesaTransaction.updateOne({ _id: id, status: 'processing' }, { $set: { status: releaseTo } });
    throw err;
  }
}

async function matchAndApply(tx, tenancyOverride) {
  const tenancy = tenancyOverride || (await findTenancyByAccount(tx.accountKey));
  if (!tenancy) {
    tx.status = 'unmatched';
    await tx.save();
    console.warn(`[C2B] ${tx.transId}: no tenancy for account "${tx.billRef}" (KES ${tx.amount}). Waiting for the landlord to assign it.`);
    return tx;
  }

  const result = await applyPayment({
    tenancy,
    amount: tx.amount,
    reference: tx.transId,
    paidAt: tx.transTime || new Date(),
  });

  tx.status = 'matched';
  tx.tenancy = tenancy._id;
  tx.tenant = tenancy.tenant._id;
  tx.landlord = tenancy.landlord._id || tenancy.landlord;
  tx.property = tenancy.property._id;
  tx.payments = result.payments.map((p) => p._id);
  tx.unallocated = result.unallocated;

  await sendReceipt(tx, tenancy, result);
  await tx.save();
  console.log(`[C2B] ${tx.transId}: KES ${tx.amount} applied to ${tenancy.accountNumber} (${tenancy.tenant?.name}). Balance KES ${result.balance}.`);
  return tx;
}

// Re-sends the most recent receipt text for a matched transaction.
async function resendReceipt(tx) {
  const tenancy = await RentalApplication.findById(tx.tenancy).populate('tenant', 'name phone');
  const last = tx.receipts[tx.receipts.length - 1];
  if (!tenancy || !last?.message) throw new Error('Nothing to resend');
  const outcome = await sendSms(tenancy.tenant?.phone, last.message);
  tx.receipts.push({ channel: 'sms', message: last.message, ...outcome });
  await tx.save();
  return outcome;
}

module.exports = { recordTransaction, processTransaction, findTenancyByAccount, resendReceipt };
