import express from "express";
import {
  createCoupon,
  getCoupons,
  deleteCoupon,
  updateCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

// Create coupon
router.post("/", createCoupon);

// Get all coupons
router.get("/", getCoupons);

// Update coupon
router.put("/:id", updateCoupon);

// Delete coupon
router.delete("/:id", deleteCoupon);

export default router;
