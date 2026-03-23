import express from "express";
import Booking from "../models/Booking.js";
import {
  createBooking,
  getAllBookings,
  deleteBooking,
  updateBooking,
  createPaymentOrder,
  verifyPayment,
  confirmBooking,
  cancelBooking
} from "../controllers/bookingController.js";

const router = express.Router();

/* ===============================
   CREATE BOOKING
================================ */

router.post("/", createBooking);

// duplicate endpoints so frontend can use both names
router.post("/payment", createPaymentOrder);
router.post("/create-payment", createPaymentOrder);

// verify path used by payment success page
router.post("/payment/verify", verifyPayment);
router.post("/verify-payment", verifyPayment);

/* ===============================
   GET ALL BOOKINGS
================================ */

router.get("/", getAllBookings);

/* ===============================
   GET BOOKING TIMINGS

   Optional query param: ?date=YYYY-MM-DD
   Returns a list of existing bookings with their date/time.
   If a `date` is provided, returns only timings for that date (useful for availability checks).
   Response format is always { ok: true, timings: [...] }.
================================ */

router.get("/timings", async (req, res) => {
  const { date } = req.query;

  try {
    const filter = date ? { date } : {};
    const bookings = await Booking.find(filter, "date time -_id").lean();

    // Deduplicate repeated date/time pairs
    const uniqueTimings = Array.from(
      new Map(bookings.map((b) => [`${b.date}||${b.time}`, b])).values(),
    );

    res.json({ ok: true, timings: uniqueTimings });
  } catch (error) {
    console.error("Error fetching booking timings:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch booking timings",
    });
  }
});

/* ===============================
   UPDATE / DELETE
================================ */

router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);

/* ===============================
   CUSTOMER ACTIONS FROM EMAIL
================================ */

router.get("/:id/confirm", confirmBooking);
router.get("/:id/cancel", cancelBooking);

export default router;