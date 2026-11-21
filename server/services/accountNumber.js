// server/services/accountNumber.js
// Paybill account numbers for tenancies, e.g. "KIL-A2".
// Prefix: 3 letters from the property's name (its last word, usually the area).
// Suffix: 2 characters from an alphabet without look-alikes (no O/0, I/1).

const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// "kil a2", "KIL-A2" and " Kil_A2 " all become "KILA2"
function normaliseAccount(ref) {
  return String(ref || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function prefixFor(property) {
  const words = String(property?.title || '').match(/[A-Za-z]{3,}/g) || [];
  const source = words.length ? words[words.length - 1] : String(property?.address?.city || 'MRP');
  return source.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
}

function randomSuffix(length, random = Math.random) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SUFFIX_ALPHABET[Math.floor(random() * SUFFIX_ALPHABET.length)];
  }
  return out;
}

// Gives an approved tenancy an account number if it does not have one yet.
// `RentalApplication` is passed in so this file has no database import (easier to test).
async function assignAccountNumber(application, property, RentalApplication) {
  if (application.accountNumber) return application.accountNumber;
  const prefix = prefixFor(property);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const length = attempt < 20 ? 2 : 3; // grow the suffix if 2 characters keep colliding
    const accountNumber = `${prefix}-${randomSuffix(length)}`;
    const accountKey = normaliseAccount(accountNumber);
    // eslint-disable-next-line no-await-in-loop
    const taken = await RentalApplication.exists({ accountKey });
    if (!taken) {
      application.accountNumber = accountNumber;
      application.accountKey = accountKey;
      // eslint-disable-next-line no-await-in-loop
      await application.save();
      return accountNumber;
    }
  }
  throw new Error('Could not generate a unique account number');
}

// Gives every approved tenancy that is missing one an account number (run on startup).
async function backfillAccountNumbers(RentalApplication) {
  const missing = await RentalApplication.find({
    status: 'approved',
    $or: [{ accountNumber: { $exists: false } }, { accountNumber: '' }, { accountNumber: null }],
  }).populate('property', 'title address');

  for (const app of missing) {
    // eslint-disable-next-line no-await-in-loop
    await assignAccountNumber(app, app.property, RentalApplication);
  }
  if (missing.length) console.log(`[Accounts] Assigned account numbers to ${missing.length} tenancies`);
}

module.exports = {
  SUFFIX_ALPHABET,
  normaliseAccount,
  prefixFor,
  randomSuffix,
  assignAccountNumber,
  backfillAccountNumbers,
};
