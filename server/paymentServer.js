import "dotenv/config";
import express from "express";
import cors from "cors";

import {
  getMembershipPlans,
  createPaymentOrder,
  processVnpResult,
} from "./paymentService.js";

const app = express();
const PORT = Number(process.env.PAYMENT_PORT) || 3002;

app.disable("x-powered-by");

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  }),
);

app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "MovieF Payment Server đang hoạt động.",
    port: PORT,
  });
});

app.get("/api/membership/plans", (req, res) => {
  res.json({
    success: true,
    data: getMembershipPlans(),
  });
});

app.post("/api/payments/create", async (req, res, next) => {
  try {
    const { userId, planId } = req.body || {};

    if (!userId || typeof planId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Thiếu userId hoặc planId.",
      });
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const ipAddr =
      (typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0].trim()
        : req.socket.remoteAddress) || "127.0.0.1";

    const result = await createPaymentOrder({
      userId,
      planId,
      ipAddr,
    });

    res.status(201).json({
      success: true,
      message: "Tạo đơn VNPay thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Return URL: xác minh kết quả và chuyển về trang kết quả frontend.
app.get("/payment-return", async (req, res, next) => {
  try {
    const result = await processVnpResult(req.query);

    const frontendUrl = new URL(
      process.env.PAYMENT_RESULT_URL ||
        "http://localhost:5173/membership",
    );

    frontendUrl.searchParams.set(
      "status",
      result.success ? "success" : "failed",
    );

    if (result.order?.txnRef) {
      frontendUrl.searchParams.set("txnRef", result.order.txnRef);
    }

    res.redirect(frontendUrl.toString());
  } catch (error) {
    next(error);
  }
});

// IPN: VNPay gọi vào endpoint này để thông báo kết quả.
app.get("/api/payments/vnpay-ipn", async (req, res) => {
  try {
    const result = await processVnpResult(req.query);

    res.json({
      RspCode: result.success ? "00" : "00",
      Message: result.success
        ? "Confirm Success"
        : "Order already processed or payment failed",
    });
  } catch (error) {
    console.error("[VNPay IPN]", error.message);

    res.status(200).json({
      RspCode: error.statusCode === 404 ? "01" : "99",
      Message: "Payment verification failed",
    });
  }
});

app.use((error, req, res, next) => {
  console.error("[Payment Server]", error.message);

  if (res.headersSent) return next(error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "Máy chủ thanh toán gặp lỗi.",
  });
});

app.listen(PORT, () => {
  console.log(`MovieF Payment Server: http://localhost:${PORT}`);
});
