import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  createOffer,
  getOffers,
  getActiveOffers,
  deleteOffer,
  publishOffer,
  updateOffer,
} from "../controllers/offerController.js";

const router = express.Router();

// Setup Multer (Cloudinary-backed) for serverless-safe uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "offers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const upload = multer({ storage });

// Test Route
router.get("/test", (req, res) => {
  res.json({ message: "Offer API working successfully" });
});

// CREATE OFFER (with file upload middleware)
router.post("/", upload.single("image"), createOffer);

// GET ALL OFFERS
router.get("/", getOffers);

// GET ACTIVE OFFERS
router.get("/active", getActiveOffers);

// PUBLISH OFFER
router.put("/publish/:id", publishOffer);

// UPDATE OFFER (with file upload middleware for optional image updates)
router.put("/:id", upload.single("image"), updateOffer);

// DELETE OFFER
router.delete("/:id", deleteOffer);

export default router;
