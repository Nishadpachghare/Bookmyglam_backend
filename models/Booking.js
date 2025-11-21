import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },
  price: { type: Number, default: 0 },
  duration: { type: String },
});

const BookingSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    date: { type: String, required: true },
    time: { type: String, required: true },
    services: [ServiceSchema],
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    stylistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stylist",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
