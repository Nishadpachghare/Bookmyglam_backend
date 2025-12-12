// routes/authRoutes.js
import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// OTP
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);  

export default router;
