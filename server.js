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
import inventoryRoutes from "./routes/inventoryRoutes.js"; // 👈 NEW

// ===== Load env + connect DB =====
dotenv.config();
connectDB();

const app = express();

// ===== Middlewares =====
app.use(
  cors({
    origin: ["http://localhost:5173"], // your Vite frontend
    credentials: true,
  })
);

// for JSON bodies
app.use(express.json({ limit: "10mb" }));
// for form-encoded (optional, but nice to have)
app.use(express.urlencoded({ extended: true }));
// cookies if you ever need auth cookies
app.use(cookieParser());

// ===== Health check =====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "✅ Salon backend running successfully" });
});

// ===== API ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/Manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes);
app.use("/api/expenses", expenseRoutes);

app.use("/api/uploads", uploadsRouter);     // Cloudinary media + links
app.use("/api/inventory", inventoryRoutes); // 👈 Inventory management

// ===== 404 handler =====
app.use((req, res, next) => {
  res.status(404).json({
    ok: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ===== Global error handler (optional but helpful) =====
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ ok: false, error: err.message || "Internal server error" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
