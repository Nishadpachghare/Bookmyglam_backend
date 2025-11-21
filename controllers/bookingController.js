import Booking from "../models/Booking.js";

// ===========================================
// CREATE BOOKING
// ===========================================
export const createBooking = async (req, res) => {
  try {
    const {
      selectedServices, // used by your booking page
      services,         // allow direct services array too (optional)
      customerName,
      phone,
      email,
      date,
      time,
      paymentStatus,
    } = req.body;

    // allow both shapes: selectedServices or services
    const servicesArray =
      services && services.length
        ? services.map((s) => ({
            serviceName: s.serviceName,
            price: Number(s.price) || 0,
            duration: s.duration || "",
          }))
        : (selectedServices || []).map((s) => ({
            serviceName: s.service,
            price: Number(s.price) || 0,
            duration: s.duration || "",
          }));

    if (!servicesArray.length) {
      return res
        .status(400)
        .json({ message: "Please select at least one service" });
    }

    const bookingData = {
      customerName,
      phone,
      email,
      date,
      time,
      paymentStatus: paymentStatus || "Pending",
      services: servicesArray,
    };

    const booking = await Booking.create(bookingData);
    return res
      .status(201)
      .json({ message: "Booking added successfully", booking });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    return res.status(500).json({
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
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    return res.status(500).json({
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
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({
      message: "Booking deleted successfully",
      deletedBooking,
    });
  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    return res.status(500).json({
      message: "Server error while deleting booking",
      details: error.message,
    });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔥 PUT /api/bookings/:id called with id =", id);
    console.log("Body from frontend:", req.body);

    // Normalize services (price to Number)
    let updateData = { ...req.body };

    if (Array.isArray(updateData.services)) {
      updateData.services = updateData.services.map((s) => ({
        serviceName: s.serviceName,
        price: Number(s.price) || 0,
        duration: s.duration || "",
      }));
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBooking) {
      console.log("⚠️ Booking not found in DB for id =", id);
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("✅ Booking updated:", updatedBooking._id);

    return res.status(200).json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    return res.status(500).json({
      message: "Server error while updating booking",
      details: error.message,
    });
  }
};
