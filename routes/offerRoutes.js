import express from "express";
import {
  createOffer,
  getOffers,
  getActiveOffers,
  updateOffer,
  deleteOffer,
  publishOffer,
} from "../controllers/offerController.js";

const router = express.Router();

router.get("/active", getActiveOffers);
router.get("/", getOffers);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.patch("/publish/:id", publishOffer);

export default router;