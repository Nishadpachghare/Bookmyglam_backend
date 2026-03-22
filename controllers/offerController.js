import Offer from "../models/offer.js";
import cloudinary from "../config/cloudinary.js";

// CREATE OFFER
export const createOffer = async (req, res) => {
  try {
    const { title, description, discount, startDate, endDate, services } = req.body;

    if (!title || discount === undefined) {
      return res.status(400).json({ success: false, message: "Title and discount are required" });
    }

    let imageUrl = "";
    if (req.file) {
      // When using CloudinaryStorage, multer already uploads the file.
      // Use the provided URL if available; otherwise, fall back to uploading.
      imageUrl = req.file.path || req.file.secure_url || req.file.url || "";
      if (!imageUrl && req.file.path) {
        const result = await cloudinary.uploader.upload(req.file.path, { folder: "offers" });
        imageUrl = result.secure_url;
      }
    }

    const offer = await Offer.create({
      title,
      description,
      discount,
      startDate,
      endDate,
      services: services ? (typeof services === "string" ? JSON.parse(services) : services) : [],
      image: imageUrl,
      published: false,
    });

    res.status(201).json({ success: true, message: "Offer created successfully", data: offer });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ success: false, message: "Error creating offer", error: error.message });
  }
};

// GET ALL OFFERS
export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET ACTIVE OFFERS
export const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({ published: true }).sort({ createdAt: -1 });

    const activeOffers = offers.filter((offer) => {
      const start = offer.startDate || offer.validFrom;
      const end = offer.endDate || offer.validTill;

      if (!start && !end) return true;
      if (!start && end) return end >= now;
      if (start && !end) return start <= now;
      return start <= now && end >= now;
    });

    res.status(200).json({ success: true, data: activeOffers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUBLISH OFFER
export const publishOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, { published: true }, { new: true });
    if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
    res.status(200).json({ success: true, message: "Published", data: offer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE OFFER
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
    res.status(200).json({ success: true, message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE OFFER (Supports Image Update & JSON fields)
export const updateOffer = async (req, res) => {
  try {
    let updateData = { ...req.body };

    // Handle File Upload if present in update
    if (req.file) {
      updateData.image = req.file.path || req.file.secure_url || req.file.url || updateData.image;

      // Fallback: if multer did not provide a URL, upload manually from disk
      if (!updateData.image && req.file.path) {
        const result = await cloudinary.uploader.upload(req.file.path, { folder: "offers" });
        updateData.image = result.secure_url;
      }
    }

    // Handle parsed services if sent as string
    if (updateData.services && typeof updateData.services === "string") {
      updateData.services = JSON.parse(updateData.services);
    }

    const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedOffer) return res.status(404).json({ success: false, message: "Offer not found" });

    res.status(200).json({ success: true, message: "Offer updated", data: updatedOffer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
