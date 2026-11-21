// server/services/receiptMessage.js
// Builds the SMS receipt text. Kept short so it usually fits in one or two SMS.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ksh = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

function monthLabel(date) {
  const d = new Date(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// [Oct 2026, Nov 2026] -> "Oct-Nov 2026"; [Dec 2026, Jan 2027] -> "Dec 2026-Jan 2027"
function monthsLabel(months) {
  if (!months.length) return '';
  const sorted = [...months].map((m) => new Date(m)).sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.getTime() === last.getTime()) return monthLabel(first);
  if (first.getUTCFullYear() === last.getUTCFullYear()) {
    return `${MONTHS[first.getUTCMonth()]}-${MONTHS[last.getUTCMonth()]} ${last.getUTCFullYear()}`;
  }
  return `${monthLabel(first)}-${monthLabel(last)}`;
}

/**
 * @param {object} r
 * @param {string} r.tenantName
 * @param {string} r.accountNumber
 * @param {number} r.amount
 * @param {string} r.transId
 * @param {Date[]} r.months     months the payment went towards
 * @param {number} r.balance    rent still owed after this payment (0 if fully paid)
 * @param {number} [r.credit]   money left over that is not yet assigned to a month
 */
function buildReceiptSms({ tenantName, accountNumber, amount, transId, months, balance, credit = 0 }) {
  const firstName = String(tenantName || '').trim().split(/\s+/)[0] || 'tenant';
  const forWhat = months.length ? ` for ${accountNumber} (${monthsLabel(months)})` : ` for ${accountNumber}`;
  const parts = [
    `MyRentPal: Received ${ksh(amount)}${forWhat}.`,
    `M-Pesa ref ${transId}.`,
    balance > 0 ? `Balance ${ksh(balance)}.` : 'Rent fully paid.',
  ];
  if (credit > 0) parts.push(`Credit ${ksh(credit)}.`);
  parts.push(`Thank you, ${firstName}.`);
  return parts.join(' ');
}

module.exports = { buildReceiptSms, monthsLabel, monthLabel, ksh };
