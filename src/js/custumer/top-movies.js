/**
 * top-movies.js  (/topMovies)
 *
 * Trang Top phim: Podium #1-#3 và bảng xếp hạng chi tiết (#04 trở đi).
 *
 * - Dữ liệu lấy từ data/db.json qua loadCatalog() (movie-data.js), không tạo
 *   dữ liệu phim mới.
 * - Sắp xếp theo trường `views` GIẢM DẦN — đúng tiêu chí "Top phim" mà dự án
 *   đang dùng ở trang quản trị (src/js/admin/dashboard.js). Khi bằng lượt xem
 *   thì xét điểm trung bình từ bảng `reviews`.
 * - db.json KHÔNG có trường rating/imdb/rank. Khối "Đánh giá" (nếu có) được
 *   tính từ bảng `reviews` bằng averageRating(), hiển thị ra thang 10.
 * - Mọi class Tailwind đều giữ nguyên như bản thiết kế gốc để giao diện không đổi.
 */

import {
  POSTER_FALLBACK,
  averageRating,
  bindImageFallback,
  detailUrl,
  escapeHtml,
  formatDuration,
  formatViews,
  genreNames,
  loadCatalog,
  qualityLabel,
  watchUrl,
} from "./movie-data.js";

/** Số phim trên Podium (#1-#3). */
const PODIUM_SIZE = 3;
/** Bảng chi tiết bắt đầu ngay sau Podium, tức từ #04. */
const RANK_START = PODIUM_SIZE + 1;
/** Đúng thiết kế sẵn có: bảng chi tiết hiển thị #04 - #10. */
const LIST_SIZE = 7;

const pad2 = (n) => String(n).padStart(2, "0");

