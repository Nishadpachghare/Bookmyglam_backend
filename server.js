import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import mongoose from "mongoose";

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

console.log("[Startup] MONGO_URI detected:", process.env.MONGO_URI ? `${process.env.MONGO_URI.slice(0, 30)}...` : "<undefined>");

const app = express();

/* ===============================
   🪵 REQUEST LOGGER
================================ */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

/* ===============================
   🌐 CORS FIX (LOCAL + PRODUCTION)
================================ */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://book-my-glam-web.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {

      // allow requests with no origin (Postman / mobile apps)
      if (!origin) return callback(null, true);

      // allow all localhost ports
      const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }

      // allow production frontend
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204
  })
);

/* ===============================
   MIDDLEWARE
================================ */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Healthcheck middleware: attempt DB (re)connect but do not auto-terminate requests.
// This will let routes respond with controlled errors or fallback data instead of always 503.
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") && mongoose.connection.readyState !== 1) {
    await connectDB();
    req.isDbConnected = mongoose.connection.readyState === 1;
  } else {
    req.isDbConnected = mongoose.connection.readyState === 1;
  }
  next();
});

/* ===============================
   TEST ROUTE
================================ */

app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running - CORS FIXED" });
});

/* ===============================
   API ROUTES
================================ */

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
// mounted route for managing services (lowercase path is more conventional)
app.use("/api/manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/uploads", uploadsRouter);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/offers", offerRoutes);

/* ===============================
   404 HANDLER
================================ */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* ===============================
   ERROR HANDLER
================================ */

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({
    ok: false,
    error: err.message || "Internal Server Error",
  });
});

/* ===============================
   ▶️ START SERVER
================================ */

const PORT = process.env.PORT || 5000;

// export for integration tests or serverless adapters
export default app;

async function start() {
  const conn = await connectDB();

  if (!conn) {
    console.error(
      "❌ MongoDB connection failed. Check MONGO_URI and Atlas whitelist."
    );
    console.warn(
      "⚠️  Continuing without DB connection. API routes requiring DB will return errors until MONGO_URI is configured."
    );
  }

  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS: Localhost + Production allowed`);

    try {
      const { startReminderScheduler } = await import(
        "./scheduler/reminderScheduler.js"
      );
      startReminderScheduler();
    } catch (err) {
      console.warn("Scheduler not started:", err.message);
    }
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("🔥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.FUNCTIONS_WORKER_RUNTIME);

// In serverless environments (e.g., Vercel), do not start an HTTP listener.
// Instead, export the Express app and let the platform run it.
if (!isServerless) {
  start();
} else {
  connectDB();
}