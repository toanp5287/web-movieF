import api from "../api.js";
import {
  bindImageFallback,
  detailUrl,
  escapeHtml,
  loadCatalog,
  POSTER_FALLBACK,
  watchUrl,
} from "./movie-data.js";
import { isActive, loadSeriesData } from "./series-data.js";

const header = document.querySelector("#user");

const userData = localStorage.getItem("currentUser");
const user = userData ? JSON.parse(userData) : null;

async function renderUser() {
  const userData = localStorage.getItem("currentUser");
  const user = userData ? JSON.parse(userData) : null;

  if (user) {
    const idRole = String(user.roleId);
    const role = await api.get(`/roles/${idRole}`);
    const roleNameUser = role.name;

    header.innerHTML = `
  <div class="relative">

    <button
      id="userButton"
      class="flex items-center gap-space-xs p-space-xs rounded-full hover:bg-surface-container-high transition-colors group"
      type="button"
    >
      <img
        alt="Profile"
        class="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary-container transition-all"
        src="${user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDeWGYl7ORt_8nQC2EZl_68RLR-gud9pN1IVzOHlQ-Y4TmYpcZmK0PcyyfziT_ZPmTWcGs69_soKBKJCPu__ykZ_ryFDNUeJy12Y8yThOAKsT3Q7n4EVR3-7_kNryrAbqNl3Obma1EcjlSPVqLlA3briFLLgOtMgn4FrZPPj8LS2LT1oW4FIJpWuiCxfFvFOMqK4mhcayNzjeb4iipNQWmCxaXkerE21EEqPBFIUB2ajy2MgDtsLidx"}"
      />
      
      <span
        class="material-symbols-outlined text-on-surface-variant text-base hidden sm:inline-block group-hover:text-on-surface transition-colors"
      >
        expand_more
      </span>
    </button>

    <div
      id="userMenu"
      class="hidden absolute right-0 top-12 w-48 bg-surface-container-high border border-white/10 rounded-xl shadow-xl p-2 z-50"
    >

      <div class="px-3 py-2 border-b border-white/10 mb-1">
        <p class="text-sm font-semibold text-on-surface">
          ${user.fullname || user.username}
        </p>

        <p class="text-xs text-on-surface-variant truncate">
          ${user.email}
        </p>
      </div>

      ${
        Number(idRole) === 1 || Number(idRole) === 2
          ? `
            <a
              href="/admin"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
            >
              <span class="material-symbols-outlined text-lg">
                admin_panel_settings
              </span>
              Quản trị
            </a>
          `
          : ""
      }

      <a
        href="/profile"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          person
        </span>
        Hồ sơ
      </a>

      <a
        href="/favorite"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          favorite
        </span>
        Yêu thích
      </a>
    

      <button
        id="logoutBtn"
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          logout
        </span>
        Đăng xuất
      </button>

    </div>
  </div>
`;
  } else {
    header.innerHTML = `
      <div class="flex items-center gap-3">

        <button
        id="loginBtn"
          type="button"
          class="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          Đăng nhập
        </button>

        <a
          href="/register"
          class="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-tertiary-container hover:shadow-lg hover:shadow-primary-container/30 active:scale-[0.99] transition-all"
        >
          Đăng ký
        </a>

      </div>
    `;
  }

  const userButton = document.querySelector("#userButton");
  const userMenu = document.querySelector("#userMenu");

  if (userButton && userMenu) {
    userButton.addEventListener("click", () => {
      userMenu.classList.toggle("hidden");
    });
  }

  const logoutBtn = document.querySelector("#logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");

      renderUser();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Đã đăng xuất",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,

        customClass: {
          popup:
            "bg-[#111111]! border! border-white/10! rounded-xl! shadow-2xl! w-[300px]!",
          title: "text-white! text-sm! font-semibold!",
          timerProgressBar: "bg-red-600!",
        },
      });
    });
  }
}

renderUser();

const loginUrl = document.querySelector("#loginBtn");
if (loginUrl) {
  loginUrl.addEventListener("click", () => {
    sessionStorage.setItem("redirectAfterLogin", window.location.href);

    window.location.href = "/login";
  });
}

/* ------------------------------------------------------------------ *
 * THÔNG BÁO PHIM MỚI / TẬP MỚI (dropdown ở nút chuông trên Header)
 *
 * Chỉ ĐỌC dữ liệu hiện có (movies.createdAt, episodes.releaseDate) và tạo
 * danh sách phía client mỗi lần tải trang. Không ghi database, không thêm
 * backend, không tạo dữ liệu giả.
 * ------------------------------------------------------------------ */

/** Chỉ coi là "mới" trong vòng 7 ngày gần nhất. */
const NEW_WINDOW_DAYS = 7;

