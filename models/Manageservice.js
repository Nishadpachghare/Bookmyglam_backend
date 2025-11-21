import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  service: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  price: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("Service", serviceSchema);