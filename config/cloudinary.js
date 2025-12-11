import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// If CLOUDINARY_URL present, cloudinary will parse it automatically.
// Otherwise use explicit env vars if provided.
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET,
  });
}

export default cloudinary;