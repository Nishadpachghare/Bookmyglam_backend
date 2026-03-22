import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Stylist from "../models/Stylist.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stylists",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage });

// ADD NEW STYLIST
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({ ok: false, message: "Database unavailable, please retry" });
    }

    const { name, phone, email, role } = req.body;
    if (!name || !phone || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const photoUrl =
      req.file?.path || req.file?.secure_url || req.file?.url || "";

    const newStylist = new Stylist({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      role,
      photoUrl,
      status: "active",
    });

    const savedStylist = await newStylist.save();

    let welcomeEmailStatus = "none";
    try {
      const { sendEmail } = await import("../Utils/emailSender.js");
      const { stylistWelcomeHtml } = await import("../Utils/emailTemplates.js");
      const html = stylistWelcomeHtml({ name: savedStylist.name, role: savedStylist.role });
      const emailResult = await sendEmail({
        to: savedStylist.email,
        subject: "Welcome to Our Salon - Next Steps",
        html,
      });
      welcomeEmailStatus = emailResult?.ok
        ? emailResult.fallback ? "fallback" : "sent"
        : "failed";
    } catch (emailErr) {
      welcomeEmailStatus = "error";
      console.warn("Welcome email failed:", emailErr?.message || emailErr);
    }

    res.status(201).json({ message: "Stylist added successfully", stylist: savedStylist, welcomeEmailStatus });
  } catch (err) {
    console.error("Error creating stylist:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET ALL STYLISTS
router.get("/", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(200).json({ ok: false, message: "Database unavailable, please retry", data: [] });
    }

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.role) filter.role = req.query.role;

    const stylists = await Stylist.find(filter);
    res.json({ ok: true, data: stylists });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to fetch stylists", error: err.message, data: [] });
  }
});

// SET INACTIVE
router.put("/:id/inactive", async (req, res) => {
  try {
    if (!req.isDbConnected) return res.status(503).json({ ok: false, message: "Database unavailable" });
    const stylist = await Stylist.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist marked as inactive", stylist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SET ACTIVE
router.put("/:id/active", async (req, res) => {
  try {
    if (!req.isDbConnected) return res.status(503).json({ ok: false, message: "Database unavailable" });
    const stylist = await Stylist.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist reactivated", stylist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    if (!req.isDbConnected) return res.status(503).json({ ok: false, message: "Database unavailable" });
    const stylist = await Stylist.findByIdAndDelete(req.params.id);
    if (!stylist) return res.status(404).json({ message: "Stylist not found" });
    res.json({ message: "Stylist deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;