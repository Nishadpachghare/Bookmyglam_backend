import express from "express";
import { Cashfree, CFEnvironment } from "cashfree-pg";

const router = express.Router();

// ✅ ENV use yahi ho raha hai
let cashfree;
try {
  cashfree = new Cashfree(
    process.env.CF_ENV === "PRODUCTION"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX,
    process.env.CF_APP_ID,
    process.env.CF_SECRET_KEY
  );
} catch (error) {
  console.error("[Cashfree Init Error]", error.message);
  cashfree = null;
}

// ✅ CREATE ORDER API
router.post("/create-order", async (req, res) => {
  if (!cashfree) {
    return res.status(503).json({ error: "Payment service not initialized. Check Cashfree configuration." });
  }
  
  try {
    const { amount, customer } = req.body;

    const request = {
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: "cust_" + Date.now(),
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/booking?order_id={order_id}`,
      },
    };

    const response = await cashfree.PGCreateOrder(request);

    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: response.data.order_id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify-order", async (req, res) => {
  if (!cashfree) {
    return res.status(503).json({
      ok: false,
      error: "Payment service not initialized. Check Cashfree configuration.",
    });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "orderId is required",
      });
    }

    const [orderResponse, paymentsResponse] = await Promise.all([
      cashfree.PGFetchOrder(orderId),
      cashfree.PGOrderFetchPayments(orderId),
    ]);

    const payments = Array.isArray(paymentsResponse?.data)
      ? paymentsResponse.data
      : [];

    const successfulPayment =
      payments.find(
        (payment) =>
          (payment?.payment_status || "").toString().toUpperCase() ===
          "SUCCESS",
      ) || null;

    const verified = Boolean(successfulPayment);

    return res.json({
      ok: true,
      verified,
      order: orderResponse?.data || null,
      payment: successfulPayment,
    });
  } catch (err) {
    console.error("[Cashfree Verify Order Error]", err?.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: err?.response?.data?.message || err.message,
    });
  }
});

export default router;
