// controllers/otpController.js
import Otp from "../models/Otp.js";
import dayjs from "dayjs";
import sendProvider from "../Utils/otpSender.js";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 5);

export const sendOtp = async (req, res) => {
  try {
    const { to, channel } = req.body;
    if (!to || !channel) return res.status(400).json({ ok: false, message: "Missing 'to' or 'channel'" });

    const normalizedChannel = String(channel).toLowerCase();

    // create 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = dayjs().add(OTP_TTL_MINUTES, "minute").toDate();

    // Optionally delete old unverified OTPs for same contact to avoid clutter
    await Otp.updateMany({ to, verified: false }, { $set: { verified: true } }).catch(() => {});

    // Save OTP
    await Otp.create({ to, code, channel: normalizedChannel, expiresAt });

    // send using provider (logs if provider is not configured)
    await sendProvider({ to, channel: normalizedChannel, code });

    return res.json({ ok: true, message: "OTP sent" });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ ok: false, message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { to, code } = req.body;
    if (!to || !code) return res.status(400).json({ ok: false, message: "Missing 'to' or 'code'" });

    const doc = await Otp.findOne({ to, code, verified: false }).sort({ createdAt: -1 });
    if (!doc) return res.status(400).json({ ok: false, message: "Invalid OTP" });

    if (doc.expiresAt < new Date()) {
      return res.status(400).json({ ok: false, message: "OTP expired" });
    }

    doc.verified = true;
    await doc.save();

    return res.json({ ok: true, message: "OTP verified" });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ ok: false, message: "Failed to verify OTP" });
  }
};
