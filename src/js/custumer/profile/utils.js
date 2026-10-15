/**
 * utils.js — Tiện ích dùng chung cho trang Cá nhân & Cài đặt MovieF.
 * Không phụ thuộc thư viện ngoài.
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

/** Chống chèn HTML từ dữ liệu người dùng / API. */
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

/** Gắn sự kiện `error` để ảnh hỏng tự thay bằng ảnh dự phòng. */
export function bindImageFallback(root = document) {
  $$("img[data-fallback]", root).forEach((img) => {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = "1";
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "1";
        img.src = img.dataset.fallback;
      },
      { once: true },
    );
  });
}

const svgPlaceholder = (label, from, to, w = 300, h = 450) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
      </linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(w / 4)}"
        font-weight="bold" fill="rgba(255,255,255,0.8)">${label}</text>
    </svg>`,
  );

export const POSTER_FALLBACK = svgPlaceholder("MF", "#1b1d23", "#0b0d12");
export const AVATAR_FALLBACK = svgPlaceholder("MF", "#2a2e37", "#0b0d12", 240, 240);

/** Chuẩn hoá đường dẫn ảnh về dạng tuyệt đối theo thư mục `public`. */
export const mediaUrl = (path, fallback = POSTER_FALLBACK) =>
  path && String(path).trim() ? `/${String(path).replace(/^\/+/, "")}` : fallback;

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const watchHref = (movie, seconds = 0) =>
  `/watch?id=${encodeURIComponent(movie.id)}&slug=${encodeURIComponent(
    slugify(movie.slug || movie.title),
  )}&t=${Math.floor(seconds || 0)}`;

export const detailHref = (movie) =>
  `/movie-detail?id=${encodeURIComponent(movie.id)}&slug=${encodeURIComponent(
    slugify(movie.slug || movie.title),
  )}`;

/* ---------------------------------------------------------------- *
 * Định dạng dữ liệu
 * ---------------------------------------------------------------- */

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("vi-VN");
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatLongDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRelative(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Vừa xem";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(value);
}

/** 95 -> "1h 35p" */
export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (!total) return "0p";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours ? `${hours}h ${mins}p` : `${mins}p`;
}

/** Tổng phút -> "86h" (làm tròn 1 chữ số thập phân khi cần). */
export function formatHours(hours) {
  const value = Number(hours) || 0;
  if (!value) return "0h";
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

/* ---------------------------------------------------------------- *
 * Storage an toàn
 * ---------------------------------------------------------------- */

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* bỏ qua */
    }
  },
};

/* ---------------------------------------------------------------- *
 * DOM
 * ---------------------------------------------------------------- */

/** Gán innerHTML rồi tự bind fallback ảnh. */
export function render(target, html) {
  const node = typeof target === "string" ? $(target) : target;
  if (!node) return null;
  node.innerHTML = html;
  bindImageFallback(node);
  return node;
}

export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Khoá cuộn trang khi mở modal/drawer (tự giải phóng khi đóng hết). */
const scrollLocks = new Set();
export function lockScroll(id) {
  scrollLocks.add(id);
  document.body.style.overflow = "hidden";
}
export function unlockScroll(id) {
  scrollLocks.delete(id);
  if (!scrollLocks.size) document.body.style.overflow = "";
}
