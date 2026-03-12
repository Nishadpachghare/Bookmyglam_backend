import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// ROUTES
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import manageServiceRoutes from "./routes/ManageserviceRoutes.js";
import stylistRoutes from "./routes/stylistRoutes.js";
import expenseRoutes from "./routes/ExpenseRoutes.js";
import uploadsRouter from "./routes/uploads.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";

dotenv.config();

const app = express();
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running - CORS FIXED" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/Manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/uploads", uploadsRouter);
app.use("/api/inventory", inventoryRoutes);


app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

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
  const conn = await connectDB();
  if (!conn) {
    console.error("❌ MongoDB connection failed. Server will not start. Check your MONGO_URI and MongoDB Atlas network access (IP whitelist / VPC).\nSee: https://www.mongodb.com/docs/atlas/security-whitelist/");
    process.exit(1);
  }

  app.listen(PORT, async () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`🔥 CORS: ALL localhost ports ALLOWED\n`);

    // schedule email reminders once app is running
    try {
      const { startReminderScheduler } = await import("./scheduler/reminderScheduler.js");
      startReminderScheduler();
    } catch (err) {
      console.warn("Could not start reminder scheduler:", err.message || err);
    }
  });
}

start();