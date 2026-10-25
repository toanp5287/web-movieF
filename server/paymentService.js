import "dotenv/config";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

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
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
});
const processingTransactions = new Set();

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

  const users = await requestJson("/users");
  const user = users.find((candidate) => String(candidate.id) === normalizedUserId);

  if (!user) throw fail("Không tìm thấy người dùng.", 404);

  const now = new Date();
  const txnRef = makeTxnRef();
  const accessToken = randomBytes(32).toString("hex");

  const order = await requestJson("/payments", {
    method: "POST",
    body: JSON.stringify({
      txnRef,
      accessToken,
      userId: String(user.id),
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
    order: { txnRef: order.txnRef, status: order.status, amount: order.amount },
    accessToken,
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

function safeTokenMatch(stored, provided) {
  if (typeof stored !== "string" || typeof provided !== "string") return false;
  const left = Buffer.from(stored);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

function membershipIsActive(user, now = Date.now()) {
  return (
    user?.membershipStatus === "active" &&
    typeof user.membershipExpiresAt === "string" &&
    new Date(user.membershipExpiresAt).getTime() > now
  );
}

export async function getMembershipStatus(userId, accessToken) {
  if (userId === undefined || userId === null || String(userId).trim() === "") {
    throw fail("Thiếu thông tin người dùng.", 400);
  }
  const user = await getUserById(userId);
  if (!user) throw fail("Không tìm thấy người dùng.", 404);
  const allOrders = await requestJson("/payments");
  const paidOrders = allOrders.filter(
    (order) => String(order.userId) === String(user.id) && order.status === STATUS.PAID,
  );
  const authorized = Array.isArray(paidOrders) && paidOrders.some(
    (order) => safeTokenMatch(order.accessToken, accessToken),
  );
  if (!authorized) throw fail("Không có quyền xem trạng thái hội viên.", 403);
  const membership = await getUserMembership(user, paidOrders);
  return { active: membership.active, startsAt: membership.startsAt, expiresAt: membership.expiresAt };
}

async function getUserMembership(user, paidOrders) {
  const orders = Array.isArray(paidOrders)
    ? paidOrders
    : (await requestJson("/payments")).filter(
        (order) => String(order.userId) === String(user.id) && order.status === STATUS.PAID,
      );
  const datedOrders = (orders || [])
    .filter((order) => order.status === STATUS.PAID && order.membershipStartsAt && order.membershipExpiresAt)
    .sort((a, b) => new Date(a.membershipStartsAt) - new Date(b.membershipStartsAt));
  if (!datedOrders.length) {
    return {
      active: membershipIsActive(user),
      startsAt: user.membershipStartsAt || null,
      expiresAt: user.membershipExpiresAt || null,
    };
  }
  const latest = datedOrders.reduce((current, order) =>
    !current || new Date(order.membershipExpiresAt) > new Date(current.membershipExpiresAt) ? order : current,
  null);
  return {
    active: new Date(latest.membershipExpiresAt).getTime() > Date.now(),
    startsAt: latest.membershipStartsAt,
    expiresAt: latest.membershipExpiresAt,
  };
}

export async function getPaymentResult(txnRef, accessToken) {
  if (typeof txnRef !== "string" || !txnRef.trim()) {
    throw fail("Thiếu mã đơn thanh toán.", 400);
  }
  const order = await getPaymentByTxnRef(txnRef);
  if (!order) throw fail("Không tìm thấy đơn thanh toán.", 404);
  if (!safeTokenMatch(order.accessToken, accessToken)) {
    throw fail("Không có quyền xem đơn thanh toán này.", 403);
  }
  const user = await getUserById(order.userId);
  const membership = order.status === STATUS.PAID
    ? await getUserMembership(user || {}, null)
    : null;
  return {
    txnRef: order.txnRef,
    planName: order.planName,
    amount: order.amount,
    status: order.status,
    provider: order.provider,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    failureCode: order.failureCode,
    vnpTransactionNo: order.vnpTransactionNo,
    membershipStartsAt: order.status === STATUS.PAID ? order.membershipStartsAt || membership?.startsAt || null : null,
    membershipExpiresAt: order.status === STATUS.PAID ? order.membershipExpiresAt || membership?.expiresAt || null : null,
  };
}

async function getUserById(userId) {
  const users = await requestJson("/users");
  return Array.isArray(users)
    ? users.find((candidate) => String(candidate.id) === String(userId)) || null
    : null;
}

export async function processVnpResult(query) {
  const txnRef = query.vnp_TxnRef;
  if (typeof txnRef !== "string" || !txnRef) {
    throw fail("Thiếu mã tham chiếu giao dịch.");
  }
  if (processingTransactions.has(txnRef)) {
    const existing = await getPaymentByTxnRef(txnRef);
    return {
      success: existing?.status === STATUS.PAID,
      alreadyProcessed: true,
      order: existing
        ? { txnRef: existing.txnRef, status: existing.status, accessToken: existing.accessToken }
        : null,
    };
  }
  processingTransactions.add(txnRef);
  try {
    return await processVnpResultOnce(query);
  } finally {
    processingTransactions.delete(txnRef);
  }
}

async function processVnpResultOnce(query) {
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
    return {
      success: true,
      alreadyProcessed: true,
      order: { txnRef: order.txnRef, status: order.status, accessToken: order.accessToken },
    };
  }

  if (order.status !== STATUS.PENDING && order.status !== STATUS.PROCESSING) {
    return {
      success: false,
      alreadyProcessed: true,
      order: { txnRef: order.txnRef, status: order.status, accessToken: order.accessToken },
    };
  }

  const paid =
    query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";

  if (paid && order.status === STATUS.PENDING) {
    await updatePayment(order, { status: STATUS.PROCESSING });
  }

  let membership = null;
  if (paid) {
    const userId = String(order.userId);
    const user = await getUserById(userId);
    if (!user) throw fail("Không tìm thấy tài khoản của đơn thanh toán.", 404);
    const now = new Date();
    const allOrders = await requestJson("/payments");
    const activePaid = allOrders.filter(
      (item) => String(item.userId) === String(user.id) && item.status === STATUS.PAID,
    );
    const existing = (activePaid || [])
      .filter((item) => item.membershipExpiresAt && new Date(item.membershipExpiresAt) > now)
      .sort((a, b) => new Date(b.membershipExpiresAt) - new Date(a.membershipExpiresAt))[0];
    const startsAt = order.membershipStartsAt || existing?.membershipStartsAt || now.toISOString();
    const expiresAt = order.membershipExpiresAt || new Date(
      (existing ? new Date(existing.membershipExpiresAt) : now).getTime() +
        Number(order.durationDays) * 24 * 60 * 60 * 1000,
    ).toISOString();
    await requestJson(`/payments/${encodeURIComponent(String(order.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: STATUS.PAID,
        paidAt: now.toISOString(),
        failedAt: null,
        failureCode: null,
        vnpTransactionNo: query.vnp_TransactionNo || null,
        resultCode: query.vnp_ResponseCode || null,
        transactionStatus: query.vnp_TransactionStatus || null,
        membershipStartsAt: startsAt,
        membershipExpiresAt: expiresAt,
      }),
    });
    await requestJson(`/users/${encodeURIComponent(String(user.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        membershipStatus: "active",
        membershipStartsAt: startsAt,
        membershipExpiresAt: expiresAt,
      }),
    });
    membership = { startsAt, expiresAt };
  }

  const updatedOrder = paid
    ? await getPaymentByTxnRef(order.txnRef)
    : await updatePayment(order, {
        status: STATUS.FAILED,
        paidAt: null,
        failedAt: new Date().toISOString(),
        failureCode: query.vnp_ResponseCode || "UNKNOWN",
        vnpTransactionNo: query.vnp_TransactionNo || null,
        resultCode: query.vnp_ResponseCode || null,
        transactionStatus: query.vnp_TransactionStatus || null,
      });

  return {
    success: paid,
    alreadyProcessed: false,
    order: {
      txnRef: updatedOrder.txnRef,
      status: updatedOrder.status,
      accessToken: updatedOrder.accessToken,
    },
    membership,
  };
}
