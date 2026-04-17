import Attendance from "../models/Attendance.js";
import Booking from "../models/Booking.js";
import Stylist from "../models/Stylist.js";
import { calculateAttendanceStatus, getAttendanceStatusWithMessage, validateCheckoutTime } from "../Utils/attendanceLogic.js";

// Mark attendance (Check-in/Check-out)
export const markAttendance = async (req, res) => {
  try {
    const { stylistId, checkInTime, checkoutTime, status, date } = req.body;

    if (!stylistId || !date) {
      return res.status(400).json({ error: "stylistId and date are required" });
    }

    let attendance = await Attendance.findOne({ stylistId, date });

    if (!attendance) {
      attendance = new Attendance({
        stylistId,
        date,
        checkInTime: checkInTime || new Date().toISOString(),
      });
    } else {
      if (checkInTime) attendance.checkInTime = checkInTime;
      if (checkoutTime) attendance.checkoutTime = checkoutTime;
    }

    // Auto-calculate status based on check-in and check-out times
    // Don't override if status is explicitly "holiday"
    if (status === "holiday") {
      attendance.status = "holiday";
    } else {
      attendance.status = calculateAttendanceStatus(attendance.checkInTime, attendance.checkoutTime);
    }

    // Calculate hours worked
    if (attendance.checkInTime && attendance.checkoutTime) {
      const checkIn = new Date(attendance.checkInTime);
      const checkOut = new Date(attendance.checkoutTime);
      attendance.hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60); // in hours
    }

    // Get status message for response
    const statusMessage = getAttendanceStatusWithMessage(
      attendance.checkInTime,
      attendance.checkoutTime
    );

    await attendance.save();

    res.json({
      success: true,
      data: attendance,
      statusMessage: statusMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
};

// Get attendance by date
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const attendance = await Attendance.find({ date })
      .populate("stylistId", "name email role")
      .populate("bookings");

    res.json({ success: true, data: attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// Get monthly attendance report for stylist
export const getStylistMonthlyAttendance = async (req, res) => {
  try {
    const { stylistId, month, year } = req.query;

    if (!stylistId || !month || !year) {
      return res
        .status(400)
        .json({ error: "stylistId, month, and year are required" });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const attendance = await Attendance.find({
      stylistId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Calculate statistics
    const stats = {
      totalDays: attendance.length,
      fullDays: attendance.filter((a) => a.status === "full").length,
      halfDays: attendance.filter((a) => a.status === "half").length,
      absentDays: attendance.filter((a) => a.status === "absent").length,
      holidays: attendance.filter((a) => a.status === "holiday").length,
      totalHours: attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0),
      totalCustomers: attendance.reduce((sum, a) => sum + a.customersHandled, 0),
      totalRevenue: attendance.reduce((sum, a) => sum + a.totalRevenue, 0),
      averageCustomersPerDay:
        attendance.length > 0
          ? attendance.reduce((sum, a) => sum + a.customersHandled, 0) /
          attendance.length
          : 0,
    };

    res.json({ success: true, data: attendance, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch monthly attendance" });
  }
};

// Get stylist analytics
export const getStylistAnalytics = async (req, res) => {
  try {
    const { stylistId } = req.query;

    if (!stylistId) {
      return res.status(400).json({ error: "stylistId is required" });
    }

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    console.log(`\n📊 ANALYTICS QUERY:`);
    console.log(`   Stylist ID: ${stylistId}`);
    console.log(`   Date Range: ${startDate} to today`);

    const attendance = await Attendance.find({
      stylistId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    console.log(`\n📋 ATTENDANCE RECORDS FOUND: ${attendance.length}`);
    if (attendance.length > 0) {
      console.log(`   Records:`, attendance.map(a => ({ 
        date: a.date, 
        status: a.status,
        checkIn: a.checkInTime ? "✅ Yes" : "❌ No",
        customers: a.customersHandled,
        revenue: a.totalRevenue
      })));
    }

    const bookings = await Booking.find({
      stylistId,
      date: { $gte: startDate },
    });

    // Group data by date for charts
    const chartData = attendance.map((a) => ({
      date: a.date,
      customers: a.customersHandled,
      revenue: a.totalRevenue,
      hours: a.hoursWorked,
      status: a.status,
    }));

    // Stats
    const presentCount = attendance.filter(
      (a) => a.status === "full" || a.status === "half"
    ).length;
    const absentCount = attendance.filter(
      (a) => a.status === "absent"
    ).length;

    console.log(`\n📊 BREAKDOWN:`);
    console.log(`   ✅ Present (full/half): ${presentCount}`);
    console.log(`   ❌ Absent: ${absentCount}`);
    console.log(`   📅 Total Days: ${attendance.length}`);

    const stats = {
      totalCustomers: attendance.reduce((sum, a) => sum + (a.customersHandled || 0), 0),
      totalRevenue: attendance.reduce((sum, a) => sum + (a.totalRevenue || 0), 0),
      averageCustomersPerDay:
        attendance.length > 0
          ? attendance.reduce((sum, a) => sum + (a.customersHandled || 0), 0) /
          attendance.length
          : 0,
      totalDays: attendance.length,
      presentDays: presentCount,
      absenceDays: absentCount,
      attendancePercentage:
        attendance.length > 0
          ? Math.round((presentCount / attendance.length) * 100)
          : 0,
    };

    console.log(`\n📤 SENDING STATS:`, stats);
    console.log(`\n`); // Extra line for readability

    res.json({ success: true, chartData, stats });
  } catch (err) {
    console.error("❌ Error in getStylistAnalytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// ✅ NEW: Debug endpoint to see raw attendance data
export const getStylistAttendanceDebug = async (req, res) => {
  try {
    const { stylistId } = req.query;

    if (!stylistId) {
      return res.status(400).json({ error: "stylistId is required" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const attendance = await Attendance.find({
      stylistId,
      date: { $gte: startDate },
    }).sort({ date: 1 }).populate("stylistId", "name");

    res.json({
      success: true,
      queryParams: { stylistId, startDate },
      recordsCount: attendance.length,
      records: attendance.map(a => ({
        _id: a._id,
        date: a.date,
        status: a.status,
        checkInTime: a.checkInTime,
        checkoutTime: a.checkoutTime,
        customersHandled: a.customersHandled,
        totalRevenue: a.totalRevenue,
        hoursWorked: a.hoursWorked,
        notes: a.notes
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch debug data" });
  }
};

// Add holiday
export const addHoliday = async (req, res) => {
  try {
    const { stylistId, date } = req.body;

    if (!stylistId || !date) {
      return res.status(400).json({ error: "stylistId and date are required" });
    }

    const stylist = await Stylist.findById(stylistId);
    if (!stylist) {
      return res.status(404).json({ error: "Stylist not found" });
    }

    if (!stylist.holidays.includes(date)) {
      stylist.holidays.push(date);
    }

    // Create attendance record for holiday
    await Attendance.findOneAndUpdate(
      { stylistId, date },
      { status: "holiday" },
      { upsert: true, new: true }
    );

    await stylist.save();

    res.json({ success: true, data: stylist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add holiday" });
  }
};

// Add half day
export const addHalfDay = async (req, res) => {
  try {
    const { stylistId, date } = req.body;

    if (!stylistId || !date) {
      return res.status(400).json({ error: "stylistId and date are required" });
    }

    const stylist = await Stylist.findById(stylistId);
    if (!stylist) {
      return res.status(404).json({ error: "Stylist not found" });
    }

    if (!stylist.halfDays.includes(date)) {
      stylist.halfDays.push(date);
    }

    // Create attendance record for half day
    await Attendance.findOneAndUpdate(
      { stylistId, date },
      { status: "half" },
      { upsert: true, new: true }
    );

    await stylist.save();

    res.json({ success: true, data: stylist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add half day" });
  }
};

// Get all attendance records with filters
export const getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, stylistId } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (stylistId) {
      query.stylistId = stylistId;
    }

    const attendance = await Attendance.find(query)
      .populate("stylistId", "name email role")
      .populate("bookings")
      .sort({ date: -1 });

    res.json({ success: true, data: attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
};

// Update stylist shift timings
export const updateStylistShift = async (req, res) => {
  try {
    const { stylistId } = req.params;
    const { shiftStartTime, shiftEndTime } = req.body;

    if (!stylistId) {
      return res.status(400).json({ error: "stylistId is required" });
    }

    const stylist = await Stylist.findByIdAndUpdate(
      stylistId,
      { shiftStartTime, shiftEndTime },
      { new: true }
    );

    if (!stylist) {
      return res.status(404).json({ error: "Stylist not found" });
    }

    res.json({ success: true, data: stylist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update shift" });
  }
};

// Get stylist with holidays and half days
export const getStylistSchedule = async (req, res) => {
  try {
    const { stylistId } = req.query;

    if (!stylistId) {
      return res.status(400).json({ error: "stylistId is required" });
    }

    const stylist = await Stylist.findById(stylistId);

    console.log(`\n📅 SCHEDULE QUERY:`);
    console.log(`   Stylist ID: ${stylistId}`);

    if (!stylist) {
      console.log(`   ❌ Stylist not found`);
      return res.status(404).json({ error: "Stylist not found" });
    }

    console.log(`   ✅ Stylist found: ${stylist.name}`);
    console.log(`   Shift: ${stylist.shiftStartTime} - ${stylist.shiftEndTime}`);
    console.log(`   Holidays: ${stylist.holidays?.length ?? 0}`, stylist.holidays);
    console.log(`   Half Days: ${stylist.halfDays?.length ?? 0}`, stylist.halfDays);

    res.json({
      success: true,
      data: {
        _id: stylist._id,
        name: stylist.name,
        email: stylist.email,
        role: stylist.role,
        shiftStartTime: stylist.shiftStartTime,
        shiftEndTime: stylist.shiftEndTime,
        holidays: stylist.holidays || [],
        halfDays: stylist.halfDays || [],
      },
    });
  } catch (err) {
    console.error("❌ Error in getStylistSchedule:", err);
    res.status(500).json({ error: "Failed to fetch stylist schedule" });
  }
};

// ✅ Get stylists who haven't checked in today (before 5:00 PM)
export const getStylistsNotCheckedIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get all active stylists
    const allStylists = await Stylist.find({ isActive: true }).select("_id name email role");

    // Get attendance records for today
    const todayAttendance = await Attendance.find({ date: today }).select("stylistId checkInTime status");

    // Find stylists who haven't checked in
    const notCheckedIn = allStylists.filter((stylist) => {
      const attendance = todayAttendance.find((a) => a.stylistId.toString() === stylist._id.toString());
      return !attendance || !attendance.checkInTime; // No record or no check-in time
    });

    res.json({
      success: true,
      date: today,
      totalStylists: allStylists.length,
      checkedInCount: allStylists.length - notCheckedIn.length,
      notCheckedInCount: notCheckedIn.length,
      notCheckedIn: notCheckedIn.map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        role: s.role,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stylists not checked in" });
  }
};

// ✅ Manually trigger automatic absent marking (Admin endpoint)
export const triggerAutomaticAbsent = async (req, res) => {
  try {
    const { triggerAbsentMarkingNow } = await import("../scheduler/automaticAbsentScheduler.js");
    await triggerAbsentMarkingNow();

    res.json({
      success: true,
      message: "Automatic absent marking triggered successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to trigger automatic absent marking" });
  }
};
