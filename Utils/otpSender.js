// utils/otpSender.js
import nodemailer from "nodemailer";

export default async function sendProvider({ to, channel, code }) {
  // Normalize channel: accept "phone" or "sms" as SMS
  const normalized = (channel || "").toLowerCase();
  const ch = normalized === "phone" ? "sms" : normalized;

  if (ch === "sms") {
    // Twilio path
    if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE) {
      const twilioModule = await import("twilio");
      const client = twilioModule.default(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: process.env.TWILIO_PHONE,
        to,
        body: `Your OTP code is ${code}`
      });
      return { ok: true };
    }
    // fallback to console
    console.log(`[OTP - SMS LOG] to=${to} code=${code}`);
    return { ok: true };
  }

  if (ch === "email") {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === "true", // optional flag
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Your OTP code",
        text: `Your OTP code is ${code}`
      });
      return { ok: true };
    }
    console.log(`[OTP - EMAIL LOG] to=${to} code=${code}`);
    return { ok: true };
  }

  throw new Error("Unknown channel (use 'phone'/'sms' or 'email')");
}
