// server/services/sms.js
// Sends SMS through Africa's Talking (https://africastalking.com).
// Sandbox: AT_USERNAME=sandbox and the sandbox API key; messages appear in the AT simulator.
// Without AT_API_KEY the message is only logged, so the app still works in development.
const axios = require('axios');

// 0712345678 | 254712345678 | +254712345678 -> +254712345678
function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`; // 712345678
  return `+${digits}`;
}

async function sendSms(to, message) {
  const phone = toE164(to);
  if (!phone) return { status: 'skipped', to: '', error: 'No phone number on file' };

  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';
  if (!apiKey) {
    console.log(`[SMS] Not configured (AT_API_KEY missing). Would send to ${phone}: ${message}`);
    return { status: 'skipped', to: phone, error: 'SMS not configured (AT_API_KEY missing)' };
  }

  const base = username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  const params = new URLSearchParams({ username, to: phone, message });
  if (process.env.AT_SENDER_ID) params.append('from', process.env.AT_SENDER_ID);

  try {
    const { data } = await axios.post(`${base}/version1/messaging`, params.toString(), {
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (recipient && (recipient.status === 'Success' || recipient.statusCode === 101)) {
      return { status: 'sent', to: phone };
    }
    return { status: 'failed', to: phone, error: recipient?.status || data?.SMSMessageData?.Message || 'Unknown SMS error' };
  } catch (err) {
    return { status: 'failed', to: phone, error: err.response?.data?.toString?.() || err.message };
  }
}

module.exports = { sendSms, toE164 };
