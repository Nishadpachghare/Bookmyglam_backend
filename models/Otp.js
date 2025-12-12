// models/Otp.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  to: { type: String, required: true }, // phone or email
  code: { type: String, required: true },
  channel: { type: String, enum: ["sms", "email", "phone"], required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
