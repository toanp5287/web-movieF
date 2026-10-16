/**
 * search-history.js
 * Lưu/đọc lịch sử tìm kiếm cho chức năng gợi ý từ khóa ở thanh tìm kiếm.
 *
 * Quy tắc:
 * - Người đã đăng nhập: lưu bền trong `data/db.json` qua json-server
 *   (collection "searchHistories", mỗi bản ghi gắn `userId`) — dùng đúng
 *   cơ chế lưu trữ mà dự án đã có cho `favorites` / `histories`.
 * - Người chưa đăng nhập: chỉ lưu trong `sessionStorage` của phiên hiện tại.
 *   Đóng trình duyệt là mất, không ghi vào tài khoản nào.
 *
 * Từ khóa: cắt khoảng trắng hai đầu, không lưu chuỗi rỗng, chống trùng
 * không phân biệt chữ hoa/chữ thường (và bỏ dấu để khớp cách tìm kiếm hiện tại).
 */

import api from "../api.js";

/** Khóa sessionStorage cho lịch sử của người chưa đăng nhập. */
const GUEST_KEY = "movieF_searchHistory_guest";

/** Endpoint json-server (tương ứng collection trong data/db.json). */
const ENDPOINT = "/searchHistories";

/** Giới hạn số bản ghi giữ trong bộ nhớ phiên để tránh phình vô hạn. */
const MAX_KEEP = 20;

/** So khớp id kiểu số/chuỗi (db.json trộn cả hai dạng). */
const sameId = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

/** Chuẩn hoá để so trùng: bỏ dấu tiếng Việt + hạ chữ thường. */
export const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** Cắt khoảng trắng thừa hai đầu; trả "" nếu không có nội dung. */
export const normalizeKeyword = (raw) => String(raw ?? "").trim();

/** Tài khoản đang đăng nhập (null nếu là khách). */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Lịch sử của khách (sessionStorage)
 * ------------------------------------------------------------------ */

function readGuestHistory() {
  try {
    const list = JSON.parse(sessionStorage.getItem(GUEST_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeGuestHistory(list) {
  try {
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(0, MAX_KEEP)));
  } catch {
    /* sessionStorage bị chặn: bỏ qua, gợi ý chỉ không có lịch sử. */
  }
}

/* ------------------------------------------------------------------ *
 * Lịch sử của tài khoản (json-server / db.json)
 * ------------------------------------------------------------------ */

/** Đọc toàn bộ bản ghi của tài khoản, mới nhất trước. */
async function readAccountHistory(userId) {
  const all = await api.get(ENDPOINT);
  if (!Array.isArray(all)) return [];
  return all
    .filter((item) => sameId(item.userId, userId))
    .map((item) => ({
      id: item.id,
      keyword: String(item.keyword ?? "").trim(),
      searchedAt: item.searchedAt || "",
    }))
    .filter((item) => item.keyword)
    .sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt));
}

/* ------------------------------------------------------------------ *
 * API công khai
 * ------------------------------------------------------------------ */

/**
 * Lấy lịch sử tìm kiếm của người dùng hiện tại, mới nhất trước.
 * @returns {Promise<Array<{keyword: string, searchedAt: string}>>}
 */
export async function loadSearchHistory() {
  const user = getCurrentUser();
  if (!user?.id) return readGuestHistory();

  try {
    return await readAccountHistory(user.id);
  } catch (err) {
    console.warn("[search-history] Không đọc được lịch sử tìm kiếm:", err);
    return [];
  }
}

/**
 * Ghi nhận một lần tìm kiếm thực sự (Enter hoặc chọn gợi ý).
 * - Bỏ qua từ khóa rỗng.
 * - Nếu từ khóa đã có (không phân biệt hoa/thường): cập nhật thời gian và
 *   đưa lên đầu, KHÔNG tạo bản ghi trùng.
 * @returns {Promise<void>}
 */
export async function saveSearchKeyword(raw) {
  const keyword = normalizeKeyword(raw);
  if (!keyword) return;

  const now = new Date().toISOString();
  const user = getCurrentUser();

  // Khách: chỉ lưu trong phiên hiện tại.
  if (!user?.id) {
    const list = readGuestHistory().filter((item) => fold(item.keyword) !== fold(keyword));
    list.unshift({ keyword, searchedAt: now });
    writeGuestHistory(list);
    return;
  }

  // Tài khoản: lưu bền trong db.json.
  try {
    const all = await api.get(ENDPOINT);
    const existing = Array.isArray(all)
      ? all.find(
          (item) => sameId(item.userId, user.id) && fold(item.keyword) === fold(keyword),
        )
      : null;

    if (existing) {
      await api.patch(`${ENDPOINT}/${existing.id}`, { keyword, searchedAt: now });
    } else {
      await api.post(ENDPOINT, {
        userId: String(user.id),
        keyword,
        searchedAt: now,
      });
    }
  } catch (err) {
    console.warn("[search-history] Không lưu được lịch sử tìm kiếm:", err);
  }
}