/** Số thông báo tối đa hiển thị trong dropdown. */
const MAX_NOTIFICATIONS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_PANEL_ID = "mfNotificationDropdown";

/**
 * Đọc ngày từ db.json ("YYYY-MM-DD" hoặc ISO). Trả null nếu thiếu hoặc sai
 * định dạng — không tự suy diễn thời gian khi dữ liệu không hợp lệ.
 */
function parseDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const plain = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Hôm nay" / "Hôm qua" / "N ngày trước" / ngày cụ thể. */
function formatTime(date) {
  if (!date) return "";

  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);

  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return date.toLocaleDateString("vi-VN");
}

let notificationsPromise = null;

/** Nạp danh sách thông báo (cache trong phiên để không gọi lại nhiều lần). */
function loadNotifications() {
  if (notificationsPromise) return notificationsPromise;

  notificationsPromise = buildNotifications().catch((error) => {
    notificationsPromise = null;
    console.error("[header] Không tải được thông báo:", error);
    throw error;
  });

  return notificationsPromise;
}

/**
 * Danh sách thông báo, mới nhất trước, tối đa MAX_NOTIFICATIONS mục.
 * - Phim mới: phim có createdAt trong 7 ngày.
 * - Tập mới: tập đang hoạt động có releaseDate trong 7 ngày; mỗi phim chỉ lấy
 *   tập mới nhất, và bỏ qua phim đã có thông báo "phim mới" để tránh trùng.
 */
