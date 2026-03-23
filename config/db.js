import mongoose from "mongoose";

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

// Global cache — survives across serverless warm invocations
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}
const cached = global.mongoose;

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI is missing in environment variables");
  }

  // Already connected — fast path
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log("⚡ Using existing DB connection");
    return cached.conn;
  }

  // Connection in progress — reuse same promise (prevents parallel connections)
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  console.log(`⏳ Connecting to MongoDB... [${isServerless ? "serverless" : "server"} mode]`);

  cached.promise = mongoose.connect(MONGO_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: isServerless ? 30000 : 10000, // longer for Vercel cold starts
    connectTimeoutMS: isServerless ? 30000 : 10000,
    socketTimeoutMS: 45000,
    family: 4, // force IPv4 — avoids DNS resolution issues on Atlas
  });

  try {
    cached.conn = await cached.promise;
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected — resetting cache");
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    return cached.conn;
  } catch (error) {
    // Reset so next request retries fresh
    cached.promise = null;
    cached.conn = null;
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;