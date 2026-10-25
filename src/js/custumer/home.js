/**
 * home.js  (/)
 *
 * Trang chủ có 22 thẻ phim viết cứng, tất cả đều trỏ tới "/movie-detail" mà
 * không có ?id=. Bấm vào thẻ nào cũng mở trang chi tiết chung — trước đây nội
 * dung lại là của Dune. Nay mỗi thẻ được gắn id đúng với phim đó trong
 * data/db.json.
 *
 * Cách khớp dữ liệu:
 *  - Ưu tiên tên file poster của thẻ (ví dụ "dune-2.jpg") vì tiêu đề trên
 *    home.html đã bản địa hoá sang tiếng Việt, còn db.json giữ tiếng Anh.
 *  - Với các thẻ chỉ có nút chữ (không có poster), dùng aria-label của thẻ cha.
 *  - Thẻ nào khớp không được thì BỎ CHẠM vào href và khoá lại (aria-disabled).
 *    Tuyệt đối không dẫn sang /movies: mở nhầm trang danh sách khiến khách
 *    tưởng phim bị lỗi, nên thà không bấm được còn hơn sang sai trang.
 */

import api from "../api.js";
import {
  POSTER_FALLBACK,
  bindImageFallback,
  detailUrl,
  escapeHtml,
  loadCatalog,
} from "./movie-data.js";
import { readGuestHistory } from "./history.js";

/** Tên file poster trong một khối (ưu tiên background-image, sau đó mới <img>). */
function posterIn(root) {
  if (!root) return "";
  for (const el of root.querySelectorAll("[style*='background-image']")) {
    const m = /url\(["']?([^"')]+)["']?\)/.exec(el.getAttribute("style") || "");
    if (m && m[1].includes("/images/movies/")) return m[1];
  }
  for (const img of root.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src") || "";
    if (src.includes("/images/movies/")) return src;
  }
  return "";
}

/** Tên phim lấy từ aria-label kiểu "Xem chi tiết phim Interstellar (2014)". */
function titleFromLabels(root) {
  if (!root) return "";
  for (const el of root.querySelectorAll("[aria-label]")) {
    const m = /chi\s+tiet\s+phim\s+(.+)/i.exec(
      el.getAttribute("aria-label") || "",
    );
    if (m) return m[1];
  }
  return "";
}

/** "Interstellar (2014)" -> "interstellar" để so khớp với db.json. */
function normalizeTitle(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(\s*\d{4}\s*\)/g, "") // bỏ năm trong ngoặc
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user && user.id !== undefined && user.id !== null ? user : null;
  } catch {
    return null;
  }
}

