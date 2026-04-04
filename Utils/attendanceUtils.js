import Attendance from "../models/Attendance.js";
import Booking from "../models/Booking.js";

/**
 * Update attendance with booking information
 * Call this after a booking is created or completed
 */
export const updateAttendanceFromBooking = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).populate("stylistId");

    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const { date, stylistId, finalAmount, services } = booking;

    if (!stylistId) {
      console.warn("Booking has no stylist assigned");
      return null;
    }

    // Get or create attendance record
    let attendance = await Attendance.findOne({
      stylistId: stylistId._id,
      date,
    });

    if (!attendance) {
      attendance = new Attendance({
        stylistId: stylistId._id,
        date,
        status: "full", // default assumption
      });
    }

    // Get all bookings for this stylist on this date
    const allBookings = await Booking.find({
      stylistId: stylistId._id,
      date,
    });

    // Calculate totals
    const totalCustomers = allBookings.length;
    const totalRevenue = allBookings.reduce(
      (sum, b) => sum + (b.finalAmount || b.totalAmount || 0),
      0
    );

    // Update attendance record
    attendance.customersHandled = totalCustomers;
    attendance.totalRevenue = totalRevenue;
    attendance.bookings = allBookings.map((b) => b._id);

    await attendance.save();

    console.log(
      `Updated attendance for ${stylistId.name} on ${date}: ${totalCustomers} customers, ₹${totalRevenue}`
    );

    return attendance;
  } catch (err) {
    console.error("Error updating attendance from booking:", err.message);
    return null;
  }
};

/**
 * Bulk update all bookings for a specific date/stylist to attendance
 */
export const syncAttendanceFromBookings = async (date, stylistId) => {
  try {
    const query = { date };
    if (stylistId) query.stylistId = stylistId;

    const bookings = await Booking.find(query).populate("stylistId");

    // Group by stylist and date
    const groupedByStyler = {};

    bookings.forEach((booking) => {
      const key = `${booking.stylistId._id}_${booking.date}`;
      if (!groupedByStyler[key]) {
        groupedByStyler[key] = {
          stylistId: booking.stylistId._id,
          date: booking.date,
          bookings: [],
        };
      }
      groupedByStyler[key].bookings.push(booking);
    });

    // Update or create attendance records
    const results = [];
    for (const key in groupedByStyler) {
      const { stylistId, date, bookings } = groupedByStyler[key];

      let attendance = await Attendance.findOne({ stylistId, date });

      if (!attendance) {
        attendance = new Attendance({
          stylistId,
          date,
          status: "full",
        });
      }

      attendance.customersHandled = bookings.length;
      attendance.totalRevenue = bookings.reduce(
        (sum, b) => sum + (b.finalAmount || b.totalAmount || 0),
        0
      );
      attendance.bookings = bookings.map((b) => b._id);

      await attendance.save();
      results.push(attendance);
    }

    console.log(`Synced ${results.length} attendance records from bookings`);
    return results;
  } catch (err) {
    console.error("Error syncing attendance:", err.message);
    return [];
  }
};

/**
 * Calculate hours worked if check-in and check-out are set
 */
export const calculateHoursWorked = (checkInTime, checkoutTime) => {
  if (!checkInTime || !checkoutTime) return 0;

  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkoutTime);

  const diffMs = checkOut - checkIn;
  const diffHours = diffMs / (1000 * 60 * 60);

  return parseFloat(diffHours.toFixed(2));
};

/**
 * Get stylist performance for a month
 */
export const getStylistMonthlyPerformance = async (stylistId, month, year) => {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const attendance = await Attendance.find({
      stylistId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    if (attendance.length === 0) {
      return {
        stylistId,
        month,
        year,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        averageCustomersPerDay: 0,
        averageRevenuePerDay: 0,
      };
    }

    const presentDays = attendance.filter(
      (a) => a.status === "full" || a.status === "half"
    ).length;

    return {
      stylistId,
      month,
      year,
      totalDays: attendance.length,
      presentDays,
      absentDays: attendance.filter((a) => a.status === "absent").length,
      holidays: attendance.filter((a) => a.status === "holiday").length,
      fullDays: attendance.filter((a) => a.status === "full").length,
      halfDays: attendance.filter((a) => a.status === "half").length,
      totalCustomers: attendance.reduce((sum, a) => sum + a.customersHandled, 0),
      totalRevenue: attendance.reduce((sum, a) => sum + a.totalRevenue, 0),
      totalHours: attendance.reduce((sum, a) => sum + a.hoursWorked, 0),
      averageCustomersPerDay:
        presentDays > 0
          ? attendance.reduce((sum, a) => sum + a.customersHandled, 0) /
            presentDays
          : 0,
      averageRevenuePerDay:
        presentDays > 0
          ? attendance.reduce((sum, a) => sum + a.totalRevenue, 0) / presentDays
          : 0,
      attendancePercentage: (presentDays / attendance.length) * 100,
    };
  } catch (err) {
    console.error("Error calculating performance:", err.message);
    return null;
  }
};

/**
 * Get last 30 days performance for stylist
 */
export const getStylistLast30DaysPerformance = async (stylistId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    const attendance = await Attendance.find({
      stylistId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    const presentDays = attendance.filter(
      (a) => a.status === "full" || a.status === "half"
    ).length;

    return {
      stylistId,
      period: "last_30_days",
      totalRecords: attendance.length,
      presentDays,
      absentDays: attendance.filter((a) => a.status === "absent").length,
      holidays: attendance.filter((a) => a.status === "holiday").length,
      fullDays: attendance.filter((a) => a.status === "full").length,
      halfDays: attendance.filter((a) => a.status === "half").length,
      totalCustomers: attendance.reduce((sum, a) => sum + a.customersHandled, 0),
      totalRevenue: attendance.reduce((sum, a) => sum + a.totalRevenue, 0),
      totalHours: attendance.reduce((sum, a) => sum + a.hoursWorked, 0),
      averageCustomersPerDay:
        presentDays > 0
          ? attendance.reduce((sum, a) => sum + a.customersHandled, 0) /
            presentDays
          : 0,
      averageRevenuePerDay:
        presentDays > 0
          ? attendance.reduce((sum, a) => sum + a.totalRevenue, 0) / presentDays
          : 0,
      dailyBreakdown: attendance,
    };
  } catch (err) {
    console.error("Error calculating 30-day performance:", err.message);
    return null;
  }
};
