/**
 * access.js
 *
 * Lớp quyết định quyền xem phim dùng chung cho trang chi tiết và trang xem.
 *
 * Quy ước dữ liệu hiện tại:
 *  - `movies.accessType = "vip"` là phim trả phí; thiếu/khác "vip" là miễn phí.
 *  - Quyền hội viên được tính từ các đơn `payments.status === "PAID"`.
 *  - Mỗi đơn có `paidAt` và `durationDays`; các đơn được cộng dồn theo thời gian.
 *  - Tài khoản phải có `users.status === "active"`.
 *
 * Lưu ý: đây là lớp quyết định phía ứng dụng. File video trong public/videos/
 * vẫn truy cập trực tiếp được nếu biết URL; muốn bảo vệ tuyệt đối cần backend
 * stream có xác thực (xem báo cáo Phase 1).
 */

import api from "../api.js";

export const ACCESS_MESSAGES = Object.freeze({
  membershipRequired: "Bạn cần đăng ký hội viên để xem phim này.",
  membershipExpired:
    "Gói hội viên của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục xem phim trả phí.",
  notReleased: "Phim chưa đến ngày phát hành. Vui lòng quay lại sau.",
  membershipUnknown:
    "Không thể kiểm tra quyền hội viên lúc này. Vui lòng thử lại sau.",
});

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cache ngắn để không gọi lại API liên tục khi chuyển tab / mở lại trang. */
const SNAPSHOT_TTL_MS = 5000;

let snapshotCache = { userId: "", at: 0, value: null };

export function readCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

export function getUserId(user) {
  if (!user || typeof user !== "object") return "";
  const id = user.id ?? user.userId ?? user.user_id;
  return id === undefined || id === null ? "" : String(id).trim();
}

/** Chỉ "vip" (và các bí danh cũ) mới là phim trả phí. Mặc định là miễn phí. */
export function isVipMovie(movie) {
  const value = String(movie?.accessType ?? "")
    .trim()
    .toLowerCase();
  return value === "vip" || value === "paid" || value === "premium";
}

export function formatMembershipDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Cộng dồn thời hạn từ các đơn đã trả tiền.
 * Đơn mua khi gói cũ còn hạn sẽ nối tiếp hạn cũ; mua sau khi hết hạn thì tính
 * từ thời điểm thanh toán của đơn đó.
 */
function buildSnapshot(user, rawPayments, now = new Date()) {
  const userId = getUserId(user);
  const accountActive =
    String(user?.status ?? "")
      .trim()
      .toLowerCase() === "active";

  const payments = (Array.isArray(rawPayments) ? rawPayments : [])
    .filter((payment) => {
      const status = String(payment?.status ?? "")
        .trim()
        .toUpperCase();
      const days = Number(payment?.durationDays);
      return (
        status === "PAID" &&
        Number.isFinite(days) &&
        days > 0 &&
        payment?.paidAt
      );
    })
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

  let expiresAt = null;
  let lastPayment = null;

  for (const payment of payments) {
    const paidAt = new Date(payment.paidAt);
    if (Number.isNaN(paidAt.getTime())) continue;

    const base =
      expiresAt && expiresAt.getTime() > paidAt.getTime()
        ? expiresAt
        : paidAt;

    expiresAt = new Date(
      base.getTime() + Number(payment.durationDays) * DAY_MS,
    );
    lastPayment = payment;
  }

  let status = "none";
  if (!accountActive) {
    status = "disabled";
  } else if (expiresAt) {
    status = expiresAt.getTime() > now.getTime() ? "active" : "expired";
  }

  return {
    status,
    userId,
    user,
    accountActive,
    hasPaid: payments.length > 0,
    paymentCount: payments.length,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    lastPayment,
    planName:
      lastPayment?.planName || lastPayment?.planId || "Gói hội viên MovieF",
  };
}

function guestSnapshot() {
  return {
    status: "guest",
    userId: "",
    user: null,
    accountActive: false,
    hasPaid: false,
    paymentCount: 0,
    expiresAt: null,
    lastPayment: null,
    planName: "",
  };
}

function unknownSnapshot(user) {
  return {
    status: "unknown",
    userId: getUserId(user),
    user,
    accountActive: false,
    hasPaid: false,
    paymentCount: 0,
    expiresAt: null,
    lastPayment: null,
    planName: "",
  };
}

