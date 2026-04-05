import Booking from "../models/Booking.js";
import Otp from "../models/Otp.js";
import Coupon from "../models/coupon.js";
import axios from "axios";
import { sendEmail } from "../Utils/emailSender.js";
import { bookingConfirmationHtml, cancellationNotificationHtml } from "../Utils/emailTemplates.js";
import { resolveDiscount } from "../Utils/discountUtils.js";


/* ======================================================
   CREATE BOOKING
====================================================== */

export const createBooking = async (req, res) => {
  try {
    console.log("📝 CREATE BOOKING REQUEST RECEIVED");
    console.log("📦 Full Request Body:", JSON.stringify(req.body, null, 2));

    const {
      selectedServices,
      customerName,
      phone,
      email,
      date,
      time,
      mode,
      stylist,
      couponCode,
      paymentVerified,
      orderId
    } = req.body;

    console.log("✅ Extracted fields:", {
      selectedServices: selectedServices?.length || 0,
      customerName,
      phone,
      email,
      date,
      time,
      mode,
      stylist,
      couponCode,
      paymentVerified,
      orderId
    });

    // simple validation to prevent Mongoose from throwing
    if (!selectedServices || selectedServices.length === 0) {
      console.error("❌ No services provided");
      return res.status(400).json({ ok: false, message: "Select at least one service" });
    }
    if (!customerName || !phone || !date || !time) {
      console.error("❌ Missing required fields. Provided:", { customerName, phone, date, time });
      return res.status(400).json({ ok: false, message: "Missing required booking fields" });
    }

    // OTP CHECK - Skip if payment is already verified online
    const otpDoc = await Otp.findOne({ to: email, verified: true });

    if (!otpDoc) {
      // If payment was verified via payment gateway, allow booking even without fresh OTP
      if (!(paymentVerified && mode === "online")) {
        return res.status(400).json({
          ok: false,
          message: "Email not verified. Please verify your email first."
        });
      }
      // Log for payment-verified bookings that bypass OTP check
      console.log(`Payment-verified booking created for ${email} without OTP verification`);
    }

    const services = selectedServices.map(s => ({
      // support both field names just in case client is out-of-sync
      serviceName: s.serviceName ?? s.service ?? "",
      price: Number(s.price),
      duration: s.duration || ""
    }));

    // Calculate total amount from services
    const totalAmount = services.reduce((total, s) => total + s.price, 0);

    // Initialize discount data
    let discountPercentage = 0;
    let discountAmount = 0;
    let finalAmount = totalAmount;
    let appliedCouponCode = null;

    if (couponCode && couponCode.trim()) {
      try {
        const result = await resolveDiscount({
          code: couponCode,
          totalAmount,
          selectedServices: services,
        });

        if (!result.success) {
          return res.status(400).json({
            ok: false,
            message: result.message
          });
        }

        discountPercentage = result.data.discount;
        discountAmount = result.data.discountAmount;
        finalAmount = result.data.finalAmount;
        appliedCouponCode = result.data.code;
      } catch (error) {
        console.error("Discount validation error:", error);
        return res.status(400).json({
          ok: false,
          message: "Error validating coupon or offer"
        });
      }
    }

    // Validate and apply coupon if provided
    if (false && couponCode && couponCode.trim()) {
      try {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

        if (!coupon) {
          return res.status(400).json({
            ok: false,
            message: "Coupon code is invalid or not available"
          });
        }

        // Check if coupon has expiry date and if it's expired
        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
          return res.status(400).json({
            ok: false,
            message: "Coupon code has expired"
          });
        }

        // Check if coupon is valid from date
        if (coupon.validFrom && new Date() < new Date(coupon.validFrom)) {
          return res.status(400).json({
            ok: false,
            message: "Coupon is not yet valid"
          });
        }

        // Check if coupon is still valid until date
        if (coupon.validTill && new Date() > new Date(coupon.validTill)) {
          return res.status(400).json({
            ok: false,
            message: "Coupon code has expired"
          });
        }

        // Check minimum amount requirement
        if (coupon.minAmount && totalAmount < coupon.minAmount) {
          return res.status(400).json({
            ok: false,
            message: `Minimum booking amount of ₹${coupon.minAmount} required for this coupon`
          });
        }

        // Apply coupon
        discountPercentage = coupon.discount;
        discountAmount = Math.round((totalAmount * coupon.discount) / 100);
        finalAmount = totalAmount - discountAmount;
        appliedCouponCode = coupon.code;

      } catch (error) {
        console.error("Coupon validation error:", error);
        return res.status(400).json({
          ok: false,
          message: "Error validating coupon"
        });
      }
    }

    const booking = await Booking.create({

      customerName,
      phone,
      email,
      date,
      time,

      services,

      stylistId: stylist || null,

      mode: mode || "offline",
      
      // ✅ SET PAYMENT STATUS BASED ON PAYMENT VERIFICATION
      paymentStatus: paymentVerified && orderId ? "Paid" : "Pending",
      
      // ✅ STORE PAYMENT ORDER ID IF PROVIDED
      paymentOrderId: orderId || null,

      // Auto-confirm bookings that already have a verified online payment
      status: paymentVerified && orderId ? "Confirmed" : "Scheduled",

      // Coupon and discount fields
      couponCode: appliedCouponCode,
      discountPercentage,
      discountAmount,
      totalAmount,
      finalAmount,
      // status defaults to Scheduled via schema
      // reminderSent flag also handled by schema
    });

    console.log("✅ BOOKING CREATED SUCCESSFULLY");
    console.log("📊 Booking Details:", {
      bookingId: booking._id,
      customerName: booking.customerName,
      paymentStatus: booking.paymentStatus,
      mode: booking.mode,
      paymentOrderId: booking.paymentOrderId,
      servicesCount: booking.services.length,
      finalAmount: booking.finalAmount
    });

    // SEND CONFIRMATION EMAIL
    try {

      const html = bookingConfirmationHtml({
        customerName: booking.customerName,
        services: booking.services,
        date: booking.date,
        time: booking.time,
        bookingId: booking._id,
        totalAmount: booking.totalAmount,
        discountAmount: booking.discountAmount,
        finalAmount: booking.finalAmount
      });

      await sendEmail({
        to: booking.email,
        subject: "Salon Booking Confirmation",
        html
      });

    } catch (err) {
      console.log("Email failed:", err);
    }

    res.status(201).json({
      ok: true,
      booking
    });

  }
  catch (error) {

    console.error("❌ CREATE BOOKING ERROR:", error);
    console.error("Error Stack:", error.stack);
    console.error("Error Message:", error.message);

    res.status(500).json({
      ok: false,
      message: error.message || "Booking creation failed"
    });

  }
};



