/**
 * auth-session.js — Lõi "kiểm tra tài khoản đăng nhập" dùng chung cho MovieF.
 *
 * Mọi trang (header, trang cá nhân, yêu thích, lịch sử, cài đặt) đọc phiên từ
 * khoá `currentUser` trong localStorage — giữ nguyên cơ chế cũ để không làm hỏng
 * bất kỳ trang nào đang chạy. Module này là điểm duy nhất được phép ghi/xoá phiên.
 *
 * LƯU Ý BẢO MẬT
 * --------------
 * Đây là mô phỏng xác thực phía FRONTEND dùng localStorage/sessionStorage.
 * Khi có Backend thật: chuyển `checkAccount()` sang gọi API (ví dụ POST /auth/login),
 * không gửi mật khẩu băm bằng SHA-256 qua mạng, và dùng cookie/token phiên
 * (httpOnly) thay cho localStorage. Toàn bộ phần giao diện không cần sửa.
 */

import api from "../api.js";

/* ------------------------------------------------------------------ *
 * 1. KHOÁ LƯU TRỮ
 * ------------------------------------------------------------------ */

/** Khoá phiên đăng nhập (giữ nguyên tên khoá cũ để tương thích). */
export const SESSION_KEY = "currentUser";

/** Khoá mô tả phiên: { remember, startedAt, userId }. */
const META_KEY = "mf:auth:meta";

/** Dấu hiệu "phiên chưa ghi nhớ đang sống trong tab này" (nằm ở sessionStorage). */
const TAB_KEY = "mf:auth:tab";

/** Thông báo chờ hiển thị ở trang đăng nhập (sau khi bị chặn trang bảo vệ). */
export const NOTICE_KEY = "mf:auth:notice";

/** Trang người dùng đang muốn quay lại sau khi đăng nhập (cơ chế đã có sẵn). */
export const REDIRECT_KEY = "redirectAfterLogin";

