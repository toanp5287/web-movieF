/**
 * search-suggest.js
 * Gợi ý từ khóa cho thanh tìm kiếm MovieF.
 *
 * Hiển thị một danh sách ngay dưới ô tìm kiếm, tối đa 4 mục, gồm:
 *  - từ khóa tìm kiếm gần đây (lịch sử),
 *  - từ khóa khớp với nội dung đang nhập,
 *  - gợi ý thêm từ tên phim / đạo diễn / diễn viên trong dữ liệu có sẵn.
 *
 * Chỉ ghi lịch sử khi người dùng thực sự tìm (nhấn Enter hoặc chọn gợi ý),
 * không lưu theo từng ký tự gõ vào.
 *
 * Khi chọn gợi ý ở thanh tìm kiếm header, module điều hướng sang
 * `/movies?search=<từ khóa>` để dùng đúng cơ chế tìm kiếm hiện có của dự án.
 * Ô lọc trên trang /movies có thể truyền `onSearch` riêng để lọc tại chỗ.
 */

import api from "../api.js";
import { escapeHtml, DB_FALLBACK_URL } from "./movie-data.js";
import {
  loadSearchHistory,
  saveSearchKeyword,
  fold,
  normalizeKeyword,
} from "./search-history.js";

const MAX_ITEMS = 4;

/* ------------------------------------------------------------------ *
 * Nguồn gợi ý từ dữ liệu phim (tải lười, không dò ảnh nên rất nhẹ)
 * ------------------------------------------------------------------ */

let moviePool = null;
let moviePoolPromise = null;

/** Đọc danh sách phim qua json-server, lỗi thì dùng file db.json tĩnh. */
async function fetchMovies() {
  try {
    const list = await api.get("/movies");
    if (Array.isArray(list)) return list;
  } catch {
    /* rơi xuống file tĩnh */
  }
  try {
    const res = await fetch(DB_FALLBACK_URL, { cache: "no-cache" });
    const db = await res.json();
    return Array.isArray(db?.movies) ? db.movies : [];
  } catch {
    return [];
  }
}

/** Gom tên phim / đạo diễn / diễn viên thành danh sách từ khóa (đã loại trùng). */
async function ensureMoviePool() {
  if (moviePool) return moviePool;
  if (moviePoolPromise) return moviePoolPromise;

  moviePoolPromise = (async () => {
    const movies = await fetchMovies();
    const map = new Map();

    const add = (value) => {
      const text = normalizeKeyword(value);
      if (text.length < 2) return;
      const key = fold(text);
      if (!map.has(key)) map.set(key, text);
    };

    for (const movie of movies) {
      add(movie?.title);
      add(movie?.director);
      if (Array.isArray(movie?.actors)) movie.actors.forEach(add);
    }

    moviePool = [...map.entries()].map(([key, text]) => ({ key, text }));
    return moviePool;
  })().catch(() => {
    moviePool = [];
    return moviePool;
  });

  return moviePoolPromise;
}

/* ------------------------------------------------------------------ *
 * Tính danh sách gợi ý
 * ------------------------------------------------------------------ */

/**
 * Tối đa MAX_ITEMS gợi ý, đã loại trùng (không phân biệt hoa/thường).
 * - Ô trống: 4 từ khóa gần đây nhất.
 * - Đang nhập: ưu tiên lịch sử khớp nội dung, sau đó bổ sung từ dữ liệu phim.
 * @param {string} query
 * @returns {Promise<Array<{text: string, type: "history"|"movie"}>>}
 */
async function computeSuggestions(query) {
  const history = await loadSearchHistory();
  const q = fold(normalizeKeyword(query));

  const items = [];
  const seen = new Set();

  const push = (text, type) => {
    const clean = normalizeKeyword(text);
    const key = fold(clean);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ text: clean, type });
  };

  // Chưa nhập gì: chỉ hiện các từ khóa gần đây.
  if (!q) {
    for (const item of history) {
      if (items.length >= MAX_ITEMS) break;
      push(item.keyword, "history");
    }
    return items;
  }

  // Ưu tiên 1: từ khóa trong lịch sử khớp nội dung đang nhập.
  for (const item of history) {
    if (items.length >= MAX_ITEMS) break;
    if (fold(item.keyword).includes(q)) push(item.keyword, "history");
  }

  // Ưu tiên 2: bổ sung gợi ý khớp từ tên phim/đạo diễn/diễn viên.
  if (items.length < MAX_ITEMS) {
    const pool = await ensureMoviePool();
    for (const candidate of pool) {
      if (items.length >= MAX_ITEMS) break;
      if (candidate.key.includes(q)) push(candidate.text, "movie");
    }
  }

  return items;
}

/* ------------------------------------------------------------------ *
 * Thực hiện tìm kiếm
 * ------------------------------------------------------------------ */

