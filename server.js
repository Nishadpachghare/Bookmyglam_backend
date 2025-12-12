// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// ===== Route imports =====
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import manageServiceRoutes from "./routes/ManageserviceRoutes.js";
import stylistRoutes from "./routes/stylistRoutes.js";
import expenseRoutes from "./routes/ExpenseRoutes.js";
import uploadsRouter from "./routes/uploads.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";

dotenv.config();

const app = express();

// ===== Request logger (helps debug 404s and route calls) =====
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// ===== Middlewares =====
app.use(
  cors({
    // allow the frontends you use (add domains if you host elsewhere)
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Health check =====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running successfully" });
});

// ===== API ROUTES =====
app.use("/api/auth", authRoutes);           // auth routes (register/login + OTP)
app.use("/api/bookings", bookingRoutes);
app.use("/api/Manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/uploads", uploadsRouter);
app.use("/api/inventory", inventoryRoutes);

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ===== Global error handler =====
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ ok: false, error: err.message || "Internal server error" });
});

// ===== Start server after DB connection =====
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

// graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received — closing server");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received — closing server");
  process.exit(0);
});
