// backend/routes/uploads.js
import express from "express";
import multer from "multer";
import {
  uploadMedia,
  uploadLink,
  listMedia,
  deleteMedia,
  publishMedia,
  createDraft,
  updateDraft,
  deleteMatch,
} from "../controllers/uploadController.js";

const router = express.Router();

// multer memory storage – we send buffer to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  // increase limit to 500MB (adjust as required). Cloudinary itself may still
  // reject anything larger than their account limit, but multer won't stop us
  // from buffering it first.
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      // allow any video type generically; Cloudinary will enforce supported
      // formats when uploading.  this helps avoid the 413 from multer.
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/avi",
      "video/mov",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"), false);
  },
});


router.post("/media", upload.single("file"), uploadMedia);
router.post("/link", uploadLink);
router.post("/draft", createDraft);
router.post("/delete-match", deleteMatch);

router.get("/", listMedia);
router.put("/:id", updateDraft);
router.put("/:id/publish", publishMedia);
router.delete("/:id", deleteMedia);

export default router;