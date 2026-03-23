import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    services: [
      {
        type: String, // Stores the names of the services selected in React
      },
    ],
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    // Supports both naming conventions for flexibility
    startDate: { type: Date },
    endDate: { type: Date },
    validFrom: { type: Date },
    validTill: { type: Date },
    image: {
      type: String, // Stores the URL of the uploaded image
    },
    published: {
      type: Boolean,
      default: false, // Offers start as drafts
    },
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
