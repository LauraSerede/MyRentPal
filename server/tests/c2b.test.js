// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliseAccount, prefixFor, randomSuffix, SUFFIX_ALPHABET } = require('../services/accountNumber');
const { parseC2B, parseTransTime } = require('../services/c2bPayload');
const { buildReceiptSms, monthsLabel } = require('../services/receiptMessage');
const { toE164 } = require('../services/sms');

// ── Account numbers ──────────────────────────────────────────────────────────
test('account numbers match however the tenant types them', () => {
  for (const typed of ['KIL-A2', 'kil-a2', 'KIL A2', ' kila2 ', 'Kil_A2']) {
    assert.equal(normaliseAccount(typed), 'KILA2');
  }
  assert.equal(normaliseAccount(undefined), '');
});

test('prefix comes from the last word of the property name', () => {
  assert.equal(prefixFor({ title: 'Modern 2-bedroom apartment in Kilimani' }), 'KIL');
  assert.equal(prefixFor({ title: 'Bedsitter near JKUAT, Juja' }), 'JUJ');
  assert.equal(prefixFor({ title: '12', address: { city: 'Nairobi' } }), 'NAI');
  assert.equal(prefixFor({}), 'MRP');
});

test('suffixes never use look-alike characters', () => {
  for (const ch of 'O0I1') assert.ok(!SUFFIX_ALPHABET.includes(ch));
  const s = randomSuffix(200);
  assert.equal(s.length, 200);
  assert.ok([...s].every((ch) => SUFFIX_ALPHABET.includes(ch)));
});

// ── Safaricom payload ────────────────────────────────────────────────────────
const SAMPLE = {
  TransactionType: 'Pay Bill',
  TransID: 'SKL7X2ABC1',
  TransTime: '20261121143005',
  TransAmount: '45000.00',
  BusinessShortCode: '600981',
  BillRefNumber: 'kil a2',
  MSISDN: '2547 ***** 126',
  FirstName: 'BRIAN',
  LastName: 'OTIENO',
};

test('reads the fields Safaricom actually sends', () => {
  const p = parseC2B(SAMPLE);
  assert.equal(p.transId, 'SKL7X2ABC1');
  assert.equal(p.amount, 45000);
  assert.equal(p.billRef, 'kil a2');
  assert.equal(p.accountKey, 'KILA2');
  assert.equal(p.payerName, 'BRIAN OTIENO');
  assert.equal(p.shortcode, '600981');
});

test('transaction time is read as Kenya time', () => {
  assert.equal(parseTransTime('20261121143005').toISOString(), '2026-11-21T11:30:05.000Z');
  assert.equal(parseTransTime('20261201003000').toISOString(), '2026-11-30T21:30:00.000Z');
});

test('a missing amount parses as 0 (and is rejected upstream)', () => {
  assert.equal(parseC2B({ TransID: 'X' }).amount, 0);
});

// ── Receipt text ─────────────────────────────────────────────────────────────
const m = (s) => new Date(`${s}-01T00:00:00Z`);

test('month ranges read naturally', () => {
  assert.equal(monthsLabel([m('2026-11')]), 'Nov 2026');
  assert.equal(monthsLabel([m('2026-11'), m('2026-10')]), 'Oct-Nov 2026');
  assert.equal(monthsLabel([m('2026-12'), m('2027-01')]), 'Dec 2026-Jan 2027');
});

test('full payment receipt', () => {
  const sms = buildReceiptSms({ tenantName: 'Brian Otieno', accountNumber: 'KIL-A2', amount: 45000, transId: 'SKL7X2ABC1', months: [m('2026-11')], balance: 0 });
  assert.equal(sms, 'MyRentPal: Received KES 45,000 for KIL-A2 (Nov 2026). M-Pesa ref SKL7X2ABC1. Rent fully paid. Thank you, Brian.');
  assert.ok(sms.length <= 160, `receipt is ${sms.length} characters`);
});

test('part payment receipt shows the balance', () => {
  const sms = buildReceiptSms({ tenantName: 'Brian', accountNumber: 'KIL-A2', amount: 20000, transId: 'X1', months: [m('2026-11')], balance: 25000 });
  assert.match(sms, /Balance KES 25,000\./);
});

// ── Phone numbers ────────────────────────────────────────────────────────────
test('Kenyan phone numbers are normalised for SMS', () => {
  assert.equal(toE164('0712345678'), '+254712345678');
  assert.equal(toE164('254712345678'), '+254712345678');
  assert.equal(toE164('+254 712 345 678'), '+254712345678');
  assert.equal(toE164('712345678'), '+254712345678');
  assert.equal(toE164(''), '');
});
