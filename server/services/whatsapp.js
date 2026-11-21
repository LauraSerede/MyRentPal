// server/services/whatsapp.js
// Twilio WhatsApp messaging service
const twilio = require('twilio');

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Normalise a Kenyan phone number to E.164 format
// Accepts: 0712345678 | 254712345678 | +254712345678
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+254${digits.slice(1)}`;
  return `+${digits}`;
}

// ── Send a plain WhatsApp message ────────────────────────────────────────────
async function sendWhatsApp(to, body) {
  const client = getClient();
  const from   = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`; // e.g. whatsapp:+14155238886
  const toNum  = `whatsapp:${toE164(to)}`;

  return client.messages.create({ from, to: toNum, body });
}

// ── Send a monthly rent receipt ──────────────────────────────────────────────
// tenant      : { name, phone }
// landlord    : { name, phone? }
// property    : { title, address }
// month       : Date or string like "2026-01"
// amountPaid  : number
// outstanding : number
async function sendReceipt({ tenant, landlord, property, month, amountPaid, outstanding }) {
  const monthLabel = new Date(month).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' });
  const addr = `${property.address?.street ?? ''}, ${property.address?.city ?? ''}`.trim().replace(/^,\s*/, '');

  const body = [
    `🏠 *MyRentPal — Rent Receipt*`,
    ``,
    `Hi ${tenant.name},`,
    `Here is your rent summary for *${monthLabel}*.`,
    ``,
    `📍 Property : ${property.title}`,
    `🏙️ Address  : ${addr}`,
    `👤 Landlord : ${landlord.name}`,
    ``,
    `💰 Amount Paid  : KES ${amountPaid.toLocaleString()}`,
    outstanding > 0
      ? `⚠️ Outstanding  : KES ${outstanding.toLocaleString()}`
      : `✅ Fully Paid`,
    ``,
    `Thank you for using MyRentPal.`,
    `_This is an automated receipt. Keep it for your records._`,
  ].join('\n');

  return sendWhatsApp(tenant.phone, body);
}

module.exports = { sendWhatsApp, sendReceipt, toE164 };
