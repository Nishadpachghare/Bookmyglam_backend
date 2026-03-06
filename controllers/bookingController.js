import Booking from "../models/Booking.js";
import Otp from "../models/Otp.js";
import axios from "axios";
import { sendEmail } from "../Utils/emailSender.js";
import { bookingConfirmationHtml } from "../Utils/emailTemplates.js";


/* ======================================================
   CREATE BOOKING
====================================================== */

export const createBooking = async (req, res) => {
  try {

    const {
      selectedServices,
      customerName,
      phone,
      email,
      date,
      time,
      mode,
      stylist
    } = req.body;

    // simple validation to prevent Mongoose from throwing
    if (!selectedServices || selectedServices.length === 0) {
      return res.status(400).json({ ok: false, message: "Select at least one service" });
    }
    if (!customerName || !phone || !date || !time) {
      return res.status(400).json({ ok: false, message: "Missing required booking fields" });
    }

    // OTP CHECK
    const otpDoc = await Otp.findOne({ to: email, verified: true });

    if (!otpDoc) {
      return res.status(400).json({
        ok:false,
        message:"Email not verified"
      });
    }

    const services = selectedServices.map(s => ({
      // support both field names just in case client is out-of-sync
      serviceName: s.serviceName ?? s.service ?? "",
      price: Number(s.price),
      duration: s.duration || ""
    }));

    const booking = await Booking.create({

      customerName,
      phone,
      email,
      date,
      time,

      services,

      stylistId: stylist || null,

      mode: mode || "offline",
      paymentStatus:"Pending"

    });

    // SEND CONFIRMATION EMAIL
    try{

      const html = bookingConfirmationHtml({
        customerName: booking.customerName,
        services: booking.services,
        date: booking.date,
        time: booking.time,
        bookingId: booking._id
      });

      await sendEmail({
        to: booking.email,
        subject:"Salon Booking Confirmation",
        html
      });

    }catch(err){
      console.log("Email failed:",err);
    }

    res.status(201).json({
      ok:true,
      booking
    });

  }
  catch(error){

    console.log("Create booking error:",error);

    res.status(500).json({
      ok:false,
      message:"Booking creation failed"
    });

  }
};



/* ======================================================
   GET ALL BOOKINGS
====================================================== */

export const getAllBookings = async (req,res)=>{
  try{

    const bookings = await Booking.find()
      .sort({createdAt:-1});

    res.json(bookings);

  }
  catch(error){

    res.status(500).json({
      message:"Failed to fetch bookings"
    });

  }
};



/* ======================================================
   DELETE BOOKING
====================================================== */

export const deleteBooking = async (req,res)=>{

  try{

    const {id} = req.params;

    await Booking.findByIdAndDelete(id);

    res.json({
      ok:true,
      message:"Booking deleted"
    });

  }
  catch(error){

    res.status(500).json({
      message:"Delete failed"
    });

  }

};



/* ======================================================
   UPDATE BOOKING
====================================================== */

export const updateBooking = async (req,res)=>{

  try{

    const {id} = req.params;

    const updated = await Booking.findByIdAndUpdate(
      id,
      req.body,
      {new:true}
    );

    res.json({
      ok:true,
      booking:updated
    });

  }
  catch(error){

    res.status(500).json({
      message:"Update failed"
    });

  }

};



/* ======================================================
   CREATE CASHFREE PAYMENT
====================================================== */

export const createPaymentOrder = async (req,res)=>{

  try{

    const {bookingId,amount} = req.body;

    const booking = await Booking.findById(bookingId);

    if(!booking){
      return res.status(404).json({
        message:"Booking not found"
      });
    }

    const orderId = "order_" + Date.now();

    const response = await axios.post(

      "https://sandbox.cashfree.com/pg/orders",

      {
        order_id:orderId,
        order_amount:amount,
        order_currency:"INR",

        customer_details:{
          customer_id:booking._id.toString(),
          customer_email:booking.email,
          customer_phone:booking.phone
        },

        order_meta:{
          return_url:`http://localhost:3000/payment-success?order_id=${orderId}`
        }

      },

      {
        headers:{
          "Content-Type":"application/json",
          "x-api-version":"2022-09-01",
          "x-client-id":process.env.CASHFREE_APP_ID,
          "x-client-secret":process.env.CASHFREE_SECRET_KEY
        }
      }

    );

    booking.paymentOrderId = orderId;
    booking.mode = "online";

    await booking.save();

    res.json({
      payment_link:response.data.payment_link
    });

  }
  catch(error){

    console.log("Cashfree error:",error.response?.data || error.message);

    res.status(500).json({
      message:"Payment creation failed"
    });

  }

};



/* ======================================================
   VERIFY PAYMENT
====================================================== */

export const verifyPayment = async (req,res)=>{

  try{

    const {orderId} = req.body;

    const booking = await Booking.findOne({
      paymentOrderId:orderId
    });

    if(!booking){
      return res.status(404).json({
        ok:false
      });
    }

    const response = await axios.get(

      `https://sandbox.cashfree.com/pg/orders/${orderId}`,

      {
        headers:{
          "x-api-version":"2022-09-01",
          "x-client-id":process.env.CASHFREE_APP_ID,
          "x-client-secret":process.env.CASHFREE_SECRET_KEY
        }
      }

    );

    if(response.data.order_status === "PAID"){

      booking.paymentStatus = "Paid";

      await booking.save();

    }

    res.json({
      ok:true
    });

  }
  catch(error){

    console.log("Verify payment error:",error);

    res.status(500).json({
      ok:false
    });

  }

};