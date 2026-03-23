// models/Otp.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  to:        { type: String, required: true },
  code:      { type: String, required: true },
  channel:   { type: String, enum: ["sms", "email", "phone"], required: true },
  verified:  { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired OTPs from DB after expiry (MongoDB TTL index)
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup index
OtpSchema.index({ to: 1, verified: 1 });

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);