/**
 * movies.js  (/movies)
 * Render lưới phim từ data/db.json.
 *
 * Mỗi thẻ được dựng từ dữ liệu thật và trỏ tới "/movie-detail?id=<id phim>".
 * Phim thiếu poster, chưa xuất bản hoặc id không hợp lệ sẽ không được render.
 *
 * Ô tìm kiếm + 4 dropdown lọc (thể loại / năm / đánh giá / sắp xếp) trước đây
 * nằm trong HTML nhưng không gắn listener nên bấm không có gì xảy ra. Nay chúng
 * cùng điều khiển một `state` và vẽ lại lưới.
 */

import {
  averageRating,
  bindImageFallback,
  escapeHtml,
  formatViews,
  genreNames,
  loadCatalog,
  sameId,
} from "./movie-data.js";
import { renderMovieCards } from "./movie-card.js";
import { attachSearchSuggest } from "./search-suggest.js";

const PAGE_SIZE = 10;

/** Trạng thái bộ lọc hiện tại (đọc từ DOM, giữ trong bộ nhớ khi vẽ lại). */
const state = {
  q: "",
  genre: "",
  year: "",
  rating: "",
  sort: "newest",
  type: "",
  actor: "",
  page: 1,
};

  let catalog = null;
  let grid = null;
  let loading = null;

  try {
    const params = new URLSearchParams(window.location.search);
    const actor = params.get("actor");
    if (actor && actor.trim()) {
      state.actor = actor.trim();
    }
  } catch (e) {}

/* ------------------------------------------------------------------ *
 * 1. LỌC + SẮP XẾP
 * ------------------------------------------------------------------ */

/** Bỏ dấu + hạ chữ thường để tìm không phân biệt tiếng Việt/Anh. */
const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Chuỗi tìm kiếm gồm tên, mô tả, đạo diễn, diễn viên và thể loại. */
function haystack(movie) {
  if (movie._hay) return movie._hay;
  const names = genreNames(movie, catalog.genres).join(" ");
  const actors = Array.isArray(movie.actors) ? movie.actors.join(" ") : "";
  movie._hay = fold(
    [
      movie.title,
      movie.description,
      movie.director,
      actors,
      names,
    ].join(" "),
  );
  return movie._hay;
}

/** Điểm đánh giá hiển thị trên thang 10 (đều null nếu chưa có review). */
const ratingOf = (movie) => {
  const avg = averageRating(movie, catalog.reviews);
  return avg === null ? null : avg * 2;
};

function matches(movie) {
  if (state.actor) {
    const target = fold(state.actor);
    if (!target) return false;
    const actors = Array.isArray(movie.actors) ? movie.actors : [];
    const matchActor = actors.some((a) => {
      const f = fold(a);
      if (!f) return false;
      if (f === target) return true;
      if (f.length >= target.length && f.includes(target)) {
        const idx = f.indexOf(target);
        const before = idx === 0 ? "" : f[idx - 1];
        const after = idx + target.length >= f.length ? "" : f[idx + target.length];
        if (/\s/.test(before) || /\s/.test(after) || (before === "" && after === "")) {
          if (before === "" || after === "" || /\s/.test(before) || /\s/.test(after)) return true;
        }
      }
      return f === target;
    });
    if (!matchActor) return false;
  }

  const q = fold(state.q).trim();
  if (q && !haystack(movie).includes(q)) return false;

  if (state.genre) {
    // normalizeMovie để lại genreIds (mã số), nên so trực tiếp với mã trong <option>
    const ids = movie.genreIds || [];
    if (!ids.some((gid) => sameId(gid, state.genre))) return false;
  }

  if (state.year) {
    const y = Number(movie.year) || 0;
    if (state.year === "2020s" && !(y >= 2020 && y <= 2029)) return false;
    if (state.year === "classic" && y >= 2000) return false;
    if (/^\d{4}$/.test(state.year) && y !== Number(state.year)) return false;
  }

  if (state.rating) {
    const r = ratingOf(movie);
    if (state.rating === "top") {
      if (r === null || r < 8) return false;
    } else if (r === null || r < Number(state.rating)) {
      return false;
    }
  }

  if (state.type && movie.type !== state.type) return false;

  return true;
}

