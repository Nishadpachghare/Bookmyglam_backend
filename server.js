import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// ROUTES
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import manageServiceRoutes from "./routes/manageServiceRoutes.js";
import stylistRoutes from "./routes/stylistRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import uploadsRouter from "./routes/uploads.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";

dotenv.config();

const app = express();

/* ===============================
   🔎 REQUEST LOGGER (FIRST)
================================ */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

/* ===============================
   🌐 CORS FIX - ALL LOCALHOST PORTS
================================ */
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow ALL localhost ports using regex
      const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }
      // Block everything else
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

/* ===============================
   📦 MIDDLEWARES
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================
   🩺 HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running - CORS FIXED" });
});

/* ===============================
   🚀 API ROUTES
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/Manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/uploads", uploadsRouter);
app.use("/api/inventory", inventoryRoutes);

/* ===============================
   ❌ 404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* ===============================
   ⚠️ GLOBAL ERROR HANDLER
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

async function start() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("⚠️ MongoDB failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`🔥 CORS: ALL localhost ports ALLOWED\n`);
  });
}

start();