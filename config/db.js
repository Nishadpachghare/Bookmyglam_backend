import mongoose from "mongoose";

// Helper: connect with retries (useful for flaky networks / Atlas whitelist delays)
const connectDB = async ({ retries = 5, delay = 5000 } = {}) => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️  MONGO_URI not set — skipping DB connection (dev only)");
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Connect without deprecated options (MongoDB Node driver v4+ ignores them)
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ Error connecting to MongoDB (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  console.error("❌ All MongoDB connection attempts failed.");
  return null;
};

export default connectDB;
