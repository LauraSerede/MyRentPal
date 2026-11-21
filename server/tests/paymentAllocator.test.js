// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { allocatePayment } = require('../services/paymentAllocator');

const month = (s) => new Date(`${s}-01T00:00:00Z`);
const NOV = month('2026-11');

test('pays the current month exactly', () => {
  const dues = [{ id: 'nov', month: NOV, amountDue: 45000, amountPaid: 0, status: 'pending' }];
  const { allocations, unallocated } = allocatePayment({ dues, amount: 45000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(allocations.map((a) => [a.id, a.apply, a.settles]), [['nov', 45000, true]]);
  assert.equal(unallocated, 0);
});

test('a part-payment leaves the month open', () => {
  const dues = [{ id: 'nov', month: NOV, amountDue: 45000, amountPaid: 0, status: 'pending' }];
  const { allocations } = allocatePayment({ dues, amount: 20000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(allocations.map((a) => [a.id, a.apply, a.settles]), [['nov', 20000, false]]);
});

test('a second part-payment adds to the first instead of replacing it', () => {
  const dues = [{ id: 'nov', month: NOV, amountDue: 45000, amountPaid: 20000, status: 'pending' }];
  const { allocations, unallocated } = allocatePayment({ dues, amount: 25000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(allocations.map((a) => [a.id, a.apply, a.settles]), [['nov', 25000, true]]);
  assert.equal(unallocated, 0);
});

test('arrears are paid oldest first', () => {
  const dues = [
    { id: 'nov', month: NOV, amountDue: 45000, amountPaid: 0, status: 'pending' },
    { id: 'oct', month: month('2026-10'), amountDue: 45000, amountPaid: 10000, status: 'pending' },
  ];
  const { allocations } = allocatePayment({ dues, amount: 50000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(allocations.map((a) => [a.id, a.apply]), [['oct', 35000], ['nov', 15000]]);
});

test('months marked paid by hand are skipped, even with amountPaid 0', () => {
  const dues = [
    { id: 'oct', month: month('2026-10'), amountDue: 45000, amountPaid: 0, status: 'paid' },
    { id: 'nov', month: NOV, amountDue: 45000, amountPaid: 0, status: 'pending' },
  ];
  const { allocations } = allocatePayment({ dues, amount: 45000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(allocations.map((a) => a.id), ['nov']);
});

test('creates the current month when it has no record yet', () => {
  const { allocations } = allocatePayment({ dues: [], amount: 45000, rent: 45000, currentMonth: NOV });
  assert.equal(allocations.length, 1);
  assert.equal(allocations[0].id, null);
  assert.equal(allocations[0].month.toISOString().slice(0, 7), '2026-11');
  assert.equal(allocations[0].apply, 45000);
});

test('overpayment prepays the following months', () => {
  const dues = [{ id: 'nov', month: NOV, amountDue: 45000, amountPaid: 0, status: 'pending' }];
  const { allocations, unallocated } = allocatePayment({ dues, amount: 100000, rent: 45000, currentMonth: NOV });
  assert.deepEqual(
    allocations.map((a) => [a.id, a.month.toISOString().slice(0, 7), a.apply, a.settles]),
    [['nov', '2026-11', 45000, true], [null, '2026-12', 45000, true], [null, '2027-01', 10000, false]]
  );
  assert.equal(unallocated, 0);
});

test('money beyond the prepayment limit is reported as unallocated', () => {
  const { allocations, unallocated } = allocatePayment({ dues: [], amount: 50000, rent: 10000, currentMonth: NOV, maxFutureMonths: 3 });
  assert.equal(allocations.length, 3);
  assert.equal(unallocated, 20000);
});

test('zero or invalid amounts allocate nothing', () => {
  assert.deepEqual(allocatePayment({ dues: [], amount: 0, rent: 45000, currentMonth: NOV }), { allocations: [], unallocated: 0 });
  assert.deepEqual(allocatePayment({ dues: [], amount: 'abc', rent: 45000, currentMonth: NOV }), { allocations: [], unallocated: 0 });
});