const readJSON = (area, key) => {
  try {
    const raw = area.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJSON = (area, key, value) => {
  try {
    area.setItem(key, JSON.stringify(value));
  } catch {
    /* trình duyệt chặn storage (private mode) — bỏ qua */
  }
};

/* ------------------------------------------------------------------ *
 * 2. PHIÊN ĐĂNG NHẬP
 * ------------------------------------------------------------------ */

/**
 * Đồng bộ phiên ngay khi module được nạp.
 *
 * Nếu người dùng KHÔNG chọn "Ghi nhớ đăng nhập" thì phiên chỉ sống trong tab đang
 * mở: mở tab mới (sessionStorage trống) => xoá phiên cũ khỏi localStorage.
 */
function reconcileSession() {
  const meta = readJSON(localStorage, META_KEY);
  if (!meta || meta.remember) return;
  try {
    if (sessionStorage.getItem(TAB_KEY)) return;
  } catch {
    return;
  }
  clearSession();
}

/** User đang đăng nhập (null nếu chưa đăng nhập). */
export function getSessionUser() {
  const user = readJSON(localStorage, SESSION_KEY);
  return user && user.id !== undefined && user.id !== null ? user : null;
}

/** Đã đăng nhập hay chưa. */
export function isSignedIn() {
  return Boolean(getSessionUser());
}

/**
 * Lưu phiên sau khi kiểm tra tài khoản thành công.
 * @param {object} user  bản ghi user trả về từ CSDL
 * @param {{remember?:boolean}} [options]
 */
export function saveSession(user, { remember = true } = {}) {
  // isLoggedIn = true: cờ tiện ích cho các module cũ đang đọc trực tiếp currentUser.
  const session = { ...user, isLoggedIn: true };

  writeJSON(localStorage, SESSION_KEY, session);
  writeJSON(localStorage, META_KEY, {
    remember: Boolean(remember),
    startedAt: new Date().toISOString(),
    userId: String(user.id),
  });

  try {
    if (remember) sessionStorage.removeItem(TAB_KEY);
    else sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* bỏ qua */
  }

  return session;
}

/** Xoá phiên đăng nhập (đăng xuất). */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(META_KEY);
    sessionStorage.removeItem(TAB_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Chặn trang cần đăng nhập: chuyển về /login và nhớ lại trang đích.
 * @param {{message?:string, loginUrl?:string}} [options]
 * @returns {boolean} true nếu đã đăng nhập (được phép đi tiếp)
 */
export function requireAuth({ message, loginUrl = "/login" } = {}) {
  if (isSignedIn()) return true;

  try {
    const current = window.location.href;
    if (current && !current.includes(loginUrl)) {
      sessionStorage.setItem(REDIRECT_KEY, current);
    }
    if (message) sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    /* bỏ qua */
  }

  window.location.href = loginUrl;
  return false;
}

/** Đọc + xoá thông báo dành cho trang đăng nhập. */
export function takeNotice() {
  try {
    const message = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return message || "";
  } catch {
    return "";
  }
}

/** Đọc + xoá trang cần quay lại sau khi đăng nhập. */
export function takeRedirect() {
  try {
    const url = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return url || "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ *
 * 3. MẬT KHẨU
 * ------------------------------------------------------------------ */

/** SHA-256 — đúng cách auth.js / trang cá nhân đang dùng. */
export async function hashPassword(password) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * So khớp mật khẩu.
 * db.json có dữ liệu mẫu lẫn bản băm SHA-256 nên chấp nhận cả hai.
 */
function passwordMatches(stored, plain, hashed) {
  if (!stored) return false;
  return stored === hashed || stored === plain;
}

/* ------------------------------------------------------------------ *
 * 4. ĐỊNH DẠNG EMAIL / TÊN TÀI KHOẢN
 * ------------------------------------------------------------------ */

export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value).trim());

/** Tên tài khoản: chữ/số/dấu gạch, bắt đầu bằng chữ hoặc số. */
export const isUsername = (value) => /^[a-z0-9][a-z0-9._-]{2,30}$/i.test(String(value).trim());

const looksValid = (value) => {
  const identifier = String(value).trim();
  return isEmail(identifier) || isUsername(identifier);
};

/* ------------------------------------------------------------------ *
 * 5. TÀI KHOẢN MẪU (dự phòng khi chưa bật json-server)
 * ------------------------------------------------------------------ */

const HASH_MOVIEF123 = "0ad340ea991eeb5bce6d5da55c4a2d25ef75408cce4234f6cc324c2df1bf55e7";

/** Trùng với tài khoản trong data/db.json — chỉ dùng khi không kết nối được máy chủ. */
export const DEMO_ACCOUNTS = [
  {
    id: "mf-demo-1",
    username: "nguyenvana",
    email: "nguyenvana@gmail.com",
    fullname: "Nguyễn Văn A",
    password: HASH_MOVIEF123,
    avatar: "images/avatar/default.svg",
    roleId: 3,
    status: "active",
    createdAt: "2026-09-20",
  },
  {
    id: "mf-demo-2",
    username: "blocked01",
    email: "blocked@gmail.com",
    fullname: "Tài khoản bị khóa",
    password: HASH_MOVIEF123,
    avatar: "images/avatar/default.svg",
    roleId: 3,
    status: "blocked",
    createdAt: "2026-09-20",
  },
];

const API_TIMEOUT = 3000;

const withTimeout = (request) =>
  Promise.race([
    request(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), API_TIMEOUT)),
  ]);

/** Nạp danh sách tài khoản: ưu tiên API, không có máy chủ thì dùng tài khoản mẫu. */
async function loadUsers() {
  try {
    const users = await withTimeout(() => api.get("/users"));
    if (Array.isArray(users)) return { users, source: "api" };
  } catch {
    /* json-server chưa chạy -> dùng dữ liệu mẫu */
  }
  return { users: DEMO_ACCOUNTS, source: "demo" };
}

/* ------------------------------------------------------------------ *
 * 6. KIỂM TRA TÀI KHOẢN ĐĂNG NHẬP
 * ------------------------------------------------------------------ */

/** Trạng thái bị khoá theo chuẩn của dự án. */
const BLOCKED_STATUS = ["blocked", "inactive", "banned", "disabled", "locked"];

/**
 * Kiểm tra tài khoản đăng nhập theo đúng 6 bước nghiệp vụ.
 *
 * @param {{identifier?:string, password?:string}} input
 * @returns {Promise<{ok:boolean, code:string, field?:string, message:string, user?:object, source?:string}>}
 *
 * code: empty-identifier | invalid-identifier | empty-password | not-found
 *       | wrong-password | blocked | ok | error
 */
export async function checkAccount({ identifier = "", password = "" } = {}) {
  const account = String(identifier).trim();
  const secret = String(password);

  // Bước 1 — email / tên tài khoản có được nhập hay chưa.
  if (!account) {
    return {
      ok: false,
      code: "empty-identifier",
      field: "identifier",
      message: "Vui lòng nhập email hoặc tên tài khoản.",
    };
  }

  // Bước 1b — định dạng có hợp lệ hay không.
  if (!looksValid(account)) {
    return {
      ok: false,
      code: "invalid-identifier",
      field: "identifier",
      message: account.includes("@")
        ? "Email không hợp lệ."
        : "Tên tài khoản không hợp lệ.",
    };
  }

  // Bước 2 — mật khẩu.
  if (!secret) {
    return {
      ok: false,
      code: "empty-password",
      field: "password",
      message: "Vui lòng nhập mật khẩu.",
    };
  }

  const { users, source } = await loadUsers();

  // Bước 3 — tài khoản có tồn tại hay không.
  const needle = account.toLowerCase();
  const found = users.find(
    (item) =>
      String(item?.email || "").trim().toLowerCase() === needle ||
      String(item?.username || "").trim().toLowerCase() === needle,
  );

  if (!found) {
    return {
      ok: false,
      code: "not-found",
      field: "identifier",
      message: "Tài khoản không tồn tại.",
      source,
    };
  }

  // Bước 4 — mật khẩu có chính xác hay không.
  const hashed = await hashPassword(secret);
  if (!passwordMatches(found.password, secret, hashed)) {
    return {
      ok: false,
      code: "wrong-password",
      field: "password",
      message: "Mật khẩu không chính xác.",
      source,
    };
  }

  // Bước 5 — trạng thái tài khoản.
  const status = String(found.status || "active").toLowerCase();
  if (BLOCKED_STATUS.includes(status)) {
    return {
      ok: false,
      code: "blocked",
      field: "identifier",
      message: "Tài khoản của bạn đã bị khóa.",
      source,
    };
  }

  // Bước 6 — hợp lệ: trả về thông tin đăng nhập (KHÔNG kèm mật khẩu).
  const safeUser = { ...found };
  delete safeUser.password;

  return {
    ok: true,
    code: "ok",
    message: "Đăng nhập thành công!",
    user: safeUser,
    source,
  };
}

/* ------------------------------------------------------------------ *
 * 7. KHỞI TẠO
 * ------------------------------------------------------------------ */

reconcileSession();

export default {
  SESSION_KEY,
  REDIRECT_KEY,
  NOTICE_KEY,
  DEMO_ACCOUNTS,
  getSessionUser,
  isSignedIn,
  saveSession,
  clearSession,
  requireAuth,
  takeNotice,
  takeRedirect,
  hashPassword,
  isEmail,
  isUsername,
  checkAccount,
};
