// models/Offer.js  ← Capital O zaroori hai
import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    discount:    { type: Number, required: true, min: 0 },
    image:       { type: String, default: "" },
    services:    { type: [String], default: [] },
    startDate:   { type: Date, default: null },
    endDate:     { type: Date, default: null },
    published:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

offerSchema.index({ published: 1, startDate: 1, endDate: 1 });

export default mongoose.models.Offer || mongoose.model("Offer", offerSchema);