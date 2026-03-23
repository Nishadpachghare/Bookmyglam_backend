// utils/emailSender.js
import nodemailer from "nodemailer";

// configuration driven entirely by environment variables so that the
// same code can be used in development (no SMTP) or production (real SMTP)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
// optional boolean flag stored as string in .env ("true"/"false")
const SMTP_SECURE = String(process.env.SMTP_SECURE).toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@yourdomain.com";

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    // nodemailer interprets secure === true as TLS connection (port 465);
    // fallback to the explicit flag so you can override the port-based
    // check (Gmail for example wants secure=true even on 587 when using
    // "smtp.gmail.com").
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  transporter.verify().catch((err) => {
    console.warn("SMTP verify failed:", err?.message ?? err);
    transporter = null;
  });
}
/**

 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 */
export async function sendEmail({ to, subject, html, text }) {
  // build a safe plaintext fallback without assuming html exists
  const plaintext =
    text || (html ? html.replace(/<[^>]+>/g, "") : "");

  // If transporter available, send via SMTP
  if (transporter) {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: plaintext,
      html,
    });
    return { ok: true, info };
  }

  // Fallback: log to console (useful in dev when SMTP not configured)
  console.log("=== Email fallback (SMTP not configured) ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("HTML:", html);
  console.log("Text:", plaintext);
  console.log("===========================================");
  return { ok: true, fallback: true };
}
