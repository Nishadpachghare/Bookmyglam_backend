import mongoose from "mongoose";
import offer from "../models/offer.js";
import cloudinary from "../config/cloudinary.js";

// CREATE
export const createOffer = async (req, res) => {
  try {
    const { title, description, discount, startDate, endDate, services } = req.body;

    if (!title || discount === undefined) {
      return res.status(400).json({ success: false, message: "Title and discount required" });
    }

    let imageUrl = "";

    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url || "";
    }

    const offer = await Offer.create({
      title,
      description,
      discount,
      startDate,
      endDate,
      services: services ? JSON.parse(services) : [],
      image: imageUrl,
      published: false,
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET ALL
export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET ACTIVE
export const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();

    const offers = await Offer.find({
      published: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null },
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE
export const updateOffer = async (req, res) => {
  try {
    let updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path || req.file.secure_url;
    }

    if (updateData.services && typeof updateData.services === "string") {
      updateData.services = JSON.parse(updateData.services);
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE
export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUBLISH
export const publishOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { published: true },
      { new: true }
    );

    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};