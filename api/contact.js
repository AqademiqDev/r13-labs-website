/**
 * Contact form delivery — Vercel serverless function.
 *
 * Takes the JSON the contact form POSTs and emails it to support@aqademiq.com
 * via Resend's REST API. Plain fetch, so the project stays dependency-free.
 *
 * Required environment variable in Vercel:
 *   RESEND_API_KEY
 *
 * Optional overrides:
 *   CONTACT_TO    default support@aqademiq.com
 *   CONTACT_FROM  default "R13 Labs <website@r13labs.com>" — the domain here
 *                 must be verified in Resend, otherwise sending fails.
 *
 * The visitor's address goes in reply_to, so replying from the inbox goes
 * straight back to them.
 */

const TO = process.env.CONTACT_TO || 'support@aqademiq.com';
const FROM = process.env.CONTACT_FROM || 'R13 Labs <website@r13labs.com>';

const LIMITS = { name: 120, email: 200, topic: 80, message: 5000 };

const clean = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  // Honeypot: a real person never fills this in, because it isn't visible.
  if (clean(body.company, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const topic = clean(body.topic, LIMITS.topic) || 'Unspecified';
  const message = clean(body.message, LIMITS.message);

  if (!name || !message || !looksLikeEmail(email)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set — cannot deliver contact form');
    return res.status(500).json({ error: 'Mail not configured' });
  }

  const text = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Topic:   ${topic}`,
    '',
    message,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `R13 Labs — ${topic} — ${name}`,
        text,
        html:
          `<p><strong>Name:</strong> ${escapeHtml(name)}<br>` +
          `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
          `<strong>Topic:</strong> ${escapeHtml(topic)}</p>` +
          `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
    });

    if (!response.ok) {
      console.error('Resend rejected the message:', response.status, await response.text());
      return res.status(502).json({ error: 'Delivery failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form delivery threw:', err);
    return res.status(502).json({ error: 'Delivery failed' });
  }
};

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
