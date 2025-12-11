// models/Media.js
import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema({
  type: { type: String, enum: ["image","video","link"], required: true },
  url: { type: String, default: "" },               // cloudinary URL or link (optional for drafts)
  public_id: { type: String },                      // cloudinary public_id (if uploaded)
  caption: { type: String },
  stylist: { type: String },
  date: { type: String },
  platform: { type: String },                       // for links/social
  raw: { type: Object },                            // raw cloudinary response (optional)
  publishedToWeb: { type: Boolean, default: false }, // whether item is published to live portal
  uploaded: { type: Boolean, default: false }, // whether file has been uploaded to Cloudinary / saved as media
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Media || mongoose.model("Media", MediaSchema);
