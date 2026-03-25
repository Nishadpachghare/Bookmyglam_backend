import express from "express";
import {
  createCoupon,
  getCoupons,
  deleteCoupon,
  updateCoupon,
  validateCoupon,
  validateDiscount,
  toggleCouponActive,
} from "../controllers/couponController.js";

const router = express.Router();

// Create coupon
router.post("/", createCoupon);

// Get all coupons
router.get("/", getCoupons);

// Validate coupon
router.post("/validate", validateCoupon);

// Unified validation for coupons & offers
router.post("/validate-discount", validateDiscount);

// Toggle coupon active status
router.put("/:id/toggle-active", toggleCouponActive);

// Update coupon
router.put("/:id", updateCoupon);

// Delete coupon
router.delete("/:id", deleteCoupon);

export default router;
