// utils/emailSender.js
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@yourdomain.com";

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_PORT === 465, // true for port 465, false for others
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // verify transporter readiness (optional)
  transporter.verify().catch((err) => {
    console.warn("SMTP verify failed:", err?.message ?? err);
    transporter = null;
  });
}

export async function sendEmail({ to, subject, html, text }) {
  // If transporter available, send via SMTP
  if (transporter) {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ""), // fallback plain text
      html,
    });
    return { ok: true, info };
  }

  // Fallback: log to console (useful in dev when SMTP not configured)
  console.log("=== Email fallback (SMTP not configured) ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("HTML:", html);
  console.log("Text:", text || html.replace(/<[^>]+>/g, ""));
  console.log("===========================================");
  return { ok: true, fallback: true };
}
