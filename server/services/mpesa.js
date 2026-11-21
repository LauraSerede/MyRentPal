// server/services/mpesa.js
// M-Pesa Daraja API — STK Push + helpers
const axios = require('axios');

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PROD_BASE    = 'https://api.safaricom.co.ke';

const BASE_URL = process.env.MPESA_ENV === 'production' ? PROD_BASE : SANDBOX_BASE;

// ── 1. Get OAuth access token ────────────────────────────────────────────────
async function getAccessToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const creds  = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  return data.access_token;
}

// ── 2. Build STK Push password (base64 of shortcode+passkey+timestamp) ──────
function buildPassword(timestamp) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey   = process.env.MPESA_PASSKEY;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

// ── 3. Initiate STK Push ─────────────────────────────────────────────────────
// phone     : "254712345678" (no +, no leading 0)
// amount    : integer KES
// reference : e.g. property title or "RENT-<propertyId>"
// description: short description shown on phone
async function stkPush({ phone, amount, reference, description }) {
  const token     = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = buildPassword(timestamp);
  const shortcode = process.env.MPESA_SHORTCODE;

  const payload = {
    BusinessShortCode: shortcode,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline',
    Amount:            Math.round(amount),
    PartyA:            phone,
    PartyB:            shortcode,
    PhoneNumber:       phone,
    CallBackURL:       process.env.MPESA_CALLBACK_URL,
    AccountReference:  reference.slice(0, 12),   // max 12 chars
    TransactionDesc:   description.slice(0, 13), // max 13 chars
  };

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ── 4. Paybill callback URLs ─────────────────────────────────────────────────
// Built from MPESA_PUBLIC_URL (your server's public address, e.g. an ngrok URL)
// plus MPESA_CALLBACK_SECRET, so only Safaricom (who knows the URL) can post payments.
function c2bCallbackUrls() {
  const base   = String(process.env.MPESA_PUBLIC_URL || '').replace(/\/$/, '');
  const secret = process.env.MPESA_CALLBACK_SECRET;
  if (!base || !secret) {
    throw new Error('Set MPESA_PUBLIC_URL and MPESA_CALLBACK_SECRET before registering Paybill URLs');
  }
  return {
    confirmation: `${base}/api/mpesa/c2b/confirm/${secret}`,
    validation:   `${base}/api/mpesa/c2b/validate/${secret}`,
  };
}

// ── 5. Register C2B URLs (call once to set up paybill callbacks) ─────────────
async function registerC2BUrls() {
  const token = await getAccessToken();
  const urls  = c2bCallbackUrls();
  const { data } = await axios.post(
    `${BASE_URL}/mpesa/c2b/v1/registerurl`,
    {
      ShortCode:       process.env.MPESA_SHORTCODE,
      ResponseType:    'Completed', // if our validation URL is unreachable, accept the payment anyway
      ConfirmationURL: urls.confirmation,
      ValidationURL:   urls.validation,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ── 6. Sandbox only: ask Safaricom to simulate a Paybill payment ─────────────
// Safaricom then calls our confirmation URL exactly as it would for a real payment.
async function simulateC2B({ amount, billRef }) {
  if (process.env.MPESA_ENV === 'production') throw new Error('simulateC2B is sandbox-only');
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${BASE_URL}/mpesa/c2b/v1/simulate`,
    {
      ShortCode:     process.env.MPESA_SHORTCODE,
      CommandID:     'CustomerPayBillOnline',
      Amount:        Math.round(amount),
      Msisdn:        '254708374149', // Safaricom's sandbox test number
      BillRefNumber: billRef,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

module.exports = { stkPush, registerC2BUrls, simulateC2B, c2bCallbackUrls, getAccessToken };
