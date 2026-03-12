import express from "express";
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

router.post("/", createBooking);      

// duplicate endpoints so frontend can use both names
router.post("/payment", createPaymentOrder);
router.post("/create-payment", createPaymentOrder);

// verify path used by payment success page
router.post("/payment/verify", verifyPayment);
router.post("/verify-payment", verifyPayment);

router.get("/", getAllBookings);      
router.put("/:id", updateBooking);    
router.delete("/:id", deleteBooking); 

// customer actions from reminder email
router.get("/:id/confirm", confirmBooking);
router.get("/:id/cancel", cancelBooking);

export default router;
