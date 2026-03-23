// routes/offerRoutes.js
import express from "express";
import Offer from "../models/Offer.js";

const router = express.Router();

// GET /api/offers/active  ← yahi missing tha
router.get("/active", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({
        ok: false,
        message: "Database unavailable, please retry",
        data: [],
      });
    }

    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }).sort({ createdAt: -1 });

    res.json({ ok: true, data: offers });
  } catch (err) {
    console.error("offers/active error:", err);
    res.status(500).json({ ok: false, message: err.message, data: [] });
  }
});

// GET /api/offers
router.get("/", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({ ok: false, message: "Database unavailable", data: [] });
    }
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ ok: true, data: offers });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message, data: [] });
  }
});

// POST /api/offers
router.post("/", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({ ok: false, message: "Database unavailable" });
    }
    const offer = await Offer.create(req.body);
    res.status(201).json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/offers/:id
router.put("/:id", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({ ok: false, message: "Database unavailable" });
    }
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!offer) return res.status(404).json({ ok: false, message: "Offer not found" });
    res.json({ ok: true, data: offer });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/offers/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!req.isDbConnected) {
      return res.status(503).json({ ok: false, message: "Database unavailable" });
    }
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ ok: false, message: "Offer not found" });
    res.json({ ok: true, message: "Offer deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;