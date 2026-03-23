// utils/otpSender.js
import nodemailer from "nodemailer";

// ── Singleton SMTP transporter (created once, reused) ──────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transporter;
}

// ── Main sender ────────────────────────────────────────────────────────────
export default async function sendProvider({ to, channel, code }) {
  const ch = (channel || "").toLowerCase() === "phone" ? "sms" : (channel || "").toLowerCase();

  // ── SMS via Twilio ───────────────────────────────────────────────────────
  if (ch === "sms") {
    const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE } = process.env;
    if (TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
      const { default: twilio } = await import("twilio");
      const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: TWILIO_PHONE,
        to,
        body: `Your BookMyGlam OTP is: ${code}. Valid for ${process.env.OTP_TTL_MINUTES || 5} minutes.`,
      });
      return { ok: true };
    }
    // Dev fallback
    console.log(`[OTP SMS - DEV] to=${to} code=${code}`);
    return { ok: true, fallback: true };
  }

  // ── Email via SMTP ───────────────────────────────────────────────────────
  if (ch === "email") {
    const transporter = getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Your BookMyGlam OTP Code",
        text: `Your OTP code is: ${code}. Valid for ${process.env.OTP_TTL_MINUTES || 5} minutes.`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px">
            <h2 style="color:#0f172a">Your OTP Code</h2>
            <p style="color:#374151">Use the code below to verify your identity:</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#e91e8c;margin:16px 0">
              ${code}
            </div>
            <p style="color:#6b7280;font-size:13px">
              Valid for <strong>${process.env.OTP_TTL_MINUTES || 5} minutes</strong>. 
              Do not share this with anyone.
            </p>
          </div>
        `,
      });
      return { ok: true };
    }
    // Dev fallback
    console.log(`[OTP EMAIL - DEV] to=${to} code=${code}`);
    return { ok: true, fallback: true };
  }

  throw new Error(`Unknown channel: "${channel}". Use 'email', 'sms', or 'phone'.`);
}