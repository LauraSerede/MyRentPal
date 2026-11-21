// server/services/c2bPayload.js
// Reads a Safaricom C2B (Paybill) confirmation or validation payload.
// Field names follow Daraja's C2B v1 format, e.g.:
// { TransactionType, TransID, TransTime: "20261121143005", TransAmount: "45000.00",
//   BusinessShortCode, BillRefNumber, MSISDN, FirstName, ... }
const { normaliseAccount } = require('./accountNumber');

// "20261121143005" (Kenya time, UTC+3) -> Date
function parseTransTime(value) {
  const s = String(value || '');
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return new Date();
  const [, y, mo, d, h, mi, se] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}+03:00`);
}

function parseC2B(body = {}) {
  const names = [body.FirstName, body.MiddleName, body.LastName].filter(Boolean).join(' ').trim();
  return {
    transId:    String(body.TransID || '').trim(),
    transType:  String(body.TransactionType || ''),
    amount:     Math.round(Number(body.TransAmount) || 0),
    billRef:    String(body.BillRefNumber || '').trim(),
    accountKey: normaliseAccount(body.BillRefNumber),
    msisdn:     String(body.MSISDN || ''),
    payerName:  names,
    shortcode:  String(body.BusinessShortCode || ''),
    transTime:  parseTransTime(body.TransTime),
  };
}

module.exports = { parseC2B, parseTransTime };
