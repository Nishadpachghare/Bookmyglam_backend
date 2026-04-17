import Coupon from "../models/coupon.js";
import Offer from "../models/offer.js";
import { resolveDiscount } from "../Utils/discountUtils.js";

// CREATE COUPON
export const createCoupon = async (req, res) => {
  try {
    const { code, discount, services } = req.body;

    if (!code || discount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code and discount are required",
      });
    }

    const discountValue = Number(discount);
    if (discountValue < 0 || discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Discount must be between 0 and 100",
      });
    }

    const couponData = {
      code: code.toUpperCase().trim(),
      discount: discountValue,
      description: req.body.description || "",
      minAmount: Number(req.body.minAmount) || 0,
      services: Array.isArray(services) ? services.filter(s => s?.trim()) : [],
      validFrom: req.body.validFrom || null,
      validTill: req.body.validTill || null,
      expiryDate: req.body.expiryDate || null,
      active: req.body.active !== false,
    };

    const coupon = await Coupon.create(couponData);

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Coupon creation error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating coupon",
      error: error.message,
    });
  }
};

// GET ALL COUPONS
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE COUPON
export const updateCoupon = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.discount !== undefined) {
      const discountValue = Number(req.body.discount);
      if (discountValue < 0 || discountValue > 100) {
        return res.status(400).json({
          success: false,
          message: "Discount must be between 0 and 100",
        });
      }
      updateData.discount = discountValue;
    }

    if (req.body.code !== undefined) updateData.code = req.body.code.toUpperCase().trim();
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.minAmount !== undefined) updateData.minAmount = Number(req.body.minAmount);
    if (req.body.services !== undefined) {
      updateData.services = Array.isArray(req.body.services) ? req.body.services.filter(s => s?.trim()) : [];
    }
    if (req.body.validFrom !== undefined) updateData.validFrom = req.body.validFrom || null;
    if (req.body.validTill !== undefined) updateData.validTill = req.body.validTill || null;
    if (req.body.expiryDate !== undefined) updateData.expiryDate = req.body.expiryDate || null;
    if (req.body.active !== undefined) updateData.active = req.body.active !== false;

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated",
      data: updatedCoupon,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE COUPON
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// VALIDATE COUPON
export const validateCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    // Find coupon by code (case-insensitive)
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon code is invalid or not available",
      });
    }

    // Check if coupon is active
    if (!coupon.active) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is not active",
      });
    }

    // Check if coupon has expiry date and if it's expired
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Coupon code has expired",
      });
    }

    // Check if coupon is valid from date
    if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not yet valid",
      });
    }

    // Check if coupon is still valid until date
    if (coupon.validTill && new Date() > new Date(coupon.validTill)) {
      return res.status(400).json({
        success: false,
        message: "Coupon code has expired",
      });
    }

    // Check minimum amount requirement
    if (coupon.minAmount && totalAmount < coupon.minAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount of ₹${coupon.minAmount} required for this coupon`,
      });
    }

    // Calculate discount amount - FIX: Ensure correct percentage calculation
    const discountPercentage = Math.min(Number(coupon.discount || 0), 100); // Cap at 100%
    const discountAmount = Math.round((totalAmount * discountPercentage) / 100);
    const finalAmount = Math.round(totalAmount - discountAmount);

    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      data: {
        code: coupon.code,
        discount: discountPercentage,
        discountAmount,
        finalAmount,
        description: coupon.description,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error validating coupon",
      error: error.message,
    });
  }
};

// TOGGLE COUPON ACTIVE STATUS
export const toggleCouponActive = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Toggle active status
    coupon.active = !coupon.active;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.active ? "activated" : "deactivated"} successfully`,
      data: coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling coupon status",
      error: error.message,
    });
  }
};

// UNIFIED VALIDATION FOR BOTH COUPONS & OFFERS
export const validateDiscount = async (req, res) => {
  try {
    const { code, totalAmount, selectedServices } = req.body;
    console.log("📋 validateDiscount called with:", {
      code,
      totalAmount,
      selectedServicesCount: selectedServices?.length,
      selectedServices: selectedServices?.map(s => s.serviceName),
    });

    const result = await resolveDiscount({
      code,
      totalAmount,
      selectedServices,
    });

    console.log("✅ resolveDiscount result:", result);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    // ✅ ENSURE CORRECT RESPONSE STRUCTURE
    const responseData = {
      success: true,
      type: result.type,
      message: result.message,
      data: {
        code: result.data.code,
        discount: result.data.discount,
        discountAmount: result.data.discountAmount,
        finalAmount: result.data.finalAmount,
        applicableAmount: result.data.applicableAmount,
        appliedServices: result.data.appliedServices,
        description: result.data.description,
      },
    };

    console.log("📤 Sending response:", responseData);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Error in validateDiscount:", error);
    res.status(500).json({
      success: false,
      message: "Error validating discount",
      error: error.message,
    });
  }
};