/* ======================================================
   GET ALL BOOKINGS
====================================================== */

export const getAllBookings = async (req, res) => {
  try {

    const bookings = await Booking.find()
      .sort({ createdAt: -1 });

    res.json(bookings);

  }
  catch (error) {

    res.status(500).json({
      message: "Failed to fetch bookings"
    });

  }
};



/* ======================================================
   DELETE BOOKING
====================================================== */

export const deleteBooking = async (req, res) => {

  try {

    const { id } = req.params;

    await Booking.findByIdAndDelete(id);

    res.json({
      ok: true,
      message: "Booking deleted"
    });

  }
  catch (error) {

    res.status(500).json({
      message: "Delete failed"
    });

  }

};



/* ======================================================
   UPDATE BOOKING
====================================================== */

export const updateBooking = async (req, res) => {

  try {

    const { id } = req.params;

    const updated = await Booking.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    res.json({
      ok: true,
      booking: updated
    });

  }
  catch (error) {

    res.status(500).json({
      message: "Update failed"
    });

  }

};



/* ======================================================
   CREATE CASHFREE PAYMENT
====================================================== */

export const createPaymentOrder = async (req, res) => {

  try {

    const { bookingId, amount } = req.body;

    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({
        message: "Cashfree payment gateway not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY."
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    const orderId = "order_" + Date.now();

    const response = await axios.post(

      "https://sandbox.cashfree.com/pg/orders",

      {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",

        customer_details: {
          customer_id: booking._id.toString(),
          customer_email: booking.email,
          customer_phone: booking.phone
        },

        order_meta: {
          return_url: `http://localhost:5173/booking-success`, // frontend route to handle post-payment landing 
        }

      },

      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY
        }
      }

    );

    booking.paymentOrderId = orderId;
    booking.mode = "online";

    await booking.save();

    res.json({
      payment_link: response.data.payment_link
    });

  }
  catch (error) {

    console.log("Cashfree error:", error.response?.data || error.message);

    res.status(500).json({
      message: "Payment creation failed"
    });

  }

};



/* ======================================================
   VERIFY PAYMENT
====================================================== */

export const verifyPayment = async (req, res) => {

  try {

    const { orderId } = req.body;

    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        message: "Cashfree payment gateway not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY."
      });
    }

    const booking = await Booking.findOne({
      paymentOrderId: orderId
    });

    if (!booking) {
      return res.status(404).json({
        ok: false
      });
    }

    const response = await axios.get(

      `https://sandbox.cashfree.com/pg/orders/${orderId}`,

      {
        headers: {
          "x-api-version": "2022-09-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY
        }
      }

    );

    if (response.data.order_status === "PAID") {

      booking.paymentStatus = "Paid";

      await booking.save();

    }

    res.json({
      ok: true
    });

  }
  catch (error) {

    console.log("Verify payment error:", error);

    res.status(500).json({
      ok: false
    });

  }

};

// when the customer clicks a link to confirm their appointment
export const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).send("Booking not found");
    }
    if (booking.status === "Canceled") {
      return res.send("This booking was already canceled.");
    }
    booking.status = "Confirmed";
    await booking.save();
    const frontend = process.env.FRONTEND_URL;
    if (frontend) {
      return res.redirect(`${frontend}/?booking=${booking._id}&status=confirmed`);
    }
    res.send(
      `<html><body><h2>Thank you, your booking has been confirmed.</h2></body></html>`
    );
  } catch (err) {
    console.error("Confirm booking error:", err);
    res.status(500).send("Internal server error");
  }
};

// handle cancellation link
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).send("Booking not found");
    }
    if (booking.status === "Canceled") {
      return res.send("This booking is already canceled.");
    }
    booking.status = "Canceled";
    await booking.save();

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const html = cancellationNotificationHtml({
          customerName: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          services: booking.services,
          date: booking.date,
          time: booking.time,
          bookingId: booking._id,
        });
        await sendEmail({
          to: adminEmail,
          subject: "Booking Cancelled by Customer",
          html,
        });
      } catch (err) {
        console.log("Failed to send admin cancel email:", err);
      }
    }

    const frontend = process.env.FRONTEND_URL;
    if (frontend) {
      return res.redirect(`${frontend}/?booking=${booking._id}&status=canceled`);
    }
    res.send(
      `<html><body><h2>Your booking has been canceled. We have informed the salon.</h2></body></html>`
    );
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).send("Internal server error");
  }
};
