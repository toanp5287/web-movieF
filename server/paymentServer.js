import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomBytes, timingSafeEqual } from "node:crypto";

import {
  getMembershipPlans,
  createPaymentOrder,
  processVnpResult,
  getPaymentResult,
  getMembershipStatus,
} from "./paymentService.js";

const app = express();
const PORT = Number(process.env.PAYMENT_PORT) || 3002;
const returnTickets = new Map();

app.disable("x-powered-by");

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Order-Access-Token",
    ],
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

app.get("/api/membership/status", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getMembershipStatus(req.query.userId, req.get("x-order-access-token")),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/result", async (req, res, next) => {
  try {
    const data = await getPaymentResult(req.query.txnRef, req.get("x-order-access-token"));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/return-ticket", (req, res) => {
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  const saved = returnTickets.get(ticket);
  if (!saved || saved.expiresAt < Date.now()) {
    return res.status(404).json({ success: false, message: "Phiên kết quả không còn hiệu lực." });
  }
  returnTickets.delete(ticket);
  res.set("Cache-Control", "no-store").json({ success: true, data: saved });
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
        "http://localhost:5173/payment-result",
    );

    frontendUrl.searchParams.set(
      "status",
      result.success ? "success" : "failed",
    );

    if (result.order?.txnRef) {
      frontendUrl.searchParams.set("txnRef", result.order.txnRef);
    }
    if (result.order?.txnRef && result.order?.accessToken) {
      const ticket = randomBytes(32).toString("hex");
      returnTickets.set(ticket, {
        txnRef: result.order.txnRef,
        accessToken: result.order.accessToken,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      frontendUrl.searchParams.set("ticket", ticket);
    }

    res.redirect(frontendUrl.toString());
  } catch (error) {
    console.error("[VNPay Return]", error.message);
    const resultUrl = new URL(
      process.env.PAYMENT_RESULT_URL || "http://localhost:5173/payment-result",
    );
    resultUrl.searchParams.set("verification", "error");
    res.redirect(resultUrl.toString());
  }
});

// IPN: VNPay gọi vào endpoint này để thông báo kết quả.
app.get("/api/payments/vnpay-ipn", async (req, res) => {
  try {
    const result = await processVnpResult(req.query);

    res.json({
      RspCode: "00",
      Message: "Confirm Success",
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