async function buildNotifications() {
  const [catalog, series] = await Promise.all([
    loadCatalog(),
    loadSeriesData(),
  ]);

  const movies = Array.isArray(catalog?.movies) ? catalog.movies : [];
  const episodes = Array.isArray(series?.episodes) ? series.episodes : [];
  const seasons = Array.isArray(series?.seasons) ? series.seasons : [];
  const cutoff = Date.now() - NEW_WINDOW_DAYS * DAY_MS;

  const items = [];
  const newMovieIds = new Set();

  // ---- Phim mới được thêm ----
  for (const movie of movies) {
    const created = parseDate(movie.createdAt);
    if (!created || created.getTime() < cutoff) continue;

    newMovieIds.add(String(movie.id));
    items.push({
      key: `movie:${movie.id}`,
      date: created,
      title: movie.title,
      poster: movie.poster || "",
      message: "Phim vừa được thêm vào MovieF",
      href: detailUrl(movie.id),
    });
  }

  // ---- Tập mới (mỗi phim chỉ giữ tập mới nhất) ----
  const movieById = new Map(movies.map((movie) => [String(movie.id), movie]));
  const seasonById = new Map(seasons.map((season) => [String(season.id), season]));
  const latestEpisodeByMovie = new Map();

  for (const episode of episodes) {
    if (!isActive(episode.status)) continue;

    const released = parseDate(episode.releaseDate);
    if (!released || released.getTime() < cutoff) continue;

    const season = seasonById.get(String(episode.seasonId));
    if (!season || !isActive(season.status)) continue;

    const movie = movieById.get(String(season.movieId));
    if (!movie) continue;

    const movieKey = String(movie.id);
    if (newMovieIds.has(movieKey)) continue;

    const current = latestEpisodeByMovie.get(movieKey);
    if (!current || released.getTime() > current.date.getTime()) {
      latestEpisodeByMovie.set(movieKey, { episode, movie, date: released });
    }
  }

  for (const { episode, movie, date } of latestEpisodeByMovie.values()) {
    const number = episode.episodeNumber;
    const hasNumber =
      typeof number === "number" && Number.isFinite(number) && number > 0;

    items.push({
      key: `episode:${movie.id}:${episode.id}`,
      date,
      movieId: movie.id,
      title: movie.title,
      poster: movie.poster || "",
      message: hasNumber
        ? `Tập ${number} vừa được thêm`
        : "Tập mới vừa được thêm",
      href: `${watchUrl(movie.id)}&episode=${encodeURIComponent(episode.id)}`,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, MAX_NOTIFICATIONS);
}

const notificationUi = {
  ready: false,
  open: false,
  bell: null,
  panel: null,
};

/** Tìm nút chuông trong header (không phụ thuộc id/class cụ thể của markup). */
function findBellButton() {
  const headerEl = document.querySelector("header");
  if (!headerEl) return null;

  return (
    Array.from(headerEl.querySelectorAll("button")).find((button) => {
      const icon = button.querySelector(".material-symbols-outlined");
      return icon && icon.textContent.trim() === "notifications";
    }) || null
  );
}

/** Tạo bảng dropdown một lần, gắn vào body (định vị bằng position: fixed). */
function ensurePanel() {
  let panel = document.getElementById(NOTIFICATION_PANEL_ID);
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = NOTIFICATION_PANEL_ID;
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Thông báo");
  panel.className =
    "bg-surface-container-high border border-white/10 rounded-xl shadow-2xl text-on-surface";

  Object.assign(panel.style, {
    position: "fixed",
    zIndex: "60",
    overflowY: "auto",
  });

  document.body.appendChild(panel);
  return panel;
}

/** Neo bảng ngay dưới nút chuông, canh phải và kẹp trong viewport. */
function positionPanel() {
  const { bell, panel } = notificationUi;
  if (!bell || !panel) return;

  const rect = bell.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 24);
  const left = Math.max(
    12,
    Math.min(rect.right - width, window.innerWidth - width - 12),
  );

  panel.style.width = `${width}px`;
  panel.style.left = `${left}px`;
  panel.style.top = `${Math.max(12, rect.bottom + 8)}px`;
  panel.style.maxHeight = `${Math.max(
    180,
    window.innerHeight - rect.bottom - 24,
  )}px`;
}

const PANEL_HEADER = `
  <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
    <p class="text-sm font-semibold text-on-surface">Thông báo</p>
  </div>
`;

function notificationItemHtml(item) {
  const poster = item.poster || POSTER_FALLBACK;

  return `
    <a
      class="flex items-start gap-3 px-3.5 py-3 hover:bg-white/5 transition-colors"
      href="${escapeHtml(item.href)}"
    >
      <div class="w-12 h-[68px] rounded-lg overflow-hidden bg-surface-container shrink-0">
        <img
          alt=""
          class="w-full h-full object-cover"
          src="${poster}"
          data-fallback="${POSTER_FALLBACK}"
          loading="lazy"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-on-surface truncate">
          ${escapeHtml(item.title)}
        </p>
        <p class="text-xs text-on-surface-variant mt-0.5">
          ${escapeHtml(item.message)}
        </p>
        <p class="text-[11px] text-on-surface-variant/70 mt-1">
          ${escapeHtml(formatTime(item.date))}
        </p>
      </div>
    </a>
  `;
}

function renderPanel(items, { loading = false, error = false } = {}) {
  const { panel } = notificationUi;
  if (!panel) return;

  let body;

  if (loading) {
    body = `<p class="px-3.5 py-8 text-center text-sm text-on-surface-variant">Đang tải thông báo…</p>`;
  } else if (error) {
    body = `<p class="px-3.5 py-8 text-center text-sm text-on-surface-variant">Không tải được thông báo.</p>`;
  } else if (!items || !items.length) {
    body = `<p class="px-3.5 py-8 text-center text-sm text-on-surface-variant">Chưa có thông báo mới</p>`;
  } else {
    body = `<div class="py-1">${items.map(notificationItemHtml).join("")}</div>`;
  }

  panel.innerHTML = PANEL_HEADER + body;

  if (!loading && !error && items && items.length) bindImageFallback(panel);
}

function paintBellExpanded() {
  notificationUi.bell?.setAttribute(
    "aria-expanded",
    String(notificationUi.open),
  );
}

async function openNotifications() {
  const { bell, panel } = notificationUi;
  if (!bell || !panel) return;

  notificationUi.open = true;
  positionPanel();
  panel.hidden = false;
  renderPanel([], { loading: true });
  paintBellExpanded();

  try {
    const items = await loadNotifications();
    if (!notificationUi.open) return;
    renderPanel(items);
  } catch {
    if (!notificationUi.open) return;
    renderPanel([], { error: true });
  }
}

function closeNotifications() {
  notificationUi.open = false;
  if (notificationUi.panel) notificationUi.panel.hidden = true;
  paintBellExpanded();
}

function setupNotifications() {
  if (notificationUi.ready) return;

  const bell = findBellButton();
  if (!bell) return;

  notificationUi.ready = true;
  notificationUi.bell = bell;
  notificationUi.panel = ensurePanel();

  bell.setAttribute("aria-haspopup", "dialog");
  bell.setAttribute("aria-expanded", "false");
  bell.setAttribute("aria-controls", NOTIFICATION_PANEL_ID);

  bell.addEventListener("click", (event) => {
    event.stopPropagation();
    if (notificationUi.open) closeNotifications();
    else openNotifications();
  });

  // Bấm ra ngoài thì đóng.
  document.addEventListener("click", (event) => {
    if (!notificationUi.open) return;
    if (notificationUi.panel?.contains(event.target)) return;
    if (bell.contains(event.target)) return;
    closeNotifications();
  });

  // Escape để đóng.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && notificationUi.open) closeNotifications();
  });

  // Giữ bảng bám đúng vị trí nút chuông khi cuộn / đổi kích thước.
  window.addEventListener("resize", () => {
    if (notificationUi.open) positionPanel();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (notificationUi.open) positionPanel();
    },
    true,
  );
}

setupNotifications();
