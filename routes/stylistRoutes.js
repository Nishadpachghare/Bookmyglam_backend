import express from "express";
import multer from "multer";
import Stylist from "../models/Stylist.js";

const router = express.Router();

// ===== MULTER SETUP =====
// Use memory storage (we can later replace this with Cloudinary upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ===== ADD NEW STYLIST =====
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    // Accessing text fields (formData automatically parsed by multer)
    const { name, phone, email, role } = req.body;

    if (!name || !phone || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // (Optional) store base64 preview for now
    let photo = null;
    if (req.file) {
      photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const newStylist = new Stylist({
      name,
      phone,
      email,
      role,
      photo,
      status: "active",
    });

    const savedStylist = await newStylist.save();
    res.status(201).json({
      message: "Stylist added successfully",
      stylist: savedStylist,
    });
  } catch (err) {
    console.error("Error creating stylist:", err);
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