/**
 * Đọc trạng thái hội viên từ tài khoản hiện tại + bảng payments.
 * Không tin trường hội viên trong localStorage; luôn đọc lại /users và /payments.
 *
 * @param {{force?: boolean}} [options]
 * @returns {Promise<object>} snapshot trạng thái hội viên
 */
export async function getMembershipSnapshot({ force = false } = {}) {
  const currentUser = readCurrentUser();
  const userId = getUserId(currentUser);

  if (!userId) return guestSnapshot();

  if (
    !force &&
    snapshotCache.userId === userId &&
    snapshotCache.value &&
    Date.now() - snapshotCache.at < SNAPSHOT_TTL_MS
  ) {
    return snapshotCache.value;
  }

  let user;
  try {
    user = await api.get(`/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    console.error("[access] Không đọc được tài khoản:", error);
    return unknownSnapshot(currentUser);
  }

  if (!user || user.id === undefined || user.id === null) {
    return unknownSnapshot(currentUser);
  }

  // currentUser trong localStorage có thể bị sửa tay. Đối chiếu lại mật khẩu
  // hash + email với bản ghi trên server trước khi tin id dùng để xét hội viên.
  // Đây không phải xác thực phiên thay thế backend, nhưng chặn việc chỉ đổi id
  // sang tài khoản hội viên khác là được xem ngay.
  const storedPassword = String(currentUser?.password ?? "");
  const serverPassword = String(user?.password ?? "");
  const storedEmail = String(currentUser?.email ?? "")
    .trim()
    .toLowerCase();
  const serverEmail = String(user?.email ?? "")
    .trim()
    .toLowerCase();

  if (
    !storedPassword ||
    !serverPassword ||
    storedPassword !== serverPassword ||
    !storedEmail ||
    storedEmail !== serverEmail
  ) {
    console.warn("[access] Phiên đăng nhập cục bộ không khớp tài khoản.");
    return unknownSnapshot(user);
  }

  let payments;
  try {
    payments = await api.get(
      `/payments?userId=${encodeURIComponent(userId)}&status=PAID`,
    );
  } catch (error) {
    console.error("[access] Không đọc được thanh toán:", error);
    return unknownSnapshot(user);
  }

  if (!Array.isArray(payments)) {
    return unknownSnapshot(user);
  }

  // json-server có thể trả userId kiểu số/chuỗi khác nhau; lọc lại lần nữa để
  // không cộng nhầm đơn của tài khoản khác.
  payments = payments.filter(
    (payment) => String(payment?.userId) === String(userId),
  );

  const snapshot = buildSnapshot(user, payments);
  snapshotCache = {
    userId,
    at: Date.now(),
    value: snapshot,
  };
  return snapshot;
}

export function clearMembershipCache() {
  snapshotCache = { userId: "", at: 0, value: null };
}

/**
 * Quyết định quyền xem một phim.
 *
 * Phim miễn phí luôn được phép ở lớp này; việc chặn phim chưa phát hành do
 * releaseState/applyWatchReleaseGate đảm nhiệm trước đó.
 *
 * @param {object} movie
 * @param {object} snapshot kết quả getMembershipSnapshot()
 * @returns {{allowed: boolean, reason: string, message: string, snapshot: object}}
 */
export function resolveMovieAccess(movie, snapshot) {
  if (!isVipMovie(movie)) {
    return {
      allowed: true,
      reason: "free",
      message: "",
      snapshot,
    };
  }

  switch (snapshot?.status) {
    case "active":
      return {
        allowed: true,
        reason: "member",
        message: "",
        snapshot,
      };
    case "expired":
      return {
        allowed: false,
        reason: "membership-expired",
        message: ACCESS_MESSAGES.membershipExpired,
        snapshot,
      };
    case "disabled":
      return {
        allowed: false,
        reason: "membership-disabled",
        message: ACCESS_MESSAGES.membershipExpired,
        snapshot,
      };
    case "guest":
    case "none":
      return {
        allowed: false,
        reason: "membership-required",
        message: ACCESS_MESSAGES.membershipRequired,
        snapshot,
      };
    default:
      return {
        allowed: false,
        reason: "membership-unknown",
        message: ACCESS_MESSAGES.membershipUnknown,
        snapshot,
      };
  }
}
