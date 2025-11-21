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
}, { timestamps: true });

export default mongoose.model("Stylist", stylistSchema);