const SORTERS = {
  newest: (a, b) =>
    (b.year || 0) - (a.year || 0) || (b.views || 0) - (a.views || 0),
  oldest: (a, b) => (a.year || 0) - (b.year || 0),
  rating: (a, b) =>
    (ratingOf(b) ?? -1) - (ratingOf(a) ?? -1) ||
    (b.views || 0) - (a.views || 0),
  views: (a, b) => (b.views || 0) - (a.views || 0),
  az: (a, b) => String(a.title).localeCompare(String(b.title), "vi"),
};

/** Danh sách phim đã lọc + sắp xếp (không cắt trang). */
function visibleMovies() {
  return catalog.movies
    .filter(matches)
    .sort(SORTERS[state.sort] || SORTERS.newest);
}

/* ------------------------------------------------------------------ *
 * 2. VẼ LẠI
 * ------------------------------------------------------------------ */

async function draw() {
  if (!catalog || !grid) return;

  const all = visibleMovies();
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pages);
  const slice = all.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  if (loading) loading.remove();

  grid.innerHTML = "";
  if (slice.length) {
    renderMovieCards(grid, slice, catalog);
    bindImageFallback(grid);
  }

  toggleEmptyState(all.length === 0);
  updateCounters(slice.length, all.length);
  renderPageButtons(pages);
}

function updateCounters(shown, matched) {
  const total = catalog.movies.length;

  const totalEl = document.querySelector("[data-metric='total-movies']");
  if (totalEl) totalEl.textContent = String(total);

  const badge = document.querySelector("[data-metric='catalog-badge']");
  if (badge) badge.textContent = `${total} Phim`;

  const all = Array.isArray(catalog.movies) ? catalog.movies.filter(matches) : [];
  const viewsTotal = all.reduce((sum, m) => {
    const v = Number(m && m.views);
    if (Number.isFinite(v) && v >= 0) return sum + v;
    return sum;
  }, 0);
  const viewsEl = document.querySelector("[data-metric='total-views']");
  if (viewsEl) viewsEl.textContent = formatViews(viewsTotal);

  const counter = document.querySelector("[data-metric='result-counter']");
  if (counter) {
    if (state.actor) {
      if (!matched) {
        counter.innerHTML = `Không có phim nào với diễn viên <span class="font-semibold text-on-surface">${escapeHtml(state.actor)}</span>`;
      } else {
        counter.innerHTML = `Phim có diễn viên <span class="font-semibold text-on-surface">${escapeHtml(state.actor)}</span> (${matched} phim)`;
      }
    } else if (!matched) {
      counter.innerHTML = `Không có phim nào phù hợp với bộ lọc hiện tại`;
    } else {
      const from = (state.page - 1) * PAGE_SIZE + 1;
      const to = (state.page - 1) * PAGE_SIZE + shown;
      counter.innerHTML =
        `Đang hiển thị <span class="font-semibold text-on-surface">${from} - ${to}</span>` +
        ` trong số <span class="font-semibold text-on-surface">${matched}</span> phim` +
        (matched !== total ? ` (tổng ${total})` : "");
    }
  }

}

