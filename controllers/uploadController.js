// controllers/uploadController.js
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import Media from "../models/Media.js";

/**
 * helper to upload buffer to cloudinary with compression/transformations
 * resource_type: "auto" lets Cloudinary handle images/videos.
 */
function uploadBufferToCloudinary(buffer, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const opts = {
      folder,
      resource_type: "auto",
      // Cloudinary will auto format & quality (compress)
      eager: [{ fetch_format: "auto", quality: "auto" }],
      overwrite: true,
    };

    const uploadStream = cloudinary.uploader.upload_stream(opts, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * POST /api/uploads/media
 * multipart/form-data with field `file` and fields caption/stylist/date/type
 */
export const uploadMedia = async (req, res) => {
  try {
    const { caption = "", stylist = "", date = "", type = "image", sourceUrl = "", draftId = null } = req.body;

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, process.env.CLOUDINARY_UPLOAD_FOLDER || "my-app");

    // If draftId provided, update existing media doc instead of creating new
    if (draftId) {
      const doc = await Media.findById(draftId);
      if (!doc) {
        // create new if draft not found
        const mediaDoc = await Media.create({
          type,
          url: result.secure_url,
          public_id: result.public_id,
          caption,
          stylist,
          date,
          raw: result,
          uploaded: true,
        });
        return res.json({ ok: true, media: mediaDoc });
      }

      doc.url = result.secure_url;
      doc.public_id = result.public_id;
      doc.caption = caption || doc.caption;
      doc.stylist = stylist || doc.stylist;
      doc.date = date || doc.date;
      doc.raw = result;
      doc.uploaded = true;
      doc.updatedAt = new Date();
      await doc.save();

      return res.json({ ok: true, media: doc });
    }

    const mediaDoc = await Media.create({
      type,
      url: result.secure_url,
      public_id: result.public_id,
      caption,
      stylist,
      date,
      raw: result,
      uploaded: true,
    });

    return res.json({ ok: true, media: mediaDoc });
  } catch (err) {
    console.error("uploadMedia error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * POST /api/uploads/link
 * JSON { platform, url, caption, stylist, date }
 */
export const uploadLink = async (req, res) => {
  try {
    const { platform = "", url = "", caption = "", stylist = "", date = "", draftId = null } = req.body;
    if (!url) return res.status(400).json({ ok: false, error: "url required" });

    // If draftId provided, update existing doc
    if (draftId) {
      const doc = await Media.findById(draftId);
      if (doc) {
        doc.url = url;
        doc.platform = platform || doc.platform;
        doc.caption = caption || doc.caption;
        doc.stylist = stylist || doc.stylist;
        doc.date = date || doc.date;
        doc.uploaded = true;
        doc.updatedAt = new Date();
        await doc.save();
        return res.json({ ok: true, media: doc });
      }
    }

    // Optionally: fetch OG image and upload it. For now simply save the link.
    const mediaDoc = await Media.create({
      type: "link",
      url,
      platform,
      caption,
      stylist,
      date,
      uploaded: true,
    });

    return res.json({ ok: true, media: mediaDoc });
  } catch (err) {
    console.error("uploadLink error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * GET /api/uploads
 */
export const listMedia = async (req, res) => {
  try {
    const items = await Media.find().sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * POST /api/uploads/draft
 * Save a draft (metadata only) so review persists across reloads
 * Body: { type, caption, stylist, date, platform?, url? }
 */
export const createDraft = async (req, res) => {
  try {
    const { type = 'image', caption = '', stylist = '', date = '', platform = '', url = '' } = req.body;
    // Avoid creating duplicate drafts for same type/stylist/date
    const existing = await Media.findOne({ type, stylist, date, uploaded: false });
    if (existing) {
      return res.json({ ok: true, media: existing, message: 'existing draft' });
    }

    const mediaDoc = await Media.create({
      type,
      caption,
      stylist,
      date,
      platform,
      url: url || '',
      uploaded: false,
    });
    return res.json({ ok: true, media: mediaDoc });
  } catch (err) {
    console.error('createDraft error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * DELETE /api/uploads/:id
 * Deletes DB entry and Cloudinary resource if present
 */
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[deleteMedia] request id=', id);
    const doc = await Media.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });

    // Delete cloudinary resource for this exact doc only
    if (doc.public_id) {
      try {
        await cloudinary.uploader.destroy(doc.public_id, { resource_type: 'auto' });
        console.log('[deleteMedia] cloudinary destroy success for public_id=', doc.public_id);
      } catch (cloudErr) {
        console.error('[deleteMedia] cloudinary destroy error for', doc.public_id, cloudErr);
      }
    }

    try {
      await doc.deleteOne();
      console.log('[deleteMedia] deleted DB doc id=', doc._id.toString());
      return res.json({ ok: true, message: 'Deleted', removed: [doc._id.toString()] });
    } catch (delErr) {
      console.error('[deleteMedia] error deleting DB doc', doc._id.toString(), delErr);
      return res.status(500).json({ ok: false, error: delErr.message });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * PUT /api/uploads/:id/publish
 * Toggle publishedToWeb flag to show/hide from live portal
 */
export const publishMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { publish = true } = req.body; // true to publish, false to unpublish

    const doc = await Media.findById(id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });

    doc.publishedToWeb = publish;
    doc.updatedAt = new Date();
    await doc.save();

    res.json({ ok: true, message: publish ? "Published to web" : "Unpublished from web", media: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * PUT /api/uploads/:id
 * Update draft metadata (caption, stylist, date, url, platform)
 */
export const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const doc = await Media.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
    if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
    return res.json({ ok: true, media: doc });
  } catch (err) {
    console.error('updateDraft error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

/**
 * POST /api/uploads/delete-match
 * Body: { url?, public_id?, type?, stylist?, date? }
 * Deletes any DB documents matching the provided criteria.
 */
export const deleteMatch = async (req, res) => {
  try {
    const { url = '', public_id = '', type = '', stylist = '', date = '' } = req.body || {};
    const or = [];
    if (public_id) or.push({ public_id });
    if (url) or.push({ url });
    if (type && stylist) or.push({ type, stylist, date });

    if (or.length === 0) return res.status(400).json({ ok: false, error: 'no match criteria provided' });

    const matches = await Media.find({ $or: or });
    if (!matches.length) return res.json({ ok: true, removed: [] });

    const removed = [];
    for (const m of matches) {
      try {
        if (m.public_id) {
          try {
            await cloudinary.uploader.destroy(m.public_id, { resource_type: 'auto' });
          } catch (cloudErr) {
            console.error('[deleteMatch] cloudinary destroy error for', m.public_id, cloudErr);
          }
        }
      } catch (inner) {
        console.error('[deleteMatch] error destroying cloudinary for', m._id.toString(), inner);
      }
      try {
        await m.deleteOne();
        removed.push(m._id.toString());
      } catch (delErr) {
        console.error('[deleteMatch] error deleting DB doc', m._id.toString(), delErr);
      }
    }

    return res.json({ ok: true, removed });
  } catch (err) {
    console.error('deleteMatch error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
