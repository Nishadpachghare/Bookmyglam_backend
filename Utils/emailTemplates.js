// utils/emailTemplates.js
export function bookingConfirmationHtml({ customerName, services, date, time, bookingId }) {
  // services: array of objects { serviceName, price }
  const serviceLines = (services || [])
    .map(
      (s) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">
          ${escapeHtml(s.serviceName || "Service")}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;">
          ₹${Number(s.price || 0).toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  const total = (services || []).reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:24px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#0f1724;padding:20px 24px;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Booking Confirmed!</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 12px 0;color:#374151;font-size:15px;">
                  Hi ${escapeHtml(customerName || "Customer")},<br/>
                  Your booking is confirmed. Below are the details:
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;border-radius:6px;border:1px solid #eef2f7;overflow:hidden;">
                  <tr>
                    <td style="padding:14px 16px;background:#fafafa;border-bottom:1px solid #eef2f7;">
                      <strong style="color:#111827;font-size:14px;">Booking Date</strong>
                      <div style="color:#6b7280;font-size:14px;margin-top:6px;">${escapeHtml(date)}</div>
                    </td>
                    <td style="padding:14px 16px;background:#fafafa;border-left:1px solid #eef2f7;">
                      <strong style="color:#111827;font-size:14px;">Booking Time</strong>
                      <div style="color:#6b7280;font-size:14px;margin-top:6px;">${escapeHtml(time)}</div>
                    </td>
                  </tr>

                  <tr>
                    <td colspan="2" style="padding:12px 16px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        ${serviceLines}
                        <tr>
                          <td style="padding:12px 12px;font-weight:600;color:#111827;">Total</td>
                          <td style="padding:12px 12px;text-align:right;font-weight:600;color:#111827;">₹${total.toFixed(2)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:14px 0 0 0;color:#6b7280;font-size:13px;">
                  Booking ID: <strong style="color:#111827">${escapeHtml(bookingId || "")}</strong>
                </p>

                <div style="margin-top:18px;">
                  <a href="#" style="display:inline-block;padding:10px 16px;background:#D3AF37;color:#000;text-decoration:none;border-radius:6px;font-weight:600;">View Booking</a>
                </div>

                <p style="margin:18px 0 0 0;color:#9CA3AF;font-size:12px;">
                  If you have any questions, reply to this email or call us.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:12px 20px;background:#f8fafc;text-align:center;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} Your Salon Name — All rights reserved
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

// small helper to escape HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