function renderPageButtons(pages) {
  const host = document.querySelector("[data-metric='pagination-pages']");
  if (!host) return;

  const btn = (n, label, active) =>
    `<button class="w-9 h-9 rounded-lg font-title-sm text-title-sm font-bold flex items-center justify-center ${
      active
        ? "bg-primary-container text-on-primary-container shadow-md shadow-primary-container/20"
        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
    }" type="button" data-page="${n}" ${active ? 'aria-current="page"' : ""}>${label}</button>`;

  // Cửa sổ trang: ít trang thì hiện hết; nhiều trang thì lùi dần quanh trang
  // hiện tại, luôn giữ trang đầu/cuối và chèn "…" ở khoảng bị bỏ qua.
  const nums = new Set([1, pages]);
  if (pages <= 7) {
    for (let n = 1; n <= pages; n++) nums.add(n);
  } else {
    for (let n = state.page - 1; n <= state.page + 1; n++) {
      if (n >= 1 && n <= pages) nums.add(n);
    }
  }
  const list = [...nums]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  let html = "";
  let prev = 0;
  for (const n of list) {
    if (n - prev > 1)
      html += `<span class="px-1 text-on-surface-variant">…</span>`;
    html += btn(n, n, n === state.page);
    prev = n;
  }
  host.innerHTML = html;

  // Khoá nút "Trước" ở trang đầu và "Sau" ở trang cuối (dựa trên data-dir
  // nên không phụ thuộc vào nhãn chữ).
  const prevBtn = document.querySelector("[data-dir='prev']");
  const nextBtn = document.querySelector("[data-dir='next']");
  if (prevBtn) prevBtn.disabled = state.page <= 1;
  if (nextBtn) nextBtn.disabled = state.page >= pages;
}

/** Bật/tắt trạng thái rỗng đã dựng sẵn trong movies.html. */
function toggleEmptyState(isEmpty) {
  const empty = document.getElementById("empty-state");
  const pagination = document.querySelector("[data-metric='pagination']");
  const g = document.querySelector("[data-metric='movie-grid']");
  if (empty) empty.classList.toggle("hidden", !isEmpty);
  if (pagination) pagination.classList.toggle("hidden", isEmpty);
  if (g) g.classList.toggle("hidden", isEmpty);
}

/* ------------------------------------------------------------------ *
 * 3. GẮN SỰ KIỆN
 * ------------------------------------------------------------------ */

/** Đồng bộ hai ô tìm kiếm (header + thanh lọc) với nhau. */
function setQuery(value, from) {
  state.q = value;
  state.page = 1;
  for (const key of ["search"]) {
    const el = document.querySelector(`[data-metric='${key}']`);
    if (el && el !== from) el.value = value;
  }
  draw();
}

/** Năm trong dropdown phải lấy từ dữ liệu thật, không ghi cứng 2022-2024. */
function fillYearOptions() {
  const sel = document.querySelector("[data-metric='filter-year']");
  if (!sel) return;

  const years = [
    ...new Set(catalog.movies.map((m) => Number(m.year) || 0).filter(Boolean)),
  ].sort((a, b) => b - a);
  const current = sel.value;
  sel.innerHTML =
    `<option value="">Năm: Tất cả</option>` +
    years.map((y) => `<option value="${y}">Năm ${y}</option>`).join("") +
    `<option value="2020s">Thập niên 2020s</option>` +
    `<option value="classic">Kinh điển (trước 2000)</option>`;
  if ([...sel.options].some((o) => o.value === current)) sel.value = current;
}

function bindControls() {
  for (const key of ["search"]) {
    const el = document.querySelector(`[data-metric='${key}']`);
    if (!el) continue;
    el.addEventListener("input", () => setQuery(el.value, el));
  }

  const map = {
    "filter-genre": "genre",
    "filter-year": "year",
    "filter-rating": "rating",
    "filter-sort": "sort",
  };
  for (const [metric, field] of Object.entries(map)) {
    const el = document.querySelector(`[data-metric='${metric}']`);
    if (!el) continue;
    el.addEventListener("change", () => {
      state[field] = el.value;
      state.page = 1;
      draw();
    });
  }

  const typeButtons = document.querySelectorAll("[data-metric='filter-type']");
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.type || "";
      state.page = 1;

      typeButtons.forEach((item) => {
        item.classList.remove("bg-on-surface", "text-surface", "font-semibold");
        item.classList.add(
          "bg-surface-container",
          "text-on-surface-variant",
          "border",
          "border-white/5",
        );
      });

      button.classList.remove(
        "bg-surface-container",
        "text-on-surface-variant",
        "border",
        "border-white/5",
      );
      button.classList.add("bg-on-surface", "text-surface", "font-semibold");

      draw();
    });
  });

  // Phân trang: nút số trang + Trước/Sau
  document.addEventListener("click", (e) => {
    const pageBtn = e.target.closest("[data-page]");
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page) || 1;
      draw();
      document
        .querySelector("[data-metric='pagination']")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const nav = e.target.closest("[data-metric='pagination'] button");
    if (!nav || nav.disabled) return;
    const dir = nav.dataset.dir;
    if (dir === "prev") state.page = Math.max(1, state.page - 1);
    else if (dir === "next") state.page = state.page + 1;
    else return;
    draw();
  });
}

