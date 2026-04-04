import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    stylistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stylist",
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    checkInTime: {
      type: String, // ISO format
      default: null,
    },
    checkoutTime: {
      type: String, // ISO format
      default: null,
    },
    status: {
      type: String,
      enum: ["full", "half", "absent", "holiday"],
      default: "absent",
    },
    hoursWorked: {
      type: Number, // in decimal hours
      default: 0,
    },
    customersHandled: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
  },
  { timestamps: true }
);

// Compound index to ensure one record per stylist per day
AttendanceSchema.index({ stylistId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", AttendanceSchema);
