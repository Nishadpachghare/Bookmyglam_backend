import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

// ROUTES
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import manageServiceRoutes from "./routes/ManageserviceRoutes.js";
import stylistRoutes from "./routes/stylistRoutes.js";
import expenseRoutes from "./routes/ExpenseRoutes.js";
import uploadsRouter from "./routes/uploads.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";

dotenv.config();


console.log(
  "[Startup] MONGO_URI detected:",
  process.env.MONGO_URI
    ? `${process.env.MONGO_URI.slice(0, 30)}...`
    : "<undefined>"
);

const app = express();

/* ===============================
   REQUEST LOGGER
================================ */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Origin: ${req.headers.origin || "none"}`);
  next();
});

/* ===============================
   CORS
================================ */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://book-my-glam-web.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
      if (localhostRegex.test(origin) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204,
  })
);

/* ===============================
   BODY PARSING
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================
   STATIC FILES - SERVE UPLOADS
================================ */
app.use("/uploads", express.static("uploads"));

/* ===============================
   DB MIDDLEWARE — fixed for serverless
   Always attempt connection, attach flag,
   never block with 503 here (routes handle it)
================================ */
app.use(async (req, res, next) => {
  // Skip non-API and health routes
  if (!req.path.startsWith("/api") || req.path === "/api/healthz") {
    req.isDbConnected = mongoose.connection.readyState === 1;
    return next();
  }

  // Already connected — fast path
  if (mongoose.connection.readyState === 1) {
    req.isDbConnected = true;
    return next();
  }

  // Not connected — try to connect (important for serverless cold starts)
  try {
    const conn = await connectDB();
    req.isDbConnected = !!(conn && mongoose.connection.readyState === 1);
  } catch {
    req.isDbConnected = false;
  }

  next(); // always continue — let each route decide how to handle no-DB
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running" });
});

app.get("/api/healthz", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({
    ok: connected,
    mongodb: connected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/* ===============================
   API ROUTES
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/manageservices", manageServiceRoutes);
app.use("/api/Manageservices", manageServiceRoutes); // legacy alias
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/uploads", uploadsRouter);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/offers", offerRoutes);

/* ===============================
   404
================================ */
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found", path: req.originalUrl });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
});

/* ===============================
   START
================================ */
const PORT = process.env.PORT || 5000;

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

async function start() {
  const conn = await connectDB();
  if (!conn) {
    console.warn("⚠️  Starting without DB — routes requiring DB will return errors.");
  }

  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
      const { startReminderScheduler } = await import("./scheduler/reminderScheduler.js");
      startReminderScheduler();
    } catch (err) {
      console.warn("Scheduler not started:", err.message);
    }
  });
}

process.on("unhandledRejection", (reason) => console.error("🔥 Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => console.error("🔥 Uncaught Exception:", err));

if (!isServerless) {
  start();
} else {
  // Warm up connection on serverless cold start — don't await, non-blocking
  connectDB().catch((e) => console.warn("Serverless DB warmup failed:", e.message));
}

export default app;