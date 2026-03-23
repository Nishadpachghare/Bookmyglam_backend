import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "percentage",
    },
    image: { type: String, default: "" },

    services: [{ type: String }],

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Offer || mongoose.model("Offer", offerSchema);