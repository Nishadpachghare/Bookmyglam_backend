import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getStylistMonthlyAttendance,
  getStylistAnalytics,
  addHoliday,
  addHalfDay,
  getAllAttendance,
  updateStylistShift,
  getStylistSchedule,
} from "../controllers/attendanceController.js";

const router = express.Router();

// Mark attendance (check-in/check-out)
router.post("/mark", markAttendance);

// Get attendance by date
router.get("/by-date", getAttendanceByDate);

// Get monthly attendance for stylist
router.get("/monthly", getStylistMonthlyAttendance);

// Get stylist analytics (last 30 days)
router.get("/analytics", getStylistAnalytics);

// Get all attendance with filters
router.get("/", getAllAttendance);

// Add holiday
router.post("/holiday", addHoliday);

// Add half day
router.post("/half-day", addHalfDay);

// Update stylist shift timings
router.put("/shift/:stylistId", updateStylistShift);

// Get stylist schedule (holidays, half days, shifts)
router.get("/schedule", getStylistSchedule);

export default router;
