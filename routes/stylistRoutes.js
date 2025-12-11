import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Stylist from "../models/Stylist.js";

const router = express.Router();

// ===== MULTER + Cloudinary SETUP =====
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stylists",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage });

// ===== ADD NEW STYLIST =====
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    // Accessing text fields (formData automatically parsed by multer)
    const { name, phone, email, role } = req.body;

    if (!name || !phone || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Prepare photo URL (CloudinaryStorage exposes `path` or secure_url)
    const photoUrl = req.file && (req.file.path || req.file.secure_url || req.file.url)
      ? (req.file.path || req.file.secure_url || req.file.url)
      : "";

    const newStylist = new Stylist({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      role,
      photoUrl,
      status: "active",
    });

    const savedStylist = await newStylist.save();
    res.status(201).json({ message: "Stylist added successfully", stylist: savedStylist });
  } catch (err) {
    console.error("Error creating stylist:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== GET ALL STYLISTS =====
router.get("/", async (req, res) => {
  try {
    const stylists = await Stylist.find();
    res.json(stylists);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stylists", error: err.message });
  }
});

// ===== SET STYLIST AS INACTIVE =====
router.put("/:id/inactive", async (req, res) => {
  try {
    const stylist = await Stylist.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist marked as inactive", stylist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== SET STYLIST AS ACTIVE =====
router.put("/:id/active", async (req, res) => {
  try {
    const stylist = await Stylist.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist reactivated", stylist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== DELETE STYLIST =====
router.delete("/:id", async (req, res) => {
  try {
    const stylist = await Stylist.findByIdAndDelete(req.params.id);
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
