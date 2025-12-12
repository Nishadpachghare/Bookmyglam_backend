// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set in .env. Set it to a secure random string.");
}

// Helper to create token
const createToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// Register a new user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: "Please provide name, email and password" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email address" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ ok: false, message: "User already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword });

    // Optionally return token on register
    const token = createToken({ id: user._id });

    return res.status(201).json({
      ok: true,
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    console.error("Register Error:", error);
    // duplicate key error (unique email) check
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Please provide email and password" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email address" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const token = createToken({ id: user._id });

    return res.status(200).json({
      ok: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};
