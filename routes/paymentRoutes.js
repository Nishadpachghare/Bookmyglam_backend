import express from "express";
import { Cashfree, CFEnvironment } from "cashfree-pg";

const router = express.Router();

// ✅ DIAGNOSE CASHFREE CONFIGURATION
console.log("🔍 Cashfree Configuration Check:");
console.log("   CF_APP_ID:", process.env.CF_APP_ID ? "✅ SET" : "❌ MISSING");
console.log("   CF_SECRET_KEY:", process.env.CF_SECRET_KEY ? "✅ SET" : "❌ MISSING");
console.log("   CF_ENV:", process.env.CF_ENV || "SANDBOX (default)");
console.log("   NODE_ENV:", process.env.NODE_ENV);

let cashfree;
try {
  const environment = process.env.CF_ENV === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

  console.log(`🚀 Initializing Cashfree with ${environment === CFEnvironment.PRODUCTION ? "PRODUCTION" : "SANDBOX"} mode...`);

  cashfree = new Cashfree(
    environment,
    process.env.CF_APP_ID,
    process.env.CF_SECRET_KEY
  );

  console.log("✅ Cashfree SDK initialized successfully");
} catch (error) {
  console.error("❌ [Cashfree Init Error]", error.message);
  console.error("Stack:", error.stack);
  cashfree = null;
}

// ✅ CREATE ORDER API
router.post("/create-order", async (req, res) => {
  if (!cashfree) {
    console.error("❌ Cashfree not initialized - Check CF_APP_ID, CF_SECRET_KEY, CF_ENV");
    return res.status(503).json({ error: "Payment service not initialized. Check Cashfree configuration." });
  }
  
  try {
    const { amount, customer } = req.body;

    // ✅ VALIDATE REQUEST DATA
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount (>0) is required" });
    }

    // Convert amount to number to ensure it's numeric
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: "Amount must be a valid number" });
    }

    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ error: "Customer details (name, email, phone) are required" });
    }

    // ✅ VALIDATE CLIENT_URL
    if (!process.env.CLIENT_URL) {
      console.error("❌ CLIENT_URL not set in environment variables");
      return res.status(500).json({ error: "Server configuration error: CLIENT_URL not set" });
    }

    const returnUrl = `${process.env.CLIENT_URL}/booking?order_id={order_id}`;

    console.log("📦 Creating Cashfree order with:", {
      amount: numAmount,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      return_url: returnUrl,
    });

    const request = {
      order_amount: numAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: "cust_" + Date.now(),
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },
      order_meta: {
        return_url: returnUrl,
      },
    };

    console.log("🔗 Calling Cashfree PGCreateOrder...");
    
    let response;
    try {
      response = await cashfree.PGCreateOrder(request);
    } catch (cashfreeError) {
      console.error("❌ Cashfree API Call Failed:", {
        message: cashfreeError.message,
        code: cashfreeError.code,
        errno: cashfreeError.errno,
        systemCall: cashfreeError.syscall,
        address: cashfreeError.address,
        port: cashfreeError.port,
        stack: cashfreeError.stack,
      });
      throw new Error(`Cashfree API Error: ${cashfreeError.message}`);
    }

    console.log("✅ Cashfree order created:", {
      order_id: response.data.order_id,
      payment_session_id: response.data.payment_session_id,
    });

    res.json({
      payment_session_id: response.data.payment_session_id,
      order_id: response.data.order_id,
    });

  } catch (err) {
    console.error("❌ Cashfree Create Order Error:", {
      message: err.message,
      status: err?.response?.status,
      data: err?.response?.data,
      stack: err.stack,
    });
    res.status(500).json({ 
      error: err?.response?.data?.message || err.message || "Failed to create order",
      details: process.env.NODE_ENV === "development" ? err?.response?.data : undefined
    });
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

// ✅ HEALTH CHECK & DIAGNOSTICS
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    cashfreeInitialized: !!cashfree,
    environment: {
      CF_ENV: process.env.CF_ENV || "SANDBOX",
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      CF_APP_ID: process.env.CF_APP_ID ? "✅ SET" : "❌ MISSING",
      CF_SECRET_KEY: process.env.CF_SECRET_KEY ? "✅ SET" : "❌ MISSING",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

