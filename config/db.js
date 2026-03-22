import mongoose from "mongoose";

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

// Cache connection across Lambda invocations / hot reloads
let cachedConnection = null;
let cachedPromise = null;
let isConnected = false;

const defaultRetries = isServerless ? 3 : 5;
const defaultDelay = isServerless ? 2000 : 5000;

const connectDB = async ({ retries = defaultRetries, delay = defaultDelay } = {}) => {
  // Already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Connection exists but flag is stale
  if (cachedConnection && mongoose.connection.readyState === 1) {
    isConnected = true;
    return cachedConnection;
  }

  // Connection in progress — reuse the same promise
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
        const conn = await mongoose.connect(uri, {
          // NOTE: useNewUrlParser & useUnifiedTopology are removed in Mongoose 6+
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          family: 4,           // Force IPv4 (avoids IPv6 DNS issues on some hosts)
          bufferCommands: false, // Fail fast if not connected, don't queue ops
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        cachedConnection = conn;
        isConnected = true;

        mongoose.connection.on("disconnected", () => {
          console.warn("⚠️ MongoDB disconnected");
          isConnected = false;
          cachedPromise = null; // Allow reconnection attempts
        });

        mongoose.connection.on("reconnected", () => {
          console.log("✅ MongoDB reconnected");
          isConnected = true;
        });

        return conn;
      } catch (error) {
        console.error(
          `❌ MongoDB connection failed (attempt ${attempt}/${retries}): ${error.message}`
        );
        if (attempt < retries) {
          console.log(`⏳ Retrying in ${Math.round(delay / 1000)}s...`);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }

    console.error("❌ All MongoDB connection attempts failed.");
    cachedPromise = null;
    isConnected = false;
    return null;
  })();

  return cachedPromise;
};

export default connectDB;