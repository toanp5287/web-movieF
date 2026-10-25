import "dotenv/config";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const JSON_SERVER_URL = process.env.JSON_SERVER_URL || "http://localhost:3000";

const VNP_TMN_CODE = process.env.VNP_TMN_CODE;
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET;
const VNP_URL =
  process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const RETURN_URL = process.env.RETURN_URL;

const PLANS = Object.freeze({
  "vip-30": { name: "VIP 30 ngày", price: 39000, durationDays: 30 },
  "vip-90": { name: "VIP 90 ngày", price: 99000, durationDays: 90 },
  "vip-365": { name: "VIP 365 ngày", price: 349000, durationDays: 365 },
});

const STATUS = Object.freeze({
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
});

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireVnpConfig() {
  if (!VNP_TMN_CODE || !VNP_HASH_SECRET || !RETURN_URL) {
    throw fail("Thiếu cấu hình VNPay trong file .env.", 500);
  }
}

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${JSON_SERVER_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw fail("Không kết nối được JSON Server.", 503);
  }

  if (!response.ok) {
    throw fail(`JSON Server trả về HTTP ${response.status}.`, 502);
  }

  if (response.status === 204) return null;
  return response.json();
}

function makeTxnRef() {
  return `MF${Date.now()}${randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function getPlan(planId) {
  const plan = PLANS[planId];

  if (!plan) throw fail("Gói hội viên không hợp lệ.");
  return { id: planId, ...plan };
}

function sortObject(object) {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      result[key] = object[key];
      return result;
    }, {});
}

// VNPay yêu cầu encode giá trị theo quy tắc query string.
// Dùng cùng một bộ dữ liệu đã sắp xếp để tạo URL và chữ ký.
function encodeVnpValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

function buildSignData(params) {
  return Object.keys(sortObject(params))
    .map((key) => `${key}=${encodeVnpValue(params[key])}`)
    .join("&");
}

function signVnpData(params) {
  return createHmac("sha512", VNP_HASH_SECRET)
    .update(buildSignData(params), "utf8")
    .digest("hex");
}

function safeCompareHex(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    !/^[a-f0-9]+$/i.test(a) ||
    !/^[a-f0-9]+$/i.test(b)
  ) {
    return false;
  }

  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyVnpSignature(query) {
  const params = { ...query };
  const receivedHash = params.vnp_SecureHash;

  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  if (!receivedHash) return false;

  return safeCompareHex(receivedHash, signVnpData(params));
}

export function getMembershipPlans() {
  return Object.entries(PLANS).map(([id, plan]) => ({
    id,
    ...plan,
  }));
}

export async function createPaymentOrder({ userId, planId, ipAddr }) {
  requireVnpConfig();

  if (userId === undefined || userId === null || String(userId).trim() === "") {
    throw fail("Thiếu thông tin người dùng.", 401);
  }

  const normalizedUserId = String(userId);
  const plan = getPlan(planId);

  const user = await requestJson(
    `/users/${encodeURIComponent(normalizedUserId)}`,
  );

  if (!user) throw fail("Không tìm thấy người dùng.", 404);

  const now = new Date();
  const txnRef = makeTxnRef();

  const order = await requestJson("/payments", {
    method: "POST",
    body: JSON.stringify({
      txnRef,
      userId: normalizedUserId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      provider: "VNPAY",
      status: STATUS.PENDING,
      createdAt: now.toISOString(),
      paidAt: null,
      failedAt: null,
      failureCode: null,
      vnpTransactionNo: null,
    }),
  });

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Amount: String(plan.price * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan ${plan.name} ${txnRef}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: RETURN_URL,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: formatVnpDate(now),
  };

  const sorted = sortObject(params);
  const secureHash = signVnpData(sorted);
  const query = Object.entries(sorted)
    .map(([key, value]) => `${key}=${encodeVnpValue(value)}`)
    .join("&");

  return {
    order,
    plan,
    paymentUrl: `${VNP_URL}?${query}&vnp_SecureHash=${secureHash}`,
  };
}

function formatVnpDate(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export async function getPaymentByTxnRef(txnRef) {
  const orders = await requestJson(
    `/payments?txnRef=${encodeURIComponent(txnRef)}`,
  );

  if (!Array.isArray(orders) || orders.length > 1) {
    throw fail("Dữ liệu đơn thanh toán không hợp lệ.", 409);
  }

  return orders[0] || null;
}

async function updatePayment(order, updates) {
  return requestJson(`/payments/${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function processVnpResult(query) {
  requireVnpConfig();

  if (!verifyVnpSignature(query)) {
    throw fail("Chữ ký VNPay không hợp lệ.", 403);
  }

  const txnRef = query.vnp_TxnRef;
  const order = await getPaymentByTxnRef(txnRef);

  if (!order) throw fail("Không tìm thấy đơn thanh toán.", 404);

  if (Number(query.vnp_Amount) !== Number(order.amount) * 100) {
    throw fail("Số tiền giao dịch không khớp.", 403);
  }

  if (order.status === STATUS.PAID) {
    return { success: true, alreadyProcessed: true, order };
  }

  if (order.status !== STATUS.PENDING) {
    return { success: false, alreadyProcessed: true, order };
  }

  const paid =
    query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";

  const updatedOrder = await updatePayment(order, {
    status: paid ? STATUS.PAID : STATUS.FAILED,
    paidAt: paid ? new Date().toISOString() : null,
    failedAt: paid ? null : new Date().toISOString(),
    failureCode: paid ? null : query.vnp_ResponseCode || "UNKNOWN",
    vnpTransactionNo: query.vnp_TransactionNo || null,
  });

  /*
   * Chưa kích hoạt VIP ở đây vì chưa xác định cấu trúc
   * trường hội viên thật trong data/db.json.
   * Chỉ cập nhật user sau khi xác minh schema và cách gia hạn.
   */

  return {
    success: paid,
    alreadyProcessed: false,
    order: updatedOrder,
  };
}
