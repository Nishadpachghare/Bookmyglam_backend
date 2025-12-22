// utils/emailTemplates.js
export function bookingConfirmationHtml({
  customerName,
  services,
  date,
  time,
  bookingId,
}) {
  const serviceLines = (services || [])
    .map(
      (s) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
            ${escapeHtml(s.serviceName || "Service")}
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">
            ₹${Number(s.price || 0).toFixed(2)}
          </td>
        </tr>`
    )
    .join("");

  const total = (services || []).reduce(
    (sum, s) => sum + (Number(s.price) || 0),
    0
  );

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>

<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1f2937);padding:22px 26px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">
                Booking Confirmed
              </h1>
              <p style="margin:6px 0 0 0;color:#d1d5db;font-size:13px;">
                Thank you for choosing our salon
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px;">
              <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">
                Hi <strong>${escapeHtml(customerName || "Customer")}</strong>,<br/>
                We’re happy to confirm your appointment. Please find the details below.
              </p>

              <!-- Date & Time -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-bottom:18px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:14px 16px;">
                    <div style="font-size:12px;color:#6b7280;">Date</div>
                    <div style="font-size:14px;font-weight:600;color:#111827;margin-top:4px;">
                      ${escapeHtml(date)}
                    </div>
                  </td>
                  <td style="padding:14px 16px;border-left:1px solid #e5e7eb;">
                    <div style="font-size:12px;color:#6b7280;">Time</div>
                    <div style="font-size:14px;font-weight:600;color:#111827;margin-top:4px;">
                      ${escapeHtml(time)}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Services -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;">
                    Service
                  </td>
                  <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;text-align:right;">
                    Price
                  </td>
                </tr>

                ${serviceLines}

                <tr style="background:#f3f4f6;">
                  <td style="padding:14px;font-weight:700;color:#111827;">
                    Total Amount
                  </td>
                  <td style="padding:14px;text-align:right;font-weight:700;color:#111827;">
                    ₹${total.toFixed(2)}
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">
                Booking ID:
                <strong style="color:#111827;">
                  ${escapeHtml(bookingId || "")}
                </strong>
              </p>

              <p style="margin:18px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you need to reschedule or have any questions, simply reply to this email or contact our salon directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;background:#f9fafb;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Your Salon Name. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function stylistWelcomeHtml({ name, role }) {
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1f2937);padding:22px 26px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Welcome to Our Salon</h1>
              <p style="margin:6px 0 0 0;color:#d1d5db;font-size:13px;">Thank you for joining our team</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px;">
              <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">
                Hi <strong>${escapeHtml(name || "Stylist")}</strong>,<br/>
                Welcome aboard! We’re excited to have you join our team as a <strong>${escapeHtml(role || "Stylist")}</strong>.
              </p>

              <p style="margin:12px 0 16px 0;color:#374151;font-size:14px;line-height:1.6;">
                This email confirms your registration in our system. Our team will contact you soon with onboarding details and next steps. Below is a quick summary of your role:
              </p>

              <p style="margin:8px 0 16px 0;color:#374151;font-size:14px;line-height:1.6;">
                <strong>भाषा सूचना:</strong> आपकी जॉइनिंग सफलतापूर्वक हो गई है।
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Role</td>
                  <td style="padding:14px 16px;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(role || "Stylist")}</td>
                </tr>
              </table>

              <p style="margin:12px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you have any questions or need assistance, reply to this email or contact our HR team at <a href="mailto:hr@yourdomain.com">hr@yourdomain.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;background:#f9fafb;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Your Salon Name. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// helper
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
