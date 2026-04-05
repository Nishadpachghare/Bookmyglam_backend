import Offer from "../models/offer.js"; // ✅ Capital O — exact filename match
import cloudinary from "../config/cloudinary.js";

// ── Helper: DB check ──────────────────────────────────────────────────────────
const checkDb = (req, res) => {
  if (!req.isDbConnected) {
    res.status(503).json({ success: false, error: "Database unavailable, please retry" });
    return false;
  }
  return true;
};

// ── Helper: Parse services ────────────────────────────────────────────────────
const parseServices = (services) => {
  if (!services) return [];
  if (Array.isArray(services)) return services;
  try { return JSON.parse(services); }
  catch { return []; }
};

// ── Helper: Extract Cloudinary public_id ─────────────────────────────────────
const getPublicId = (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const parts = imageUrl.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    const afterUpload = parts.slice(uploadIndex + 1);
    if (afterUpload[0]?.startsWith("v")) afterUpload.shift();
    return afterUpload.join("/").replace(/\.[^/.]+$/, "");
  } catch { return null; }
};

// ── Helper: Delete from Cloudinary ───────────────────────────────────────────
const deleteFromCloudinary = async (imageUrl) => {
  const publicId = getPublicId(imageUrl);
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Cloudinary delete [${publicId}]:`, result.result);
  } catch (err) {
    console.warn("⚠️ Cloudinary delete failed:", err.message);
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const createOffer = async (req, res) => {
  try {
    // These logs will show in terminal — check if body is populated
    console.log("📦 req.body:", req.body);
    console.log("📁 req.file:", req.file);
    console.log("📋 Content-Type:", req.headers["content-type"]);

    if (!checkDb(req, res)) return;

    const body = req.body || {};
    const { title, description, discount, startDate, endDate, services } = body;

    if (!title?.trim() || discount === undefined || discount === "") {
      if (req.file) await deleteFromCloudinary(req.file.path || req.file.secure_url);
      return res.status(400).json({ success: false, error: "Title and discount are required" });
    }

    const imageUrl = req.file?.path || req.file?.secure_url || req.file?.url || "";

    const offer = await Offer.create({
      title:       title.trim(),
      description: description?.trim() || "",
      discount:    Number(discount) || 0,
      startDate:   startDate ? new Date(startDate) : null,
      endDate:     endDate   ? new Date(endDate)   : null,
      services:    parseServices(services),
      image:       imageUrl,
      published:   false,
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    console.error("createOffer error:", err);
    if (req.file) await deleteFromCloudinary(req.file.path || req.file.secure_url);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET ALL ───────────────────────────────────────────────────────────────────
export const getOffers = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    console.error("getOffers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET ACTIVE ────────────────────────────────────────────────────────────────
export const getActiveOffers = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    const now = new Date();
    const offers = await Offer.find({
      active: true,
      published: true,
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $exists: false } },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $exists: false } },
            { endDate: { $gte: now } },
          ],
        },
      ],
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    console.error("getActiveOffers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
export const updateOffer = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;

    const existing = await Offer.findById(req.params.id);
    if (!existing) {
      if (req.file) await deleteFromCloudinary(req.file.path || req.file.secure_url);
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    const body = req.body || {};
    const updateData = {};

    if (body.title !== undefined)        updateData.title        = body.title.trim();
    if (body.description !== undefined)  updateData.description  = body.description.trim();
    if (body.discount !== undefined)     updateData.discount     = Number(body.discount);
    if (body.startDate !== undefined)    updateData.startDate    = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined)      updateData.endDate      = body.endDate   ? new Date(body.endDate)   : null;
    if (body.services !== undefined)     updateData.services     = parseServices(body.services);
    if (body.published !== undefined)    updateData.published    = body.published === "true" || body.published === true;

    if (req.file) {
      if (existing.image) await deleteFromCloudinary(existing.image);
      updateData.image = req.file.path || req.file.secure_url || req.file.url || "";
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateOffer error:", err);
    if (req.file) await deleteFromCloudinary(req.file.path || req.file.secure_url);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteOffer = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: "Offer not found" });
    if (offer.image) await deleteFromCloudinary(offer.image);
    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (err) {
    console.error("deleteOffer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PUBLISH ───────────────────────────────────────────────────────────────────
export const publishOffer = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    const offer = await Offer.findByIdAndUpdate(req.params.id, { published: true }, { new: true });
    if (!offer) return res.status(404).json({ success: false, error: "Offer not found" });
    res.json({ success: true, data: offer, message: "Offer published" });
  } catch (err) {
    console.error("publishOffer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── UNPUBLISH ─────────────────────────────────────────────────────────────────
export const unpublishOffer = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    const offer = await Offer.findByIdAndUpdate(req.params.id, { published: false }, { new: true });
    if (!offer) return res.status(404).json({ success: false, error: "Offer not found" });
    res.json({ success: true, data: offer, message: "Offer unpublished" });
  } catch (err) {
    console.error("unpublishOffer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── TOGGLE ACTIVE STATUS ──────────────────────────────────────────────────────
export const toggleOfferActive = async (req, res) => {
  try {
    if (!checkDb(req, res)) return;
    
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: "Offer not found" });

    // Toggle active status
    offer.active = !offer.active;
    await offer.save();

    res.json({ 
      success: true, 
      data: offer, 
      message: `Offer ${offer.active ? "activated" : "deactivated"} successfully` 
    });
  } catch (err) {
    console.error("toggleOfferActive error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
