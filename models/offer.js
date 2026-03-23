// models/Offer.js
import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discount:    { type: Number, default: 0 },      // percentage or flat
    discountType:{ type: String, enum: ["percentage", "flat"], default: "percentage" },
    imageUrl:    { type: String, default: "" },
    isActive:    { type: Boolean, default: true },
    expiresAt:   { type: Date, default: null },      // null = no expiry
  },
  { timestamps: true }
);

// Index for fast active offer queries
offerSchema.index({ isActive: 1, expiresAt: 1 });

export default mongoose.models.Offer || mongoose.model("Offer", offerSchema);