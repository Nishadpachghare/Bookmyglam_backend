import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Automatically converts 'save50' to 'SAVE50'
    },
    discount: {
      type: Number,
      required: true,
    },
    minAmount: {
      type: Number,
      default: 0, // Minimum booking amount required to use coupon
    },
    validFrom: {
      type: Date,
    },
    validTill: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
