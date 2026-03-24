import express from "express";
import { upload } from "../config/multer.js";
import {
  createOffer,
  getOffers,
  getActiveOffers,
  updateOffer,
  deleteOffer,
  publishOffer,
  unpublishOffer,
} from "../controllers/offerController.js";

const router = express.Router();

// ── Multer error handler ──────────────────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error("[Multer Error]:", err.message);
    return res.status(400).json({ success: false, error: "File upload error: " + err.message });
  }
  next();
};

// ── Multer middleware wrapper ──────────────────────────────────────────────────
const uploadSingle = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("[Multer Error]:", err.message);
      return res.status(400).json({ success: false, error: "File upload error: " + err.message });
    }
    // ── Debug log — check terminal after every POST ──
    console.log("📋 Content-Type:", req.headers["content-type"]);
    console.log("📦 req.body:", req.body);
    console.log("📁 req.file:", req.file ? `File: ${req.file.originalname}` : "No file");
    next();
  });
};

// ── DEBUG route — test in browser ─────────────────────────────────────────────
// GET http://localhost:5000/api/offers/debug-test
router.get("/debug-test", (req, res) => {
  res.json({
    message: "Debug route working",
    body: req.body,
    contentType: req.headers["content-type"],
    isMultipart: req.headers["content-type"]?.includes("multipart"),
  });
});

// ── GET ACTIVE — must be before /:id ──────────────────────────────────────────
router.get("/active", getActiveOffers);

// ── GET ALL ───────────────────────────────────────────────────────────────────
router.get("/", getOffers);

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post("/", uploadSingle, createOffer);

// ── PUBLISH / UNPUBLISH — must be before /:id ─────────────────────────────────
router.put("/publish/:id",   publishOffer);
router.put("/unpublish/:id", unpublishOffer);

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put("/:id", uploadSingle, updateOffer);

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", deleteOffer);

export default router;