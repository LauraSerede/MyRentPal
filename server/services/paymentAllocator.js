// server/services/paymentAllocator.js
// Decides how one M-Pesa payment is spread across monthly rent records.
// Pure function (no database), so it is easy to unit test.
//
// Rules:
//   1. Pay off the oldest unpaid months first (arrears).
//   2. Then any money left goes to the following months, one rent at a time
//      (prepayment), up to `maxFutureMonths` new months.
//   3. Anything still left over is reported as `unallocated` for the landlord to handle.

function monthStart(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(date, n) {
  const d = monthStart(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function outstandingOf(due) {
  if (due.status === 'paid') return 0;
  return Math.max(0, (due.amountDue || 0) - (due.amountPaid || 0));
}

/**
 * @param {object}   args
 * @param {Array}    args.dues    existing rent records: { id, month, amountDue, amountPaid, status }
 * @param {number}   args.amount  amount received (KES)
 * @param {number}   args.rent    monthly rent, used for months that have no record yet
 * @param {Date}     args.currentMonth  the month the payment arrived in
 * @param {number}  [args.maxFutureMonths=12]
 * @returns {{ allocations: Array<{ id: string|null, month: Date, amountDue: number, apply: number, settles: boolean }>, unallocated: number }}
 */
function allocatePayment({ dues, amount, rent, currentMonth, maxFutureMonths = 12 }) {
  let remaining = Math.round(Number(amount) || 0);
  const allocations = [];
  if (remaining <= 0) return { allocations, unallocated: 0 };

  const sorted = [...dues].sort((a, b) => new Date(a.month) - new Date(b.month));

  // 1. Arrears and the current month, oldest first
  for (const due of sorted) {
    const owed = outstandingOf(due);
    if (owed <= 0 || remaining <= 0) continue;
    const apply = Math.min(owed, remaining);
    remaining -= apply;
    allocations.push({
      id: due.id,
      month: monthStart(due.month),
      amountDue: due.amountDue,
      apply,
      settles: apply === owed,
    });
  }

  // 2. Prepay months that have no record yet, starting with the current month
  if (remaining > 0 && rent > 0) {
    const existingMonths = new Set(sorted.map((d) => monthStart(d.month).getTime()));
    let cursor = monthStart(currentMonth);
    let created = 0;
    while (remaining > 0 && created < maxFutureMonths) {
      if (!existingMonths.has(cursor.getTime())) {
        const apply = Math.min(rent, remaining);
        remaining -= apply;
        created += 1;
        allocations.push({ id: null, month: cursor, amountDue: rent, apply, settles: apply === rent });
      }
      cursor = addMonths(cursor, 1);
    }
  }

  return { allocations, unallocated: remaining };
}

module.exports = { allocatePayment, monthStart, addMonths, outstandingOf };
