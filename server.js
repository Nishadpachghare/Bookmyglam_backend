import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import expenseRoutes from "./routes/ExpenseRoutes.js";

// Import all routes
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import manageServiceRoutes from "./routes/ManageserviceRoutes.js";
import stylistRoutes from "./routes/stylistRoutes.js"; // ✅ stylist route

// ===== Setup =====
dotenv.config();
connectDB();

const app = express();

// ===== Middleware =====
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json()); // ✅ Parses incoming JSON requests

// ===== Test route to confirm backend =====
app.get("/", (req, res) => {
  res.json({ message: "✅ Backend running successfully!" });
});

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/Manageservices", manageServiceRoutes);
app.use("/api/stylists", stylistRoutes); // ✅ Important: this must match your fetch URL
app.use("/api/expenses", expenseRoutes);

// ===== 404 HANDLER (for unknown routes) =====
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
