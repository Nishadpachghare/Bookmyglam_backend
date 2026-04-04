import mongoose from "mongoose";

const stylistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    required: true, 
    enum: ["senior", "junior", "colorist", "assistant"]
  },
  photoUrl: { type: String, default: "" },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  // Shift timings
  shiftStartTime: { type: String, default: "10:00" }, // HH:MM format
  shiftEndTime: { type: String, default: "18:00" }, // HH:MM format
  
  // Holidays and leaves
  holidays: [{ type: String }], // Array of dates in YYYY-MM-DD format
  halfDays: [{ type: String }], // Array of dates in YYYY-MM-DD format
  
  // Performance metrics (calculated)
  totalCustomers: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  
  // Performance tracking
  performance: {
    customersThisMonth: { type: Number, default: 0 },
    revenueThisMonth: { type: Number, default: 0 },
    averageCustomersPerDay: { type: Number, default: 0 },
  }
}, { timestamps: true });

export default mongoose.model("Stylist", stylistSchema);