/** 169 -> "2h 49m" (giữ đúng kiểu hiển thị ngắn của Podium). */
function fmtRuntime(minutes) {
  const total = Number(minutes) || 0;
  if (total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Năm phát hành: ưu tiên releaseYear (db.json), dự phòng year cũ. */
const yearOf = (movie) => Number(movie.releaseYear) || Number(movie.year) || 0;

/** Điểm trung bình reviews (thang 1-5) đổi ra thang 10 cho khớp giao diện. */
function ratingOf(movie, catalog) {
  const avg = averageRating(movie, catalog.reviews);
  return avg === null ? null : avg * 2;
}

/** Chuỗi thể loại để hiển thị, "" nếu phim không gắn thể loại nào. */
const genreLabel = (movie, catalog) =>
  genreNames(movie, catalog.genres).join(" • ");

/** Danh sách phim đã sắp xếp theo lượt xem giảm dần (điểm reviews làm phụ). */
function rankedMovies(catalog) {
  return catalog.movies
    .slice()
    .sort(
      (a, b) =>
        (b.views || 0) - (a.views || 0) ||
        (ratingOf(b, catalog) ?? -1) - (ratingOf(a, catalog) ?? -1),
    );
}

/* ------------------------------------------------------------------ *
 * PODIUM #1-#3
 * ------------------------------------------------------------------ */

/** Cấu hình thẻ hạng 2 (Bạc) và hạng 3 (Đồng) — giữ nguyên class gốc. */
const SIDE_MEDALS = {
  2: {
    order: "order-2 lg:order-1",
    badge:
      "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 shadow-[0_4px_16px_rgba(203,213,225,0.4)]",
    rankText: "text-surface-container-lowest",
    label: "BẠC",
  },
  3: {
    order: "order-3 lg:order-3",
    badge:
      "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 shadow-[0_4px_16px_rgba(180,83,9,0.4)]",
    rankText: "text-on-primary-container",
    label: "ĐỒNG",
  },
};

/** Thẻ hạng 2/3 bên cạnh Podium. */
function podiumSide(movie, rank, catalog) {
  const medal = SIDE_MEDALS[rank];
  const title = escapeHtml(movie.title);
  const year = yearOf(movie);
  const runtime = fmtRuntime(movie.duration);
  const genres = genreLabel(movie, catalog);
  const rating = ratingOf(movie, catalog);

  const ratingBadge =
    rating === null
      ? ""
      : `<div class="absolute bottom-space-sm left-space-sm flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-sm">
                  <span class="material-symbols-outlined text-secondary text-[16px]" style="font-variation-settings: &quot;FILL&quot; 1">star</span>
                  <span class="font-title-sm text-title-sm font-bold text-on-surface">${rating.toFixed(1)}</span>
                </div>`;

  return `
            <div
              class="${medal.order} lg:col-span-3 bg-surface-container rounded-xl p-space-md flex flex-col relative group transition-all duration-300 hover:-translate-y-2 shadow-xl hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.8)]"
            >
              <div
                class="absolute -top-4 -left-3 z-20 flex items-center justify-center w-12 h-12 rounded-xl ${medal.badge}"
              >
                <span
                  class="font-headline-sm text-headline-sm font-black ${medal.rankText} tracking-tighter"
                  >#${pad2(rank)}</span
                >
              </div>
              <div class="absolute top-space-md right-space-md z-20">
                <span
                  class="px-space-xs py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-md font-label-caps text-label-caps text-on-surface"
                  >${medal.label}</span
                >
              </div>
              <div
                class="relative w-full aspect-[2/3] rounded-lg overflow-hidden mb-space-md bg-surface-container-lowest"
              >
                <img
                  alt="Poster phim ${title}"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  data-fallback="${POSTER_FALLBACK}"
                  decoding="async"
                  loading="lazy"
                  src="${escapeHtml(movie.poster || POSTER_FALLBACK)}"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent opacity-60"
                ></div>${ratingBadge}
              </div>
              <div class="flex flex-col flex-1">
                <span
                  class="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1"
                  >${escapeHtml(genres)}</span
                >
                <h2
                  class="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight line-clamp-1"
                >
                  ${title}
                </h2>
                ${
                  movie.country
                    ? `<span class="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">${escapeHtml(movie.country)}</span>`
                    : ""
                }
                <div
                  class="grid grid-cols-2 gap-space-xs py-space-xs bg-surface-container-low rounded-lg px-space-sm mb-space-md text-on-surface-variant font-body-sm text-body-sm"
                >
                  <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]"
                      >calendar_today</span
                    >
                    <span>${year || ""}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]"
                      >schedule</span
                    >
                    <span>${escapeHtml(runtime)}</span>
                  </div>
                  <div class="col-span-2 flex items-center gap-1 text-primary">
                    <span class="material-symbols-outlined text-[16px]"
                      >visibility</span
                    >
                    <span>${escapeHtml(formatViews(movie.views))} lượt xem</span>
                  </div>
                </div>
                <div class="flex items-center gap-space-xs mt-auto">
                  <a
                    class="flex-1 py-2 px-space-md rounded-lg bg-surface-container-highest hover:bg-primary-container text-on-surface hover:text-on-primary font-title-sm text-title-sm font-semibold flex items-center justify-center gap-space-xs transition-colors"
                    href="${watchUrl(movie.id)}"
                  >
                    <span class="material-symbols-outlined text-[18px]"
                      >play_arrow</span
                    >
                    <span>Xem ngay</span>
                  </a>
                  <button
                    aria-label="Lưu phim"
                    class="p-2 rounded-lg bg-surface-container-highest hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[20px]"
                      >bookmark</span
                    >
                  </button>
                </div>
              </div>
            </div>`;
}

/** Thẻ Quán quân #1 (khối lớn ở giữa). */
function podiumCenter(movie, catalog) {
  const title = escapeHtml(movie.title);
  const year = yearOf(movie);
  const runtime = fmtRuntime(movie.duration);
  const genres = genreLabel(movie, catalog);
  const quality = qualityLabel(movie);
  const rating = ratingOf(movie, catalog);
  const description = escapeHtml(movie.description);

  const ratingBadge =
    rating === null
      ? ""
      : `<div class="absolute bottom-space-sm left-space-sm flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md">
                    <span class="material-symbols-outlined text-secondary text-[20px]" style="font-variation-settings: &quot;FILL&quot; 1">star</span>
                    <span class="font-headline-sm text-headline-sm font-extrabold text-on-surface">${rating.toFixed(1)}</span>
                    <span class="text-on-surface-variant font-label-md text-label-md">/10</span>
                  </div>`;

  return `
            <div
              class="order-1 lg:order-2 lg:col-span-6 bg-gradient-to-b from-surface-container-high via-surface-container to-surface-container rounded-2xl p-space-lg flex flex-col relative group transition-all duration-300 lg:-translate-y-4 shadow-[0_24px_60px_-12px_rgba(229,9,20,0.35)]"
            >
              <div
                class="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-space-xs whitespace-nowrap px-space-lg py-2 rounded-full bg-gradient-to-r from-secondary-container via-primary-container to-secondary-container shadow-[0_0_30px_rgba(238,152,0,0.6)] animate-pulse"
              >
                <span
                  class="material-symbols-outlined text-on-primary-container text-[22px]"
                  style="font-variation-settings: &quot;FILL&quot; 1"
                  >workspace_premium</span
                >
                <span
                  class="font-headline-sm text-headline-sm font-black text-on-primary-container tracking-wide"
                  >QUÁN QUÂN #01</span
                >
              </div>
              <div
                class="grid grid-cols-1 md:grid-cols-12 gap-space-lg pt-space-xs items-center"
              >
                <div
                  class="md:col-span-5 relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl"
                >
                  <img
                    alt="Poster phim ${title}"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    data-fallback="${POSTER_FALLBACK}"
                    decoding="async"
                    src="${escapeHtml(movie.poster || POSTER_FALLBACK)}"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent"
                  ></div>
                  <div
                    class="absolute top-space-sm left-space-sm px-space-sm py-1 rounded bg-secondary-container text-on-secondary-container font-label-caps text-label-caps uppercase font-extrabold tracking-wider shadow-md"
                  >
                    Top 1 Thịnh Hành
                  </div>${ratingBadge}
                </div>
                <div class="md:col-span-7 flex flex-col h-full justify-between">
                  <div>
                    <div
                      class="flex items-center gap-space-xs mb-space-xs flex-wrap"
                    >
                      <span
                        class="font-label-caps text-label-caps uppercase text-secondary font-bold"
                        >${escapeHtml(genres)}</span
                      >
                      ${
                        quality
                          ? `<span class="w-1.5 h-1.5 rounded-full bg-surface-variant"></span>
                      <span
                        class="px-2 py-0.5 rounded bg-surface-container-highest font-label-caps text-label-caps text-on-surface-variant"
                        >${escapeHtml(quality)}</span
                      >`
                          : ""
                      }
                    </div>
                    <h2
                      class="font-headline-lg text-headline-lg font-black text-on-surface leading-tight tracking-tight mb-1"
                    >
                      ${title}
                    </h2>
                    <span
                      class="font-title-sm text-title-sm text-primary mb-space-sm block font-medium"
                      >${title}${year ? ` (${year})` : ""}</span
                    >
                    <p
                      class="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 mb-space-md"
                    >
                      ${description}
                    </p>
                    <div
                      class="grid grid-cols-3 gap-space-xs p-space-sm bg-surface-container-low rounded-xl mb-space-lg text-center"
                    >
                      <div class="flex flex-col">
                        <span
                          class="font-label-caps text-label-caps text-on-surface-variant"
                          >NĂM</span
                        >
                        <span
                          class="font-title-sm text-title-sm font-bold text-on-surface"
                          >${year || ""}</span
                        >
                      </div>
                      <div class="flex flex-col">
                        <span
                          class="font-label-caps text-label-caps text-on-surface-variant"
                          >THỜI LƯỢNG</span
                        >
                        <span
                          class="font-title-sm text-title-sm font-bold text-on-surface"
                          >${escapeHtml(runtime)}</span
                        >
                      </div>
                      <div class="flex flex-col">
                        <span
                          class="font-label-caps text-label-caps text-on-surface-variant"
                          >LƯỢT XEM</span
                        >
                        <span
                          class="font-title-sm text-title-sm font-bold text-primary-container"
                          >${escapeHtml(formatViews(movie.views))}</span
                        >
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-space-sm flex-wrap">
                    <a
                      class="flex-1 min-w-[140px] py-3 px-space-lg rounded-xl bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-title-md text-title-md font-bold flex items-center justify-center gap-space-xs shadow-[0_8px_24px_rgba(229,9,20,0.4)] transition-all transform hover:scale-[1.02]"
                      href="${watchUrl(movie.id)}"
                    >
                      <span
                        class="material-symbols-outlined text-[24px]"
                        style="font-variation-settings: &quot;FILL&quot; 1"
                        >play_arrow</span
                      >
                      <span>Xem ngay</span>
                    </a>
                    <button
                      class="py-3 px-space-md rounded-xl bg-surface-container-highest hover:bg-surface-bright text-on-surface font-title-sm text-title-sm flex items-center gap-space-xs transition-colors"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[20px]"
                        >movie</span
                      >
                      <span>Trailer</span>
                    </button>
                    <button
                      aria-label="Thêm vào danh sách yêu thích"
                      class="p-3 rounded-xl bg-surface-container-highest hover:bg-surface-container-low text-primary-container transition-colors"
                      id="top1FavBtn"
                      type="button"
                    >
                      <span
                        class="material-symbols-outlined text-[22px]"
                        style="font-variation-settings: &quot;FILL&quot; 1"
                        >favorite</span
                      >
                    </button>
                  </div>
                </div>
              </div>
            </div>`;
}

/** Podium đầy đủ, đúng thứ tự DOM của bản gốc: #2 - #1 - #3. */
function renderPodium(catalog) {
  const host = document.querySelector("[data-metric='top-podium']");
  if (!host) return;

  const top = rankedMovies(catalog).slice(0, PODIUM_SIZE);
  if (top.length < PODIUM_SIZE) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = [
    podiumSide(top[1], 2, catalog),
    podiumCenter(top[0], catalog),
    podiumSide(top[2], 3, catalog),
  ].join("\n");
  bindImageFallback(host);
  bindTop1Favorite();
}

/* ------------------------------------------------------------------ *
 * BẢNG XẾP HẠNG CHI TIẾT (#04 TRỞ ĐI)
 * ------------------------------------------------------------------ */

/** Một dòng trong bảng xếp hạng — giữ nguyên class của bản thiết kế gốc. */
function rankingRow(movie, rank, catalog) {
  const title = escapeHtml(movie.title);
  const year = yearOf(movie);
  const duration = formatDuration(movie.duration);
  const genres = genreLabel(movie, catalog);
  const quality = qualityLabel(movie);
  const rating = ratingOf(movie, catalog);

  const qualityBadge = quality
    ? `<span class="px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-label-caps text-label-caps">${escapeHtml(quality)}</span>`
    : "";

  const metaParts = [];
  if (duration) metaParts.push(`<span>${escapeHtml(duration)}</span>`);
  if (genres) metaParts.push(`<span>${escapeHtml(genres)}</span>`);
  const meta = metaParts.join(`<span>•</span>`);

  const ratingBlock =
    rating === null
      ? ""
      : `<div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-secondary text-[18px]" style="font-variation-settings: &quot;FILL&quot; 1">star</span>
                    <span class="font-title-md text-title-md font-bold text-on-surface">${rating.toFixed(1)}</span>
                    <span class="text-on-surface-variant font-label-md text-label-md">Đánh giá</span>
                  </div>`;

  return `
            <div
              class="group bg-surface-container rounded-xl p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md hover:bg-surface-container-high transition-all shadow-md"
            >
              <div class="flex items-center gap-space-md w-full min-w-0 sm:w-auto">
                <span
                  class="font-headline-xl text-headline-xl font-black text-outline/40 w-24 shrink-0 text-center group-hover:text-primary transition-colors"
                  >#${pad2(rank)}</span
                >
                <a
                  class="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-lowest"
                  href="${detailUrl(movie.id)}"
                  title="${title}"
                >
                  <img
                    alt="Poster phim ${title}"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    data-fallback="${POSTER_FALLBACK}"
                    decoding="async"
                    loading="lazy"
                    src="${escapeHtml(movie.poster || POSTER_FALLBACK)}"
                  />
                </a>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-space-xs flex-wrap mb-1">
                    <h3
                      class="font-title-md text-title-md font-bold text-on-surface truncate group-hover:text-primary-container transition-colors"
                    >
                      ${title}
                    </h3>
                    ${year ? `<span class="text-on-surface-variant font-body-sm text-body-sm">(${year})</span>` : ""}
                    ${qualityBadge}
                  </div>
                  <div
                    class="flex items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant"
                  >
                    ${meta}
                  </div>
                </div>
              </div>
              <div
                class="flex items-center justify-between sm:justify-end gap-space-lg w-full sm:w-auto"
              >
                <div class="flex flex-col items-end">
                  ${ratingBlock}
                  <span class="font-body-sm text-body-sm text-on-surface-variant"
                    >${escapeHtml(formatViews(movie.views))} xem</span
                  >
                </div>
                <div class="flex items-center gap-space-xs">
                  <a
                    class="px-space-md py-2 rounded-lg bg-surface-container-highest hover:bg-primary-container text-on-surface hover:text-on-primary-container font-title-sm text-title-sm font-semibold flex items-center gap-1 transition-all"
                    href="${watchUrl(movie.id)}"
                  >
                    <span class="material-symbols-outlined text-[18px]"
                      >play_arrow</span
                    >
                    <span>Xem phim</span>
                  </a>
                  <button
                    aria-label="Yêu thích"
                    class="p-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface-variant hover:text-primary-container transition-colors"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[20px]"
                      >favorite</span
                    >
                  </button>
                </div>
              </div>
            </div>`;
}

function renderRankingList(catalog) {
  const host = document.querySelector("[data-metric='top-ranking-list']");
  if (!host) return;

  const slice = rankedMovies(catalog).slice(
    RANK_START - 1,
    RANK_START - 1 + LIST_SIZE,
  );

  if (!slice.length) {
    host.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span class="material-symbols-outlined text-4xl text-on-surface-variant/50">movie_filter</span>
              <p class="font-title-sm text-title-sm text-on-surface">Chưa có phim trong bảng xếp hạng</p>
            </div>`;
    return;
  }

  host.innerHTML = slice
    .map((movie, i) => rankingRow(movie, RANK_START + i, catalog))
    .join("\n");
  bindImageFallback(host);
}

/** Nút yêu thích ở thẻ Quán quân (giữ id #top1FavBtn như bản gốc). */
function bindTop1Favorite() {
  const btn = document.getElementById("top1FavBtn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    const icon = btn.querySelector(".material-symbols-outlined");
    if (!icon) return;
    const filled = String(icon.style.fontVariationSettings || "").includes(
      '"FILL" 1',
    );
    if (filled) {
      icon.style.fontVariationSettings = '"FILL" 0';
      btn.classList.remove("text-primary-container");
      btn.classList.add("text-on-surface-variant");
    } else {
      icon.style.fontVariationSettings = '"FILL" 1';
      btn.classList.add("text-primary-container");
      btn.classList.remove("text-on-surface-variant");
    }
  });
}

/* ------------------------------------------------------------------ *
 * KHỞI TẠO
 * ------------------------------------------------------------------ */

function renderError() {
  const html = `
            <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <span class="material-symbols-outlined text-4xl text-on-surface-variant/50">cloud_off</span>
              <p class="font-title-sm text-title-sm text-on-surface">Không tải được bảng xếp hạng</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Vui lòng chạy <code class="text-primary">npm run dev</code> để bật máy chủ dữ liệu
                hoặc kiểm tra lại file <code class="text-primary">data/db.json</code>.
              </p>
            </div>`;
  const podium = document.querySelector("[data-metric='top-podium']");
  const list = document.querySelector("[data-metric='top-ranking-list']");
  if (podium) podium.innerHTML = "";
  if (list) list.innerHTML = html;
}

async function init() {
  if (!document.querySelector("[data-metric='top-ranking-list']")) return;

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error("[top-movies] Không tải được data/db.json:", err);
    renderError();
    return;
  }

  renderPodium(catalog);
  renderRankingList(catalog);

  console.info(
    `[top-movies] Đã xếp hạng theo lượt xem giảm dần (nguồn: ${catalog.source}).`,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
