import mongoose from "mongoose";

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

// Cache connection across Lambda invocations / hot reloads
// (important for serverless platforms like Vercel)
let cachedConnection = null;
let cachedPromise = null;

const defaultRetries = isServerless ? 1 : 5;
const defaultDelay = isServerless ? 1000 : 5000;

// Helper: connect with retries (useful for flaky networks / Atlas whitelist delays)
const connectDB = async ({ retries = defaultRetries, delay = defaultDelay } = {}) => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Ensure we do not spin up multiple connections in parallel
  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️  MONGO_URI not set — skipping DB connection (dev only)");
    return null;
  }

  cachedPromise = (async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        cachedConnection = conn;
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
    cachedPromise = null;
    return null;
  })();

  return cachedPromise;
};

export default connectDB;
