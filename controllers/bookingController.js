// controllers/bookingController.js
import Booking from "../models/Booking.js";
import Otp from "../models/Otp.js";
import { sendEmail } from "../Utils/emailSender.js";
import { bookingConfirmationHtml } from "../Utils/emailTemplates.js";

/**
 * CREATE BOOKING
 * - Normalizes services array (supports both selectedServices and services)
 * - Requires email to have a verified OTP in Otp collection
 * - Creates booking
 * - Sends confirmation email (best-effort; booking still succeeds if email send fails)
 */
export const createBooking = async (req, res) => {
  try {
    const {
      selectedServices,
      services,
      customerName,
      phone,
      email,
      date,
      time,
      paymentStatus,
    } = req.body;

    // Normalize services array (accepts different shapes from frontend)
    const servicesArray =
      services && Array.isArray(services) && services.length
        ? services.map((s) => ({
            serviceName: s.serviceName ?? s.service ?? "",
            price: Number(s.price) || 0,
            duration: s.duration ?? s.time ?? "",
          }))
        : (selectedServices || []).map((s) => ({
            // selectedServices items might be objects with different props
            serviceName: s.serviceName ?? s.service ?? "",
            price: Number(s.price ?? s.amount ?? 0) || 0,
            duration: s.duration ?? s.time ?? "",
          }));

    if (!servicesArray.length) {
      return res.status(400).json({ ok: false, message: "Please select at least one service" });
    }

    // Email must be present
    if (!email) {
      return res.status(400).json({ ok: false, message: "Email is required" });
    }

    // Ensure email has a verified OTP
    const otpDoc = await Otp.findOne({ to: email, verified: true }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(400).json({ ok: false, message: "Email not verified with OTP" });
    }

    // Build booking data
    const bookingData = {
      customerName,
      phone,
      email,
      date,
      time,
      paymentStatus: paymentStatus || "Pending",
      services: servicesArray,
    };

    // Create booking
    const booking = await Booking.create(bookingData);

    // Attempt to send confirmation email (best-effort)
    try {
      const html = bookingConfirmationHtml({
        customerName: booking.customerName,
        services: booking.services,
        date: booking.date,
        time: booking.time,
        bookingId: booking._id?.toString?.() ?? "",
      });

      await sendEmail({
        to: booking.email,
        subject: "Booking Confirmation — Your Salon",
        html,
      });
    } catch (err) {
      console.error("Failed to send booking confirmation email:", err);
      // Return 201 but let frontend know email failed (so they can retry later if desired)
      return res.status(201).json({
        ok: true,
        message: "Booking created, but confirmation email failed to send",
        booking,
      });
    }

    return res.status(201).json({ ok: true, message: "Booking added successfully", booking });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    return res.status(500).json({
      ok: false,
      message: "Server error while creating booking",
      details: error.message,
    });
  }
};

// ===========================================
// GET ALL BOOKINGS
// ===========================================
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    // Return the raw bookings array for simpler frontend consumption
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("❌ Error fetching bookings:", error.stack || error);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch bookings",
      details: error.message,
    });
  }
};

// ===========================================
// DELETE BOOKING
// ===========================================
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    return res.status(200).json({ ok: true, message: "Booking deleted successfully", deletedBooking });
  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    return res.status(500).json({
      ok: false,
      message: "Server error while deleting booking",
      details: error.message,
    });
  }
};

// ===========================================
// UPDATE BOOKING
// ===========================================
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔥 PUT /api/bookings/:id called with id =", id);
    console.log("Body from frontend:", req.body);

    // Normalize services (price to Number) if provided
    let updateData = { ...req.body };

    if (Array.isArray(updateData.services)) {
      updateData.services = updateData.services.map((s) => ({
        serviceName: s.serviceName ?? s.service ?? "",
        price: Number(s.price ?? 0) || 0,
        duration: s.duration ?? s.time ?? "",
      }));
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBooking) {
      console.log("⚠️ Booking not found in DB for id =", id);
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    console.log("✅ Booking updated:", updatedBooking._id);

    return res.status(200).json({ ok: true, message: "Booking updated successfully", booking: updatedBooking });
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    return res.status(500).json({
      ok: false,
      message: "Server error while updating booking",
      details: error.message,
    });
  }
};
