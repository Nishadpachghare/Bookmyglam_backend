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
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/quicktime",
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
