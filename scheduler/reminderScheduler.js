import dayjs from "dayjs";
import Booking from "../models/Booking.js";
import { sendEmail } from "../Utils/emailSender.js";
import { bookingReminderHtml } from "../Utils/emailTemplates.js";

// we rely entirely on server timezone matching the booking times
// and the date/time strings coming from the client being in local
// format (YYYY-MM-DD / HH:mm)

let intervalId;

export function startReminderScheduler() {
  // run every 5 minutes
  intervalId = setInterval(async () => {
    try {
      const now = dayjs();
      const inOneHour = now.add(1, "hour");

      // find bookings that are still scheduled and haven't been reminded
      const pending = await Booking.find({
        status: "Scheduled",
        reminderSent: { $ne: true },
      });

      for (const b of pending) {
        // combine date+time into one moment
        const dt = dayjs(`${b.date} ${b.time}`, "YYYY-MM-DD HH:mm");
        if (!dt.isValid()) continue;

        // send when the appointment is roughly 1h away (±5m)
        const diff = dt.diff(now, "minute");
        if (diff >= 55 && diff <= 65) {
          // build links (assume frontend/backend host same origin)
          const base = process.env.BASE_URL || "http://localhost:5000";
          const confirmLink = `${base}/api/bookings/${b._id}/confirm`;
          const cancelLink = `${base}/api/bookings/${b._id}/cancel`;

          const html = bookingReminderHtml({
            customerName: b.customerName,
            services: b.services,
            date: b.date,
            time: b.time,
            bookingId: b._id,
            confirmLink,
            cancelLink,
          });

          await sendEmail({
            to: b.email,
            subject: "Appointment Reminder",
            html,
          });

          b.reminderSent = true;
          await b.save();
        }
      }
    } catch (err) {
      console.error("Reminder scheduler error:", err);
    }
  }, 5 * 60 * 1000);
}

export function stopReminderScheduler() {
  if (intervalId) clearInterval(intervalId);
}