/**
 * Lưu lịch sử rồi tìm kiếm.
 * Có `onSearch` (trang /movies) thì lọc tại chỗ; nếu không thì điều hướng
 * sang /movies?search= để chạy đúng cơ chế tìm kiếm hiện có.
 */
async function performSearch(rawKeyword, onSearch) {
  const keyword = normalizeKeyword(rawKeyword);
  if (!keyword) return;

  // Chờ lưu xong rồi mới điều hướng để không mất bản ghi khi rời trang.
  await saveSearchKeyword(keyword);

  if (typeof onSearch === "function") {
    onSearch(keyword);
    return;
  }

  window.location.href = `/movies?search=${encodeURIComponent(keyword)}`;
}

/* ------------------------------------------------------------------ *
 * UI dropdown
 * ------------------------------------------------------------------ */

/** Tạo (hoặc trả lại) khung dropdown gắn ngay dưới ô tìm kiếm. */
function ensureDropdown(input) {
  if (input.dataset.searchSuggestId) {
    return document.getElementById(input.dataset.searchSuggestId);
  }

  const wrapper = input.closest(".relative") || input.parentElement;
  if (!wrapper) return null;

  if (getComputedStyle(wrapper).position === "static") {
    wrapper.style.position = "relative";
  }

  const dropdown = document.createElement("div");
  dropdown.id = `searchSuggest-${Math.random().toString(36).slice(2, 9)}`;
  dropdown.setAttribute("role", "listbox");
  dropdown.hidden = true;
  dropdown.style.cssText = "position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:60";
  dropdown.className =
    "bg-surface-container-high border border-white/10 rounded-xl shadow-2xl overflow-hidden";

  wrapper.appendChild(dropdown);
  input.dataset.searchSuggestId = dropdown.id;
  input.setAttribute("autocomplete", "off");
  return dropdown;
}

/**
 * Gắn gợi ý từ khóa cho một ô tìm kiếm.
 * @param {HTMLInputElement} input
 * @param {{onSearch?: (keyword: string) => void}} [options]
 */
export function attachSearchSuggest(input, options = {}) {
  if (!input || input.dataset.searchSuggestBound === "1") return;
  input.dataset.searchSuggestBound = "1";

  const dropdown = ensureDropdown(input);
  if (!dropdown) return;

  let items = [];
  let activeIndex = -1;
  let requestId = 0;

  const close = () => {
    dropdown.hidden = true;
    activeIndex = -1;
  };

  const render = () => {
    if (!items.length) {
      dropdown.hidden = true;
      dropdown.innerHTML = "";
      return;
    }

    dropdown.innerHTML = items
      .map((item, index) => {
        const active = index === activeIndex;
        const icon = item.type === "history" ? "history" : "search";
        return `
          <button
            type="button"
            role="option"
            data-suggest-index="${index}"
            aria-selected="${active}"
            class="w-full flex items-center gap-2 px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
              active
                ? "bg-white/10 text-on-surface"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
            }"
          >
            <span class="material-symbols-outlined text-lg">${icon}</span>
            <span class="truncate">${escapeHtml(item.text)}</span>
          </button>`;
      })
      .join("");

    dropdown.hidden = false;
    dropdown.querySelectorAll("[data-suggest-index]").forEach((btn) => {
      btn.addEventListener("mousedown", (event) => {
        event.preventDefault(); // giữ focus để click không bị blur cắt mất
        pick(items[Number(btn.dataset.suggestIndex)]);
      });
    });
  };

  const pick = (item) => {
    if (!item) return;
    input.value = item.text;
    close();
    performSearch(item.text, options.onSearch);
  };

  const refresh = async () => {
    const id = ++requestId;
    const list = await computeSuggestions(input.value);
    if (id !== requestId) return; // bỏ kết quả cũ nếu người dùng đã gõ tiếp
    items = list;
    activeIndex = -1;
    render();
  };

  input.addEventListener("focus", refresh);
  input.addEventListener("input", refresh);
  input.addEventListener("blur", close);

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (dropdown.hidden) {
        refresh();
        return;
      }
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      render();
    } else if (event.key === "ArrowUp") {
      if (dropdown.hidden) return;
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!dropdown.hidden && activeIndex >= 0 && items[activeIndex]) {
        pick(items[activeIndex]);
      } else {
        close();
        performSearch(input.value, options.onSearch);
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (!dropdown.hidden && !dropdown.contains(event.target) && event.target !== input) {
      close();
    }
  });
}

/* ------------------------------------------------------------------ *
 * Tự gắn cho thanh tìm kiếm trên header (8 trang có ô này)
 * ------------------------------------------------------------------ */

const HEADER_SEARCH_SELECTOR =
  'header input[placeholder="Tìm kiếm phim, diễn viên..."]';

function initHeaderSearch() {
  document
    .querySelectorAll(HEADER_SEARCH_SELECTOR)
    .forEach((input) => attachSearchSuggest(input));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeaderSearch, { once: true });
} else {
  initHeaderSearch();
}
