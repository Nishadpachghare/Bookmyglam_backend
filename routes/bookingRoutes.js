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
  cancelBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

/* ===============================
   CREATE BOOKING
================================ */
router.post("/", createBooking);

// Duplicate endpoints so frontend can use both names
router.post("/payment", createPaymentOrder);
router.post("/create-payment", createPaymentOrder);

// Verify path used by payment success page
router.post("/payment/verify", verifyPayment);
router.post("/verify-payment", verifyPayment);

/* ===============================
   GET ALL BOOKINGS
================================ */
router.get("/", getAllBookings);

/* ===============================
   GET BOOKING TIMINGS
   IMPORTANT: Must be defined BEFORE /:id
   otherwise Express matches "timings" as an id

   Query params:
     ?date=YYYY-MM-DD  → filter by date
     ?stylistId=xxx    → filter by stylist

   Response: { ok: true, timings: [...] }
================================ */
router.get("/timings", async (req, res) => {
  try {
    // DB connection check
    if (!req.isDbConnected) {
      return res.status(503).json({
        ok: false,
        message: "Database unavailable, please retry",
        timings: [],
      });
    }

    const { date, stylistId } = req.query;

    // Build filter
    const filter = {};
    if (date) filter.date = date;
    if (stylistId) filter.stylistId = stylistId;

    // Only fetch non-cancelled bookings
    filter.status = { $nin: ["cancelled", "canceled"] };

    const bookings = await Booking.find(filter, "date time stylistId -_id").lean();

    // Deduplicate repeated date/time pairs
    const uniqueTimings = Array.from(
      new Map(
        bookings.map((b) => [`${b.date}||${b.time}`, b])
      ).values()
    );

    res.json({ ok: true, timings: uniqueTimings });
  } catch (error) {
    console.error("Error fetching booking timings:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch booking timings",
      timings: [],
    });
  }
});

/* ===============================
   CUSTOMER ACTIONS FROM EMAIL
   IMPORTANT: Also before /:id to avoid
   Express matching "confirm"/"cancel" as id
================================ */
router.get("/:id/confirm", confirmBooking);
router.get("/:id/cancel", cancelBooking);

/* ===============================
   UPDATE / DELETE
   Keep /:id routes LAST always
================================ */
router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);

export default router;