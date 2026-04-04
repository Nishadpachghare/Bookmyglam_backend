/**
 * Attendance Logic Utility
 * 
 * Rules:
 * 1. Check-in window: 10:00 AM to 10:40 AM (Full Day)
 * 2. Check-in after 10:40 AM but before 2:00 PM: Half Day
 * 3. Check-in after 2:00 PM: Absent (too late to mark attendance)
 * 4. No check-in: Absent
 * 5. Check-out before 9:00 PM: Half Day (overrides check-in status)
 * 6. Check-out after 9:00 PM: Valid (keeps check-in status)
 */

/**
 * Calculate attendance status based on check-in and check-out times
 * @param {String} checkInTime - ISO format check-in time
 * @param {String} checkoutTime - ISO format check-out time
 * @returns {String} - Status: "full", "half", or "absent"
 */
export const calculateAttendanceStatus = (checkInTime, checkoutTime) => {
  // No check-in = Absent
  if (!checkInTime) {
    return "absent";
  }

  const checkInDate = new Date(checkInTime);
  const checkInHour = checkInDate.getHours();
  const checkInMinute = checkInDate.getMinutes();

  // Convert to minutes for easier comparison
  const checkInMinutes = checkInHour * 60 + checkInMinute;
  const checkinWindowStart = 10 * 60; // 10:00 AM = 600 minutes
  const checkinWindowEnd = 10 * 60 + 40; // 10:40 AM = 640 minutes
  const lateCheckInLimit = 14 * 60; // 2:00 PM = 840 minutes (NEW: After this = Absent)
  const checkoutTimeLimit = 21 * 60; // 9:00 PM = 1260 minutes

  // NEW: Check if check-in is after 2:00 PM → Mark as Absent
  if (checkInMinutes >= lateCheckInLimit) {
    return "absent";
  }

  // Check checkout time first (if exists)
  if (checkoutTime) {
    const checkOutDate = new Date(checkoutTime);
    const checkOutHour = checkOutDate.getHours();
    const checkOutMinute = checkOutDate.getMinutes();
    const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

    // If checkout is before 9:00 PM, it's a half day regardless of check-in
    if (checkOutMinutes < checkoutTimeLimit) {
      return "half";
    }
  }

  // Check-in logic (if no early checkout and check-in is before 2 PM)
  if (checkInMinutes >= checkinWindowStart && checkInMinutes <= checkinWindowEnd) {
    // Check-in within 10:00-10:40 AM window = Full Day
    return "full";
  } else if (checkInMinutes > checkinWindowEnd && checkInMinutes < lateCheckInLimit) {
    // Check-in after 10:40 AM but before 2:00 PM = Half Day
    return "half";
  } else {
    // Check-in before 10:00 AM = Full Day (early arrival is acceptable)
    return "full";
  }
};

/**
 * Validate checkout time
 * @param {String} checkoutTime - ISO format checkout time
 * @returns {Object} - { isValid: Boolean, message: String }
 */
export const validateCheckoutTime = (checkoutTime) => {
  if (!checkoutTime) {
    return { isValid: false, message: "Checkout time is required" };
  }

  const checkOutDate = new Date(checkoutTime);
  const checkOutHour = checkOutDate.getHours();
  const checkOutMinute = checkOutDate.getMinutes();
  const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
  const checkoutTimeLimit = 21 * 60; // 9:00 PM

  if (checkOutMinutes < checkoutTimeLimit) {
    return {
      isValid: true,
      allowed: false,
      message: `Cannot checkout before 9:00 PM. Current time: ${checkOutDate.toLocaleTimeString()}. This will be marked as Half Day.`,
      status: "half",
    };
  }

  return {
    isValid: true,
    allowed: true,
    message: "Checkout recorded successfully",
    status: "valid",
  };
};

/**
 * Get attendance status with detailed message
 * @param {String} checkInTime - ISO format check-in time
 * @param {String} checkoutTime - ISO format checkout time
 * @returns {Object} - { status: String, message: String }
 */
export const getAttendanceStatusWithMessage = (checkInTime, checkoutTime) => {
  if (!checkInTime) {
    return {
      status: "absent",
      message: "No check-in recorded",
    };
  }

  const checkInDate = new Date(checkInTime);
  const checkInHour = checkInDate.getHours();
  const checkInMinute = checkInDate.getMinutes();
  const checkInTime24 = `${String(checkInHour).padStart(2, "0")}:${String(checkInMinute).padStart(2, "0")}`;

  const checkInMinutes = checkInHour * 60 + checkInMinute;
  const checkinWindowStart = 10 * 60;
  const checkinWindowEnd = 10 * 60 + 40;
  const lateCheckInLimit = 14 * 60; // 2:00 PM
  const checkoutTimeLimit = 21 * 60;

  // NEW: Check if check-in is after 2:00 PM
  if (checkInMinutes >= lateCheckInLimit) {
    return {
      status: "absent",
      message: `Check-in at ${checkInTime24} (after 2:00 PM) - Marked as Absent`,
    };
  }

  // Check checkout time first
  if (checkoutTime) {
    const checkOutDate = new Date(checkoutTime);
    const checkOutHour = checkOutDate.getHours();
    const checkOutMinute = checkOutDate.getMinutes();
    const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

    if (checkOutMinutes < checkoutTimeLimit) {
      return {
        status: "half",
        message: `Checkout before 9:00 PM (${checkOutHour}:${String(checkOutMinute).padStart(2, "0")}) - Marked as Half Day`,
      };
    }
  }

  // Check-in logic (only for check-ins before 2:00 PM)
  if (checkInMinutes >= checkinWindowStart && checkInMinutes <= checkinWindowEnd) {
    return {
      status: "full",
      message: `On-time check-in at ${checkInTime24} - Full Day`,
    };
  } else if (checkInMinutes > checkinWindowEnd && checkInMinutes < lateCheckInLimit) {
    return {
      status: "half",
      message: `Late check-in at ${checkInTime24} (after 10:40 AM) - Half Day`,
    };
  } else {
    return {
      status: "full",
      message: `Early check-in at ${checkInTime24} - Full Day`,
    };
  }
};
