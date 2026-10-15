/**
 * store.js — State tối giản dùng chung cho trang Cá nhân.
 * Mẫu: publish/subscribe, component tự render lại khi state đổi.
 */

import { loadDashboard, currentScopeId } from "./service.js";

const state = {
  ready: false,
  mode: "demo",
  scopeId: currentScopeId(),
  profile: null,
  stats: [],
  settings: {},
  continueWatching: [],
  favorites: [],
  watchLater: [],
  history: [],
  reviews: [],
  activeTab: "overview",
  historyLimit: 8,
  favoriteFilter: "all",
};

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get state() {
    return state;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Gán giá trị mới (merge shallow) rồi phát sự kiện. */
  set(patch) {
    Object.assign(state, patch);
    emit();
  },

  /** Cập nhật qua hàm, tiện khi cần đọc state hiện tại. */
  update(fn) {
    const result = fn(state);
    if (result && typeof result === "object") Object.assign(state, result);
    emit();
  },

  /** Nạp lại toàn bộ dữ liệu từ service. */
  async reload() {
    const data = await loadDashboard();
    Object.assign(state, data, { ready: true });
    emit();
    return data;
  },
};

/** Danh sách tab hợp lệ — dùng cho cả ProfileNavigation lẫn ProfileSidebar. */
export const TABS = [
  { id: "overview", label: "Tổng quan", icon: "grid" },
  { id: "history", label: "Lịch sử xem", icon: "history", countKey: "history" },
  { id: "favorites", label: "Yêu thích", icon: "heart", countKey: "favorites" },
  { id: "watchLater", label: "Xem sau", icon: "bookmark", countKey: "watchLater" },
  { id: "reviews", label: "Đánh giá", icon: "star", countKey: "reviews" },
];