function sameId(left, right) {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

/** 3996 -> "1:06:36" */
function clock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function remainingLabel(progressSeconds, durationMinutes) {
  const total = (Number(durationMinutes) || 0) * 60;
  const left = Math.max(
    0,
    Math.round((total - (Number(progressSeconds) || 0)) / 60),
  );
  if (!total || left <= 0) return "Đã xem xong";
  if (left >= 60) {
    const hours = Math.floor(left / 60);
    const mins = left % 60;
    return mins ? `Còn ${hours} giờ ${mins} phút` : `Còn ${hours} giờ`;
  }
  return `Còn ${left} phút`;
}

function watchedTimeLabel(watchedAt) {
  const date = new Date(watchedAt);
  if (!watchedAt || Number.isNaN(date.getTime())) return "";

  return `Đã xem ${date.toLocaleDateString("vi-VN")} lúc ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function continueCardMarkup(item, catalog) {
  const { movie, history, progress, percent, totalSeconds } = item;
  const poster = movie.poster || POSTER_FALLBACK;
  const genres = genreNames(movie, catalog.genres).slice(0, 2);
  const remain = remainingLabel(progress, movie.duration);
  const watchedTime = watchedTimeLabel(history.watchedAt);
  const episodeLabel = history.episodeId ? `Tập ${history.episodeId}` : "";
  const subtitle = [...genres, episodeLabel, remain]
    .filter(Boolean)
    .join(" • ");
  const link = history.episodeId
    ? `${watchUrl(movie.id)}&episode=${encodeURIComponent(history.episodeId)}`
    : watchUrl(movie.id);

  return `
    <a
      class="mf-mcard group relative block bg-surface-container rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 min-w-0 h-full"
      href="${link}"
      data-movie-id="${escapeHtml(String(movie.id))}"
    >
      <div class="relative aspect-video w-full overflow-hidden bg-surface-container-high">
        <div
          class="w-full h-full bg-cover bg-center transform group-hover:scale-105 transition-transform duration-500"
          style="background-image: url(&quot;${escapeHtml(poster)}&quot;)"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-black/30"></div>
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-surface-container-lowest/40 backdrop-blur-xs">
          <span class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)] transform scale-90 group-hover:scale-100 transition-transform">
            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: &quot;FILL&quot; 1">play_arrow</span>
          </span>
        </div>
        <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-label-caps text-label-caps text-on-surface font-mono">
          ${clock(progress)} / ${clock(totalSeconds)}
        </span>
      </div>
      <div class="w-full h-1 bg-surface-container-highest">
        <div class="h-full bg-primary-container rounded-r-full shadow-[0_0_8px_rgba(229,9,20,0.8)]" style="width: ${percent}%"></div>
      </div>
      <div class="p-space-md flex items-center justify-between gap-space-sm bg-surface-container">
        <div class="min-w-0 flex-1">
          <h3 class="mf-mcard-title font-title-sm text-title-sm text-on-surface font-semibold group-hover:text-primary transition-colors">
            ${escapeHtml(movie.title)}
          </h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant truncate">
            ${escapeHtml(subtitle)}
          </p>
          <p class="font-body-sm text-body-sm text-on-surface-variant/70 truncate mt-1">
            ${escapeHtml(watchedTime)}
          </p>
        </div>
      </div>
    </a>`;
}

/** Mọi khối "Tiếp tục xem" trên trang chủ — kể cả bản HTML cứng cũ chưa kịp reload. */
function continueWatchingSections() {
  const found = new Set();
  const byId = document.getElementById("continueWatching");
  if (byId) found.add(byId);
  document.querySelectorAll("section").forEach((section) => {
    const heading = section.querySelector("h2");
    if (heading && heading.textContent.trim() === "Tiếp tục xem")
      found.add(section);
  });
  return [...found];
}

function hideContinueWatching() {
  continueWatchingSections().forEach((section) => section.remove());
}

function ensureContinueWatchingMount() {
  let section = document.getElementById("continueWatching");
  if (section) return section;

  const rails = document.getElementById("homeRails");
  if (!rails) return null;

  section = document.createElement("section");
  section.id = "continueWatching";
  section.innerHTML = `
    <div class="flex flex-col gap-space-md">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-space-sm">
          <span class="w-1.5 h-5 bg-primary-container rounded-full"></span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">Tiếp tục xem</h2>
        </div>
        <a
          id="continueWatchingAll"
          class="font-title-sm text-title-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors"
          href="/profile?tab=history"
        >
          <span>Xem tất cả</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>
      <div id="continueWatchingRail" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md"></div>
    </div>
  `;
  rails.prepend(section);
  return section;
}

/** Catalog phim gần nhất, để render lại "Tiếp tục xem" khi đăng nhập/đăng xuất. */
let catalogRef = null;

/**
 * Khối "Tiếp tục xem" trên trang chủ.
 * - Khách (chưa đăng nhập): đọc lịch sử từ localStorage (readGuestHistory),
 *   tối đa 3 phim gần nhất, mỗi phim một bản ghi.
 * - Đã đăng nhập: đọc lịch sử tài khoản qua API /histories như trước.
 */
async function renderContinueWatching(catalog) {
  const user = getCurrentUser();

  let rows = [];
  if (user) {
    try {
      const data = await api.get("/histories");
      rows = (Array.isArray(data) ? data : []).filter((row) =>
        sameId(row.userId, user.id),
      );
    } catch (error) {
      console.error("[home] Không tải được lịch sử xem:", error);
      hideContinueWatching();
      return;
    }
  } else {
    rows = readGuestHistory();
  }

  const items = rows
    .slice()
    .sort(
      (a, b) =>
        new Date(b.watchedAt || 0).getTime() -
        new Date(a.watchedAt || 0).getTime(),
    )
    .reduce((list, row) => {
      if (list.length >= 3) return list;
      if (
        list.some(
          (item) =>
            sameId(item.history.movieId, row.movieId) &&
            // Khách: mỗi phim một bản ghi (bỏ qua tập). Tài khoản: giữ nguyên
            // quy tắc tách theo tập như trước.
            (!user ||
              sameId(item.history.episodeId || "", row.episodeId || "")),
        )
      )
        return list;
      const movie = catalog.movies.find((m) => sameId(m.id, row.movieId));
      if (!movie) return list;
      const totalSeconds = (Number(movie.duration) || 0) * 60;
      const progress = Math.max(0, Number(row.progress) || 0);
      const percent = totalSeconds
        ? Math.min(
            100,
            progress > 0
              ? Math.max(1, Math.round((progress / totalSeconds) * 100))
              : 0,
          )
        : 0;
      list.push({ movie, history: row, progress, percent, totalSeconds });
      return list;
    }, []);

  // Đăng xuất trong lúc chờ API: bỏ qua kết quả lịch sử tài khoản cũ.
  if (user && !getCurrentUser()) {
    hideContinueWatching();
    return;
  }

  if (!items.length) {
    hideContinueWatching();
    return;
  }

  const section = ensureContinueWatchingMount();
  const rail = document.getElementById("continueWatchingRail");
  if (!section || !rail) return;

  // "Xem tất cả" dẫn tới /profile?tab=history (trang tài khoản) nên chỉ hiện
  // với người đã đăng nhập; khách chỉ xem danh sách rút gọn.
  const allLink = document.getElementById("continueWatchingAll");
  if (allLink) allLink.classList.toggle("hidden", !user);

  rail.innerHTML = items
    .map((item) => continueCardMarkup(item, catalog))
    .join("");
}

/** Render lại "Tiếp tục xem" theo nguồn lịch sử hiện tại (khách ↔ tài khoản). */
function refreshContinueWatching() {
  if (catalogRef) {
    renderContinueWatching(catalogRef);
  } else {
    hideContinueWatching();
  }
}

/** Tìm phim tương ứng với một thẻ trên home. */
function resolveMovie(anchor, byPoster, byTitle, byId) {
  // 1. Thẻ khai báo thẳng data-movie-id (nút "Xem phim ngay" của banner, thẻ
  //    "Tiếp tục xem"). Đây là nguồn chính xác nhất nên ưu tiên tuyệt đối —
  //    trước đây các nút này không có poster/aria-label riêng nên bị coi là
  //    "không khớp" và bị gỡ href, khiến nút chết hoàn toàn.
  const declared = anchor.getAttribute("data-movie-id");
  if (declared !== null && byId.has(String(declared).trim())) {
    return byId.get(String(declared).trim());
  }

  // 2. Khớp theo tên file poster của thẻ.
  const poster = posterIn(anchor);
  if (poster) {
    const key = poster.split("/").pop().toLowerCase();
    if (byPoster.has(key)) return byPoster.get(key);
  }

  // 3. Thẻ chỉ có nút chữ: dò aria-label trong chính nó rồi trong thẻ cha gần nhất.
  let host = anchor;
  for (let depth = 0; depth < 4; depth++) {
    const title = titleFromLabels(host) || titleFromLabels(anchor);
    if (title) {
      const key = normalizeTitle(title);
      if (byTitle.has(key)) return byTitle.get(key);
    }
    if (!host.parentElement) break;
    host = host.parentElement;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * BANNER CAROUSEL TRANG CHỦ
 * Chỉ thay đổi banner đầu tiên. Dữ liệu lấy từ loadCatalog(), không tạo
 * phim mới và không ảnh hưởng các khối phim khác trên trang.
 * ------------------------------------------------------------------ */

const HERO_INTERVAL = 3000;

/**
 * Chọn tối đa 6 phim gần đây nhất cho banner.
 * Ưu tiên phim có createdAt gần nhất, fallback theo id nếu không có.
 */
function heroMovies(catalog) {
  const movies = Array.isArray(catalog?.movies) ? catalog.movies : [];
  const candidates = movies.filter(
    (movie) => movie && movie.title && Number(movie.releaseYear) > 0,
  );

  const getTime = (movie) => {
    const time = Date.parse(movie?.createdAt || "");
    return Number.isNaN(time) ? 0 : time;
  };

  const sorted = [...candidates].sort((a, b) => {
    const diff = getTime(b) - getTime(a);
    if (diff !== 0) return diff;
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });

  const seenPosters = new Set();
  const picked = [];

  for (const movie of sorted) {
    const posterKey = String(movie.poster || "")
      .trim()
      .toLowerCase();
    if (posterKey && seenPosters.has(posterKey)) continue;
    if (posterKey) seenPosters.add(posterKey);
    picked.push(movie);
    if (picked.length >= 6) break;
  }

  return picked;
}

/** Markup một slide. Chỉ hiện tên phim và mô tả ngắn, click toàn banner mở chi tiết. */
function heroSlideMarkup(movie, catalog, index) {
  const id = escapeHtml(String(movie.id ?? ""));
  const title = escapeHtml(movie.title || "Phim");
  const poster = escapeHtml(movie.poster || POSTER_FALLBACK);
  const fallback = escapeHtml(POSTER_FALLBACK);
  const description = String(movie.description || "").trim();
  const detail = escapeHtml(detailUrl(movie.id));
  const isActive = index === 0;

  return `
    <article
      aria-hidden="${isActive ? "false" : "true"}"
      class="mf-hero-slide"
      data-hero-slide
      data-movie-id="${id}"
      data-pos="${isActive ? "active" : "hidden"}"
    >
      <img
        alt="Poster phim ${title}"
        class="mf-hero-image"
        data-fallback="${fallback}"
        decoding="async"
        ${isActive ? 'fetchpriority="high"' : 'loading="lazy"'}
        src="${poster}"
      />
      <div aria-hidden="true" class="mf-hero-shade"></div>

      <div class="mf-hero-content">
        <h2 class="mf-hero-title">${title}</h2>
        ${
          description
            ? `<p class="mf-hero-description">${escapeHtml(
                description,
              )}</p>`
            : ""
        }
      </div>

      <a
        aria-label="Xem chi tiết phim ${title}"
        class="mf-hero-link"
        data-movie-id="${id}"
        data-movie-title="${title}"
        href="${detail}"
      ></a>
    </article>`;
}

/**
 * Khởi tạo banner sau khi catalogue đã tải xong.
 * Một timer duy nhất, luôn clear trước khi đặt lại; không tạo timer trùng.
 */
function initHeroCarousel(catalog) {
  const section = document.querySelector("[data-hero-carousel]");
  if (!section || section.dataset.heroReady === "1") return;

  const stage = section.querySelector("[data-hero-stage]");
  const dots = section.querySelector("[data-hero-dots]");
  const prevBtn = section.querySelector("[data-hero-prev]");
  const nextBtn = section.querySelector("[data-hero-next]");
  if (!stage) return;

  const movies = heroMovies(catalog);
  if (!movies.length) {
    console.warn("[home] Banner: không có phim để hiển thị, giữ slide dự phòng.");
    section.dataset.heroReady = "1";
    if (dots) dots.hidden = true;
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }

  stage.innerHTML = movies
    .map((movie, index) => heroSlideMarkup(movie, catalog, index))
    .join("");

  if (dots) {
    dots.innerHTML = movies
      .map(
        (movie, index) => `
      <button
        aria-current="${index === 0 ? "true" : "false"}"
        aria-label="Xem phim ${escapeHtml(movie.title)}"
        class="mf-hero-dot"
        data-hero-dot="${index}"
        type="button"
      ></button>`,
      )
      .join("");
  }

  bindImageFallback(stage);

  const slides = [...stage.querySelectorAll("[data-hero-slide]")];
  const dotButtons = dots ? [...dots.querySelectorAll("[data-hero-dot]")] : [];
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const count = slides.length;

  let active = 0;
  let timer = null;

  function paint() {
    slides.forEach((slide, index) => {
      const offset = (index - active + count) % count;
      let pos = "hidden";

      if (count === 1 || offset === 0) pos = "active";
      else if (offset === 1) pos = "next";
      else if (offset === count - 1) pos = "prev";

      slide.dataset.pos = pos;
      const isActive = pos === "active";
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      // Slide phụ không nhận focus/click, tránh mở nhầm phim khi đang chuyển.
      slide.toggleAttribute("inert", !isActive);
    });

    dotButtons.forEach((dot, index) => {
      dot.setAttribute("aria-current", String(index === active));
    });
  }

  function stopTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    stopTimer();
    if (count < 2 || motionQuery.matches || document.hidden) return;

    timer = window.setTimeout(() => {
      timer = null;
      goTo(active + 1);
    }, HERO_INTERVAL);
  }

  function goTo(index) {
    if (count < 2) return;
    active = ((index % count) + count) % count;
    paint();
    schedule();
  }

  const showNav = count > 1;
  if (dots) dots.hidden = !showNav;
  if (prevBtn) prevBtn.hidden = !showNav;
  if (nextBtn) nextBtn.hidden = !showNav;

  if (prevBtn) {
    prevBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goTo(active - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goTo(active + 1);
    });
  }

  if (dots) {
    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-hero-dot]");
      if (!dot) return;
      event.preventDefault();
      event.stopPropagation();
      const index = Number(dot.dataset.heroDot);
      if (Number.isInteger(index)) goTo(index);
    });
  }

  section.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
    }
  });

  const onVisibilityChange = () => {
    if (document.hidden) stopTimer();
    else schedule();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  const onMotionChange = () => schedule();
  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", onMotionChange);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(onMotionChange);
  }

  const cleanup = () => {
    stopTimer();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (typeof motionQuery.removeEventListener === "function") {
      motionQuery.removeEventListener("change", onMotionChange);
    } else if (typeof motionQuery.removeListener === "function") {
      motionQuery.removeListener(onMotionChange);
    }
  };
  window.addEventListener("pagehide", cleanup, { once: true });

  paint();
  section.dataset.heroReady = "1";
  schedule();
}

async function init() {
  // Gồm cả nút "Xem ngay" trỏ /watch: chúng cũng phải mang id để không mở
  // nhầm phim. Thẻ cứng trong #continueWatching bị bỏ qua — khối đó render
  // lại từ lịch sử xem của user đã đăng nhập.
  const anchors = [
    ...document.querySelectorAll('a[href="/movie-detail"]'),
    ...document.querySelectorAll('a[href="/watch"]'),
  ].filter((anchor) => !anchor.closest("#continueWatching"));

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error(
      "[home] Không tải được data/db.json, giữ nguyên liên kết cũ:",
      err,
    );
    catalogRef = { movies: [], genres: [] };
    await renderContinueWatching(catalogRef);
    initHeroCarousel(catalogRef);
    return;
  }

  catalogRef = catalog;
  await renderContinueWatching(catalog);
  if (!anchors.length) {
    initHeroCarousel(catalog);
    return;
  }

  // Chỉ dùng phim thực sự hiển thị được (đã lọc trong loadCatalog).
  const byPoster = new Map();
  const byTitle = new Map();
  const byId = new Map();
  for (const m of catalog.movies) {
    if (m.poster) byPoster.set(m.poster.split("/").pop().toLowerCase(), m);
    byTitle.set(normalizeTitle(m.title), m);
    byId.set(String(m.id).trim(), m);
  }

  let linked = 0;
  const unresolved = [];

  for (const anchor of anchors) {
    const isWatch = anchor.getAttribute("href") === "/watch";
    const movie = resolveMovie(anchor, byPoster, byTitle, byId);

    if (!movie) {
      // Không dẫn sang trang khác. Bỏ href và chặn click để không mở sai phim.
      anchor.removeAttribute("href");
      anchor.setAttribute("aria-disabled", "true");
      anchor.classList.add("opacity-50", "cursor-not-allowed");
      anchor.addEventListener("click", (e) => e.preventDefault());
      unresolved.push(
        anchor.getAttribute("aria-label") ||
          anchor.textContent.trim().slice(0, 40),
      );
      continue;
    }

    anchor.href = isWatch
      ? `/watch?id=${encodeURIComponent(movie.id)}`
      : detailUrl(movie.id);
    anchor.dataset.movieId = String(movie.id);
    linked++;
  }

  bindImageFallback(document);
  initHeroCarousel(catalog);

  if (unresolved.length) {
    console.warn(
      "[home] Không tìm thấy dữ liệu cho các thẻ sau, đã khoá liên kết thay vì chuyển sang trang khác:",
      unresolved,
    );
  }
  console.info(
    `[home] Đã gắn id cho ${linked}/${anchors.length} liên kết phim.`,
  );
}

hideContinueWatching();

window.addEventListener("auth-changed", () => {
  refreshContinueWatching();
});

document.addEventListener(
  "click",
  (event) => {
    if (!event.target.closest("#logoutBtn")) return;
    // header.js xóa currentUser SAU sự kiện click (pha bubble), nên đợi xong
    // rồi render lại theo nguồn lịch sử mới (lịch sử khách nếu có).
    window.setTimeout(refreshContinueWatching, 0);
  },
  true,
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