/* ------------------------------------------------------------------ *
 * 4. GỢI Ý TỪ KHÓA
 * ------------------------------------------------------------------ */

/**
 * Gắn danh sách gợi ý từ khóa cho ô lọc.
 * Chọn gợi ý (hoặc nhấn Enter) sẽ tìm bằng chính ô lọc hiện có; lịch sử chỉ
 * được ghi khi thực sự tìm, không ghi theo từng ký tự gõ vào.
 */
function bindSearchSuggest() {
  const el = document.querySelector("[data-metric='search']");
  if (!el) return;
  attachSearchSuggest(el, {
    onSearch: (keyword) => setQuery(keyword, el),
  });
}

/* ------------------------------------------------------------------ *
 * 5. KHỞI TẠO
 * ------------------------------------------------------------------ */

async function init() {
  grid = document.querySelector("[data-metric='movie-grid']");
  loading = document.querySelector("[data-metric='grid-loading']");

  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error("[movies] Không tải được data/db.json:", err);
    if (loading) loading.remove();
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span class="material-symbols-outlined text-5xl text-on-surface-variant/50">cloud_off</span>
          <p class="font-title-sm text-title-sm text-on-surface">Không tải được danh sách phim</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            Vui lòng chạy <code class="text-primary">npm run dev</code> để bật máy chủ dữ liệu
            hoặc kiểm tra lại file <code class="text-primary">data/db.json</code>.
          </p>
        </div>`;
    }
    return;
  }

  if (!catalog.movies.length) {
    if (loading) loading.remove();
    if (grid) grid.innerHTML = "";
    toggleEmptyState(true);
    const viewsEl = document.querySelector("[data-metric='total-views']");
    if (viewsEl) viewsEl.textContent = formatViews(0);
    updateCounters(0, 0);
    console.warn("[movies] Không có phim nào đạt yêu cầu hiển thị.");
    return;
  }

  // Sắp xếp mặc định theo đúng lựa chọn đang hiện trong dropdown.
  const sortSel = document.querySelector("[data-metric='filter-sort']");
  if (sortSel?.value) state.sort = sortSel.value;

  fillYearOptions();
  bindControls();
  bindSearchSuggest();

  // Từ khóa đến từ thanh tìm kiếm header (?search=...): nạp sẵn vào ô lọc
  // để chạy đúng thuật toán tìm kiếm hiện có.
  const initialQuery = (
    new URLSearchParams(window.location.search).get("search") || ""
  ).trim();
  if (initialQuery) {
    state.q = initialQuery;
    const searchEl = document.querySelector("[data-metric='search']");
    if (searchEl) searchEl.value = initialQuery;
  }

  await draw();
  // Ensure total views reflect filtered results even if draw timing differs
  try {
    updateCounters(
      document.querySelectorAll('[data-metric="movie-grid"] .movie-card').length,
      (Array.isArray(catalog.movies) ? catalog.movies.filter(matches).length : 0),
    );
  } catch (e) {}

  console.info(
    `[movies] Đã nạp ${catalog.movies.length} phim từ ${catalog.source}; lọc theo tên/thể loại/năm/đánh giá.`,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
