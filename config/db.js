import mongoose from "mongoose";

// ─── Environment Detection ────────────────────────────────────────────────────
const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

// ─── Global Cache (survives serverless warm invocations) ─────────────────────
const globalWithMongoose = global;
if (!globalWithMongoose._mongoCache) {
  globalWithMongoose._mongoCache = { conn: null, promise: null };
}
const cached = globalWithMongoose._mongoCache;

// ─── Connection Options ───────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  bufferCommands: false,                              // fail fast — don't queue ops
  family: 4,                                         // force IPv4 — fixes Atlas DNS on Vercel
  serverSelectionTimeoutMS: isServerless ? 30000 : 10000,  // cold start needs more time
  connectTimeoutMS:         isServerless ? 30000 : 10000,
  socketTimeoutMS: 45000,                            // prevent hung queries
  maxPoolSize: isServerless ? 5 : 10,                // limit connections on serverless
  minPoolSize: 1,
  retryWrites: true,
  heartbeatFrequencyMS: 10000,                       // detect disconnects faster
};

// ─── Main Connect Function ────────────────────────────────────────────────────
const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  // Guard: missing URI
  if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI is missing in environment variables");
  }

  // Fast path: already connected
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Stale cache: conn exists but disconnected — reset
  if (cached.conn && mongoose.connection.readyState !== 1) {
    console.warn("⚠️ Stale connection detected — resetting cache");
    cached.conn = null;
    cached.promise = null;
  }

  // In-progress: reuse existing promise (prevents parallel connections)
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch {
      cached.promise = null;
      cached.conn = null;
    }
  }

  // New connection
  console.log(`⏳ Connecting to MongoDB... [${isServerless ? "serverless" : "local"}]`);

  cached.promise = mongoose.connect(MONGO_URI, MONGO_OPTIONS);

  try {
    cached.conn = await cached.promise;

    const host = mongoose.connection.host;
    const dbName = mongoose.connection.name;
    console.log(`✅ MongoDB Connected — host: ${host} | db: ${dbName}`);

    // ── Event Listeners (attach only once) ──
    mongoose.connection.off("disconnected", onDisconnected);
    mongoose.connection.off("reconnected", onReconnected);
    mongoose.connection.off("error", onError);

    mongoose.connection.on("disconnected", onDisconnected);
    mongoose.connection.on("reconnected", onReconnected);
    mongoose.connection.on("error", onError);

    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

// ─── Event Handlers (defined outside to allow .off() dedup) ──────────────────
function onDisconnected() {
  console.warn("⚠️ MongoDB disconnected — cache reset");
  cached.conn = null;
  cached.promise = null;
}

function onReconnected() {
  console.log("✅ MongoDB reconnected");
  cached.conn = mongoose.connection;
}

function onError(err) {
  console.error("🔥 MongoDB connection error:", err.message);
  cached.conn = null;
  cached.promise = null;
}

export default connectDB;