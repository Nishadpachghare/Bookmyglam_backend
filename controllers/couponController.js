import Coupon from "../models/coupon.js";
import Offer from "../models/offer.js";
import { resolveDiscount } from "../Utils/discountUtils.js";

// CREATE COUPON
export const createCoupon = async (req, res) => {
  try {
    const { code, discount } = req.body;

    // Strict validation check
    if (!code || discount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code and discount are required",
      });
    }

    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Database Save Error:", error);

    // Handle unique constraint violation
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
        error: error.message,
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
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE COUPON
export const updateCoupon = async (req, res) => {
  try {
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
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

    // Calculate discount amount
    const discountAmount = (totalAmount * coupon.discount) / 100;
    const finalAmount = totalAmount - discountAmount;

    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      data: {
        code: coupon.code,
        discount: coupon.discount,
        discountAmount: Math.round(discountAmount),
        finalAmount: Math.round(finalAmount),
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
    const result = await resolveDiscount({
      code,
      totalAmount,
      selectedServices,
    });

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json(result);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code or Offer is required",
      });
    }

    // Try to validate as coupon first
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (coupon) {
      // COUPON VALIDATION
      if (!coupon.active) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is not active",
        });
      }

      if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
        return res.status(400).json({
          success: false,
          message: "Coupon code has expired",
        });
      }

      if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) {
        return res.status(400).json({
          success: false,
          message: "Coupon is not yet valid",
        });
      }

      if (coupon.validTill && new Date() > new Date(coupon.validTill)) {
        return res.status(400).json({
          success: false,
          message: "Coupon code has expired",
        });
      }

      if (coupon.minAmount && totalAmount < coupon.minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum booking amount of ₹${coupon.minAmount} required for this coupon`,
        });
      }

      const discountAmount = (totalAmount * coupon.discount) / 100;
      const finalAmount = totalAmount - discountAmount;

      return res.status(200).json({
        success: true,
        type: "coupon",
        message: "Coupon is valid",
        data: {
          code: coupon.code,
          discount: coupon.discount,
          discountAmount: Math.round(discountAmount),
          finalAmount: Math.round(finalAmount),
          description: coupon.description,
        },
      });
    }

    // Try to validate as offer
    const offer = await Offer.findOne({ title: code });
    
    if (offer) {
      // OFFER VALIDATION
      if (!offer.active || !offer.published) {
        return res.status(400).json({
          success: false,
          message: "Offer is not available",
        });
      }

      const now = new Date();
      if (offer.startDate && new Date(offer.startDate) > now) {
        return res.status(400).json({
          success: false,
          message: "Offer has not started yet",
        });
      }

      if (offer.endDate && new Date(offer.endDate) < now) {
        return res.status(400).json({
          success: false,
          message: "Offer has ended",
        });
      }

      // Check if offer applies to selected services
      if (offer.services && offer.services.length > 0 && selectedServices && selectedServices.length > 0) {
        const hasApplicableService = selectedServices.some(service =>
          offer.services.some(offerService => 
            offerService.toLowerCase() === service.toLowerCase()
          )
        );

        if (!hasApplicableService) {
          return res.status(400).json({
            success: false,
            message: `Offer is only applicable for: ${offer.services.join(", ")}`,
          });
        }
      }

      const discountAmount = (totalAmount * offer.discount) / 100;
      const finalAmount = totalAmount - discountAmount;

      return res.status(200).json({
        success: true,
        type: "offer",
        message: "Offer is valid",
        data: {
          code: offer.title,
          discount: offer.discount,
          discountAmount: Math.round(discountAmount),
          finalAmount: Math.round(finalAmount),
          description: offer.description,
        },
      });
    }

    // Neither coupon nor offer found
    return res.status(404).json({
      success: false,
      message: "Invalid coupon code or offer",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error validating discount",
      error: error.message,
    });
  }
};
