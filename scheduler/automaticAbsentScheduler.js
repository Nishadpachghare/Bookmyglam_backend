import dayjs from "dayjs";
import Attendance from "../models/Attendance.js";
import Stylist from "../models/Stylist.js";

/**
 * Automatic Absent Marking Scheduler
 * 
 * Runs daily at 5:00 PM (17:00)
 * Checks if any stylist hasn't checked in for today
 * Automatically marks them as ABSENT
 */

let intervalId;

export function startAutomaticAbsentScheduler() {
  console.log("🕐 Starting Automatic Absent Scheduler (runs at 04:59 PM daily)");

  // Run every minute to check if it's time to execute
  intervalId = setInterval(async () => {
    try {
      const now = dayjs();
      const currentHour = now.hour();
      const currentMinute = now.minute();

      // Execute at 4:59 PM (just before 5:00 PM)
      // This gives a 1-minute window to mark absent for the day
      if (currentHour === 16 && currentMinute === 59) {
        console.log("⏰ Automatic Absent Scheduler triggered at 4:59 PM");
        await markAbsentForNonCheckedIn();
      }
    } catch (err) {
      console.error("❌ Error in automatic absent scheduler:", err);
    }
  }, 60000); // Check every minute (60000 ms)

  return intervalId;
}

/**
 * Mark all stylists as absent who haven't checked in today
 */
async function markAbsentForNonCheckedIn() {
  try {
    const today = dayjs().format("YYYY-MM-DD");
    console.log(`📅 Checking attendance for date: ${today}`);

    // Get all active stylists (use 'status' field, not 'isActive')
    const allStylists = await Stylist.find({ status: "active" }).select("_id name email");
    console.log(`👥 Found ${allStylists.length} active stylists`);

    let markedAbsent = 0;

    for (const stylist of allStylists) {
      // Check if attendance record exists for today
      const attendanceExists = await Attendance.findOne({
        stylistId: stylist._id,
        date: today,
      });

      if (!attendanceExists) {
        // Create new attendance record with ABSENT status
        const newAttendance = new Attendance({
          stylistId: stylist._id,
          date: today,
          status: "absent",
          checkInTime: null,
          checkoutTime: null,
          hoursWorked: 0,
          notes: "Auto-marked absent - No check-in by 5:00 PM",
        });

        await newAttendance.save();
        markedAbsent++;

        console.log(`✅ Marked ABSENT: ${stylist.name} (${stylist._id})`);
      } else if (!attendanceExists.checkInTime) {
        // Attendance record exists but no check-in, mark as absent
        attendanceExists.status = "absent";
        attendanceExists.notes = "Auto-marked absent - No check-in by 5:00 PM";
        await attendanceExists.save();
        markedAbsent++;

        console.log(`✅ Updated to ABSENT: ${stylist.name} (${stylist._id})`);
      } else {
        console.log(`⏭️  ${stylist.name} already checked in`);
      }
    }

    console.log(`📊 Summary: Marked ${markedAbsent} stylists as absent for ${today}`);
  } catch (err) {
    console.error("❌ Error in markAbsentForNonCheckedIn:", err);
  }
}

/**
 * Stop the automatic absent scheduler
 */
export function stopAutomaticAbsentScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("🛑 Automatic Absent Scheduler stopped");
  }
}

/**
 * Manually trigger absent marking (for testing or manual execution)
 */
export async function triggerAbsentMarkingNow() {
  console.log("🚀 Manually triggering absent marking...");
  await markAbsentForNonCheckedIn();
}
