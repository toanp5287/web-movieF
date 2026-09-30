/**
 * profile.js
 * Điều khiển giao diện Trang cá nhân (/profile).
 *
 * Trách nhiệm:
 *  - Chặn truy cập khi chưa đăng nhập.
 *  - Chuyển tab, render từng khu vực, điền số liệu thống kê.
 *  - Modal chỉnh sửa thông tin / sửa đánh giá / xác nhận xoá.
 *  - Toast, trạng thái loading và empty state.
 *
 * Toàn bộ dữ liệu đi qua profile-service.js (API thật, tự fallback về
 * localStorage khi chưa có backend).
 */

import {
  AVATAR_FALLBACK,
  bindImageFallback,
  changePassword,
  checkApi,
  fetchFavorites,
  fetchGenres,
  fetchHistory,
  fetchPopularMovies,
  fetchReviews,
  fetchUser,
  getCurrentUser,
  logout,
  mediaUrl,
  POSTER_FALLBACK,
  removeFavorite,
  removeHistory,
  updateReview,
  updateUser,
} from "./profile-service.js";

/* ================================================================== *
 * TRẠNG THÁI ỨNG DỤNG
 * ================================================================== */

const state = {
  user: null,
  userId: null,
  favorites: [],
  history: [],
  reviews: [],
  genres: [],
  movieGenres: [],
  activeTab: "info",
  editingReviewId: null,
  editingRating: 0,
  usingApi: false,
};

const TAB_META = {
  info: { title: "Hồ sơ cá nhân", breadcrumb: "Thông tin cá nhân" },
  favorites: { title: "Phim yêu thích", breadcrumb: "Phim yêu thích" },
  history: { title: "Lịch sử xem phim", breadcrumb: "Lịch sử xem phim" },
  reviews: { title: "Phim đã đánh giá", breadcrumb: "Phim đã đánh giá" },
  password: { title: "Đổi mật khẩu", breadcrumb: "Đổi mật khẩu" },
};

const GENDER_LABEL = { nam: "Nam", nu: "Nữ", khac: "Khác" };

/* ================================================================== *
 * TIỆN ÍCH
 * ================================================================== */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/** Chống chèn HTML từ dữ liệu người dùng. */
function escapeHtml(value) {
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

const icon = (name, cls = "text-[18px]", filled = false) =>
  `<span class="material-symbols-outlined ${cls}"${
    filled ? ' style="font-variation-settings: \'FILL\' 1"' : ""
  }>${name}</span>`;

/** Ẩn/hiện khối skeleton. Dùng hidden thay vì remove để render lại nhiều lần vẫn an toàn. */
function toggleLoading(selector, done = true) {
  const node = $(selector);
  if (node) node.hidden = done;
}

/** Sao đánh giá dạng tĩnh (không tương tác). */
const starRow = (rating, cls = "text-[16px]") =>
  Array.from({ length: 5 })
    .map(
      (_, index) =>
        icon(
          "star",
          `${cls} ${index < Math.round(rating) ? "text-primary-container" : "text-secondary/40"}`,
          index < Math.round(rating),
        ),
    )
    .join("");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function formatRelative(value) {
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

const formatDuration = (minutes) => {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}p` : `${mins}p`;
};

/** Chuyển số giây đã xem thành mốc thời gian cho player. */
const toSeconds = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value && typeof value === "object") return value.seconds;
  return Number(value) || 0;
};

const slugify = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Điểm đánh giá của phim: ưu tiên điểm người dùng, không có thì dùng views. */
function movieScore(movie) {
  const mine = state.reviews.find((review) => String(review.movieId) === String(movie.id));
  if (mine?.rating) return Number(mine.rating).toFixed(1);
  const avg = state.reviews
    .filter((review) => String(review.movieId) === String(movie.id))
    .reduce((sum, review) => sum + Number(review.rating || 0), 0);
  if (avg) return (avg / 1).toFixed(1);
  if (movie.views) return (movie.views / 2000).toFixed(1);
  return "—";
}

function genresOf(movie) {
  const names = state.movieGenres
    .filter((link) => String(link.movieId) === String(movie.id))
    .map((link) => state.genres.find((genre) => String(genre.id) === String(link.genreId))?.name)
    .filter(Boolean);
  return names.slice(0, 2);
}

const watchHref = (movie, seconds = 0) =>
  `/watch?id=${encodeURIComponent(movie.id)}&slug=${encodeURIComponent(
    slugify(movie.slug || movie.title),
  )}&t=${Math.floor(seconds)}`;

const detailHref = (movie) =>
  `/movie-detail?id=${encodeURIComponent(movie.id)}&slug=${encodeURIComponent(
    slugify(movie.slug || movie.title),
  )}`;

/* ================================================================== *
 * TOAST + SWAL ( SweetAlert2 )
 * ================================================================== */

const SWAL_THEME = {
  popup: "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
  title: "text-white! text-lg! font-semibold! mt-2!",
  htmlContainer: "text-gray-400! text-sm! mt-1!",
  confirmButton:
    "bg-red-600! hover:bg-red-700! text-white! font-semibold! px-5! py-2.5! rounded-lg!",
  cancelButton:
    "bg-surface-container-high! text-on-surface! font-semibold! px-5! py-2.5! rounded-lg!",
  timerProgressBar: "bg-red-600!",
};

function toast(message, type = "success") {
  const container = $("#toastContainer");
  if (!container) return;

  const tone = {
    success: "border-primary-container/40 text-on-surface",
    error: "border-red-500/40 text-on-surface",
    info: "border-white/10 text-on-surface",
  }[type];

  const symbol = {
    success: "check_circle",
    error: "error",
    info: "info",
  }[type];

  const item = document.createElement("div");
  item.className = `pointer-events-auto flex items-start gap-3 rounded-xl border ${tone} bg-surface-container-high/95 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/40 translate-y-2 opacity-0 transition-all duration-300`;
  item.innerHTML = `
    ${icon(symbol, "text-[20px] text-primary-container shrink-0 mt-0.5", false)}
    <p class="font-body-sm text-body-sm leading-relaxed">${escapeHtml(message)}</p>
  `;

  container.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    item.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => item.remove(), 320);
  }, 3200);
}

const swal = (options) =>
  typeof window.Swal === "function" ? window.Swal.fire(options) : Promise.resolve();

const notifySuccess = (title, text) =>
  swal({ icon: "success", title, text, timer: 1800, showConfirmButton: false, timerProgressBar: true, customClass: SWAL_THEME });

const notifyError = (title, text) =>
  swal({ icon: "error", title, text, confirmButtonText: "Đóng", timer: 2600, timerProgressBar: true, customClass: SWAL_THEME });

/* ================================================================== *
 * CHẶN TRUY CẬP KHI CHƯA ĐĂNG NHẬP  (yêu cầu mục 12)
 * ================================================================== */

async function requireLogin() {
  if (getCurrentUser()) return true;

  // Lưu lại để sau khi đăng nhập người dùng quay lại đúng trang này.
  sessionStorage.setItem("redirectAfterLogin", window.location.href);

  await swal({
    icon: "warning",
    title: "Vui lòng đăng nhập",
    text: "Vui lòng đăng nhập để sử dụng trang cá nhân.",
    confirmButtonText: "Đăng nhập",
    timer: 2200,
    timerProgressBar: true,
    customClass: SWAL_THEME,
  });

  window.location.href = "/login";
  return false;
}

/* ================================================================== *
 * CHUYỂN TAB
 * ================================================================== */

function switchTab(tab) {
  if (tab === "logout") {
    performLogout();
    return;
  }
  if (!TAB_META[tab]) return;

  state.activeTab = tab;

  $$(".profile-tab").forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(isActive));
    button.classList.toggle(
      "bg-primary-container",
      isActive,
    );
    button.classList.toggle("text-on-primary-container", isActive);
    button.classList.toggle("text-secondary", !isActive);
  });

  $$(".profile-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });

  const meta = TAB_META[tab];
  $("#pageTitle").textContent = meta.title;
  $("#breadcrumbCurrent").textContent = meta.breadcrumb;

  // Ghi nhớ tab để F5 vẫn giữ đúng mục đang xem.
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${tab}`);
}

/* ================================================================== *
 * THẺ ĐẦU TRANG
 * ================================================================== */

function renderHeaderCard() {
  const user = state.user || {};
  const container = $("#profileHeaderContent");
  const avatar = mediaUrl(user.avatar, AVATAR_FALLBACK);

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center gap-space-lg text-center sm:text-left">
      <div class="relative group shrink-0">
        <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-surface-container-highest shadow-2xl transition-all duration-300 group-hover:scale-105">
          <img
            alt="Ảnh đại diện ${escapeHtml(user.fullname || user.username || "")}"
            class="w-full h-full object-cover rounded-full bg-surface-container-lowest"
            data-fallback="${AVATAR_FALLBACK}"
            src="${avatar}"
          />
        </div>
      </div>

      <div class="flex flex-col gap-space-xs min-w-0">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-space-sm">
          <h2 class="font-headline-md text-headline-md text-on-surface tracking-tight break-words">
            ${escapeHtml(user.fullname || user.username || "Người dùng")}
          </h2>
          <span class="px-2.5 py-0.5 rounded font-label-sm text-label-sm bg-primary-container text-on-primary-container tracking-wider uppercase shadow-sm shrink-0">
            ${user.status === "active" ? "Đang hoạt động" : "Tạm khoá"}
          </span>
        </div>

        <div class="flex items-center justify-center sm:justify-start gap-space-xs text-secondary font-body-md text-body-md min-w-0">
          ${icon("mail", "text-[18px] text-secondary shrink-0")}
          <span class="truncate">${escapeHtml(user.email || "Chưa có email")}</span>
        </div>

        <div class="pt-space-xs flex flex-wrap items-center justify-center sm:justify-start gap-space-sm">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-secondary font-body-sm text-body-sm">
            ${icon("verified_user", "text-[15px] text-secondary")}
            <span>Thành viên từ ${escapeHtml(formatDate(user.createdAt))}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-secondary font-body-sm text-body-sm">
            <span class="w-2 h-2 rounded-full bg-primary-container shrink-0"></span>
            <span>${escapeHtml(user.username || "Chưa có tên tài khoản")}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="w-full sm:w-auto flex flex-wrap justify-center sm:justify-end gap-space-sm">
      <button
        class="inline-flex items-center justify-center gap-space-sm px-5 py-2.5 rounded-lg bg-primary-container hover:bg-inverse-primary text-on-primary-container font-title-sm text-title-sm transition-all duration-200 active:scale-95 shadow-lg shadow-primary-container/20"
        data-action="edit-profile"
        type="button"
      >
        ${icon("edit", "text-[18px]")}
        <span>Chỉnh sửa hồ sơ</span>
      </button>
      <button
        class="inline-flex items-center justify-center gap-space-sm px-5 py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-title-sm text-title-sm transition-all duration-200 active:scale-95 shadow-md shadow-black/30"
        data-action="logout"
        type="button"
      >
        ${icon("logout", "text-[18px]")}
        <span>Đăng xuất</span>
      </button>
    </div>
  `;

  toggleLoading("#headerLoading");
  container.hidden = false;
  bindImageFallback(container);
}

/* ================================================================== *
 * THẺ THỐNG KÊ
 * ================================================================== */

function renderStats() {
  const watching = state.history.filter((item) => {
    const percent = progressPercent(item);
    return percent > 0 && percent < 95;
  }).length;

  const cards = [
    { label: "Phim đã xem", value: state.history.length, hint: "Tác phẩm trong lịch sử", icon: "movie" },
    { label: "Phim yêu thích", value: state.favorites.length, hint: "Đã lưu để xem lại", icon: "favorite", filled: true },
    { label: "Đang xem", value: watching, hint: "Chưa xem xong", icon: "schedule" },
    { label: "Đã đánh giá", value: state.reviews.length, hint: "Bài nhận xét của bạn", icon: "star", filled: true },
  ];

  $("#statsGrid").innerHTML = cards
    .map(
      (card) => `
      <div class="relative overflow-hidden rounded-xl bg-surface-container-low/70 p-space-md flex flex-col justify-between group hover:bg-surface-container-high/60 transition-all duration-300 shadow-lg shadow-black/30">
        <div class="flex items-start justify-between gap-space-xs">
          <span class="font-body-sm text-body-sm text-secondary leading-snug">${card.label}</span>
          <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary group-hover:text-on-surface group-hover:scale-110 transition-transform shrink-0">
            ${icon(card.icon, "text-[20px]", Boolean(card.filled))}
          </div>
        </div>
        <div class="pt-space-md">
          <div class="font-display-hero-mobile text-display-hero-mobile font-bold text-on-surface tracking-tight">
            ${card.value}
          </div>
          <p class="font-body-sm text-body-sm text-secondary/80 mt-1">${card.hint}</p>
        </div>
      </div>`,
    )
    .join("");
}

/* ================================================================== *
 * TAB: THÔNG TIN CÁ NHÂN
 * ================================================================== */

const infoRow = (iconName, label, value) => `
  <div class="flex items-start gap-space-sm p-space-sm sm:p-space-md rounded-lg bg-surface-container-high">
    <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0">
      ${icon(iconName, "text-[18px]")}
    </div>
    <div class="flex flex-col min-w-0">
      <span class="font-label-md text-label-md text-secondary">${label}</span>
      <span class="font-title-sm text-title-sm text-on-surface truncate">${escapeHtml(value || "Chưa cập nhật")}</span>
    </div>
  </div>`;

function renderInfoPanel() {
  const user = state.user || {};

  const rows = [
    infoRow("person", "Họ và tên", user.fullname),
    infoRow("account_circle", "Tên tài khoản", user.username),
    infoRow("alternate_email", "Email", user.email),
    infoRow("call", "Số điện thoại", user.phone),
    infoRow("calendar_today", "Ngày sinh", user.dob ? formatDate(user.dob) : ""),
    infoRow("wc", "Giới tính", GENDER_LABEL[user.gender] || ""),
    infoRow("event", "Ngày tham gia", formatDate(user.createdAt)),
  ];

  const list = $("#infoList");
  list.innerHTML = rows.join("");
  toggleLoading("#infoLoading");
  list.hidden = false;
}

/* ================================================================== *
 * TAB: PHIM YÊU THÍCH
 * ================================================================== */

function renderFavorites() {
  const body = $('[data-body="favorites"]');

  if (!state.favorites.length) {
    body.innerHTML = emptyState({
      icon: "favorite",
      title: "Bạn chưa có phim yêu thích nào.",
      description: "Hãy khám phá các bộ phim hấp dẫn và lưu lại những tác phẩm bạn yêu thích.",
      action: { label: "Khám phá phim", icon: "explore", href: "/movies" },
    });
    bindImageFallback(body);
    return;
  }

  body.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-lg">
      ${state.favorites.map(movieCard).join("")}
    </div>
  `;
  bindImageFallback(body);
}

/** Card phim dùng chung cho lưới phim yêu thích. */
function movieCard(row) {
  const movie = row.movie;
  const genres = genresOf(movie);
  const score = movieScore(movie);

  return `
    <article class="group flex flex-col bg-surface-container-low rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:shadow-2xl">
      <div class="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-surface-container-highest">
        <img
          alt="Poster ${escapeHtml(movie.title)}"
          class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          data-fallback="${POSTER_FALLBACK}"
          loading="lazy"
          src="${mediaUrl(movie.poster)}"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-black/60 opacity-60 group-hover:opacity-90 transition-opacity"></div>

        <div class="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5">
          <div class="flex flex-wrap gap-1.5 min-w-0">
            ${genres
              .map(
                (name) =>
                  `<span class="px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm">${escapeHtml(name)}</span>`,
              )
              .join("")}
          </div>
          <button
            aria-label="Xóa ${escapeHtml(movie.title)} khỏi yêu thích"
            class="w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center text-primary-container hover:bg-primary-container hover:text-on-primary-container hover:scale-110 transition-all shrink-0"
            data-action="remove-favorite"
            data-id="${escapeHtml(row.id)}"
            data-title="${escapeHtml(movie.title)}"
            title="Xóa khỏi yêu thích"
            type="button"
          >
            ${icon("favorite", "text-[18px]", true)}
          </button>
        </div>

        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-xl">
            ${icon("play_arrow", "text-[28px]", true)}
          </div>
        </div>
      </div>

      <div class="pt-3 pb-1 px-1 flex flex-col flex-1 justify-between">
        <div class="min-w-0">
          <h3 class="font-title-md text-title-md text-on-surface truncate group-hover:text-primary-container transition-colors" title="${escapeHtml(movie.title)}">
            ${escapeHtml(movie.title)}
          </h3>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-body-sm text-body-sm text-secondary">
            <span>${escapeHtml(movie.year ?? "—")}</span>
            <span>•</span>
            <span>${escapeHtml(formatDuration(movie.duration))}</span>
            <span class="flex items-center gap-0.5 text-on-surface font-title-sm text-title-sm">
              ${icon("star", "text-[16px] text-primary-container", true)}
              <span>${escapeHtml(score)}</span>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 mt-3 pt-2.5 bg-surface-container/40 -mx-2.5 -mb-1 px-3 py-2">
          <a
            class="flex-1 text-center px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-inverse-primary transition-colors"
            href="${watchHref(movie)}"
          >
            Xem phim
          </a>
          <a
            aria-label="Chi tiết ${escapeHtml(movie.title)}"
            class="shrink-0 px-3 py-1.5 rounded bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
            href="${detailHref(movie)}"
            title="Xem chi tiết"
          >
            ${icon("info", "text-[16px]")}
          </a>
        </div>
      </div>
    </article>
  `;
}

/* ================================================================== *
 * TAB: LỊCH SỬ XEM PHIM
 * ================================================================== */

function progressPercent(row) {
  const movie = row.movie;
  const totalSeconds = (movie?.duration || 0) * 60;
  if (!totalSeconds) return 0;
  return Math.min(100, Math.round((toSeconds(row.progress) / totalSeconds) * 100));
}

function renderHistory() {
  const body = $('[data-body="history"]');

  if (!state.history.length) {
    body.innerHTML = emptyState({
      icon: "schedule",
      title: "Bạn chưa xem bộ phim nào.",
      description: "Những phim bạn xem sẽ được lưu lại tại đây để bạn tiếp tục xem bất cứ lúc nào.",
      action: { label: "Khám phá phim", icon: "explore", href: "/movies" },
    });
    return;
  }

  body.innerHTML = `
    <div class="flex flex-col gap-space-md">
      ${state.history.map(historyRow).join("")}
    </div>
  `;
  bindImageFallback(body);
}

function historyRow(row) {
  const movie = row.movie;
  const percent = progressPercent(row);
  const seconds = toSeconds(row.progress);

  // Nếu bản ghi có số tập (phim bộ) thì hiển thị "Tập x/y", ngược lại hiện thời lượng.
  const isSeries = Number(row.totalEpisodes) > 1;
  const episodeText = isSeries
    ? `Tập ${row.episode || 1}/${row.totalEpisodes}`
    : `Đã xem ${formatDuration(Math.round(seconds / 60))} / ${formatDuration(movie.duration)}`;

  return `
    <article class="flex flex-col sm:flex-row gap-space-md p-space-sm sm:p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
      <a
        class="relative shrink-0 w-full sm:w-24 aspect-[2/3] sm:aspect-auto sm:h-32 rounded-lg overflow-hidden bg-surface-container-highest"
        href="${detailHref(movie)}"
      >
        <img
          alt="Poster ${escapeHtml(movie.title)}"
          class="w-full h-full object-cover"
          data-fallback="${POSTER_FALLBACK}"
          loading="lazy"
          src="${mediaUrl(movie.poster)}"
        />
      </a>

      <div class="flex-1 min-w-0 flex flex-col justify-center gap-space-xs">
        <div class="min-w-0">
          <h3 class="font-title-md text-title-md text-on-surface truncate" title="${escapeHtml(movie.title)}">
            ${escapeHtml(movie.title)}
          </h3>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-body-sm text-body-sm text-secondary">
            <span>${escapeHtml(movie.year ?? "—")}</span>
            <span>•</span>
            <span class="text-on-surface-variant">${escapeHtml(episodeText)}</span>
            <span>•</span>
            <span>${escapeHtml(formatRelative(row.watchedAt))}</span>
          </div>
        </div>

        <div class="flex items-center gap-space-sm">
          <div class="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div class="h-full rounded-full bg-primary-container transition-all duration-500" style="width:${percent}%"></div>
          </div>
          <span class="shrink-0 font-label-md text-label-md text-secondary">${percent}%</span>
        </div>

        <div class="flex flex-wrap items-center gap-space-sm pt-1">
          <a
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-inverse-primary transition-colors"
            href="${watchHref(movie, seconds)}"
          >
            ${icon("play_arrow", "text-[16px]", true)}
            <span>Xem tiếp</span>
          </a>
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container text-secondary font-label-md text-label-md hover:text-red-400 hover:bg-red-400/10 transition-colors"
            data-action="remove-history"
            data-id="${escapeHtml(row.id)}"
            data-title="${escapeHtml(movie.title)}"
            type="button"
          >
            ${icon("delete", "text-[16px]")}
            <span>Xóa khỏi lịch sử</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ================================================================== *
 * TAB: PHIM ĐÃ ĐÁNH GIÁ
 * ================================================================== */

function renderReviews() {
  const body = $('[data-body="reviews"]');

  if (!state.reviews.length) {
    body.innerHTML = emptyState({
      icon: "star",
      title: "Bạn chưa đánh giá phim nào.",
      description: "Hãy xem phim và gửi đánh giá của bạn để giúp cộng đồng chọn phim hay hơn.",
      action: { label: "Khám phá phim", icon: "explore", href: "/movies" },
    });
    return;
  }

  body.innerHTML = `
    <div class="flex flex-col gap-space-md">
      ${state.reviews.map(reviewRow).join("")}
    </div>
  `;
  bindImageFallback(body);
}

function reviewRow(row) {
  const movie = row.movie;

  return `
    <article class="flex flex-col sm:flex-row gap-space-md p-space-sm sm:p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
      <a
        class="relative shrink-0 w-full sm:w-20 aspect-[2/3] sm:aspect-auto sm:h-28 rounded-lg overflow-hidden bg-surface-container-highest"
        href="${detailHref(movie)}"
      >
        <img
          alt="Poster ${escapeHtml(movie.title)}"
          class="w-full h-full object-cover"
          data-fallback="${POSTER_FALLBACK}"
          loading="lazy"
          src="${mediaUrl(movie.poster)}"
        />
      </a>

      <div class="flex-1 min-w-0 flex flex-col justify-center gap-space-xs">
        <div class="flex flex-wrap items-start justify-between gap-space-sm">
          <div class="min-w-0">
            <h3 class="font-title-md text-title-md text-on-surface truncate" title="${escapeHtml(movie.title)}">
              ${escapeHtml(movie.title)}
            </h3>
            <div class="flex items-center gap-1 mt-1" aria-label="Bạn đánh giá ${row.rating} trên 5 sao">
              ${starRow(row.rating)}
              <span class="ml-1 font-body-sm text-body-sm text-secondary">${escapeHtml(row.rating)}/5</span>
            </div>
          </div>
          <span class="shrink-0 font-body-sm text-body-sm text-secondary">
            ${escapeHtml(formatDate(row.createdAt))}
          </span>
        </div>

        ${
          row.comment
            ? `<p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed line-clamp-3">${escapeHtml(row.comment)}</p>`
            : `<p class="font-body-sm text-body-sm text-secondary italic">Bạn chưa viết nhận xét cho phim này.</p>`
        }

        <div class="flex flex-wrap items-center gap-space-sm pt-1">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest text-on-surface font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
            data-action="edit-review"
            data-id="${escapeHtml(row.id)}"
            type="button"
          >
            ${icon("edit", "text-[16px]")}
            <span>Chỉnh sửa đánh giá</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ================================================================== *
 * EMPTY STATE / LOADING
 * ================================================================== */

function emptyState({ icon: iconName, title, description, action }) {
  return `
    <div class="flex flex-col items-center justify-center text-center gap-space-sm py-space-xl px-gutter-mobile">
      <div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
        ${icon(iconName, "text-[30px]")}
      </div>
      <h4 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(title)}</h4>
      <p class="font-body-sm text-body-sm text-secondary max-w-sm">${escapeHtml(description)}</p>
      ${
        action
          ? `<a
              class="mt-space-xs inline-flex items-center gap-space-sm px-5 py-2.5 rounded-lg bg-primary-container hover:bg-inverse-primary text-on-primary-container font-title-sm text-title-sm transition-all active:scale-95 shadow-lg shadow-primary-container/20"
              href="${action.href}"
            >
              ${icon(action.icon, "text-[18px]")}
              <span>${escapeHtml(action.label)}</span>
            </a>`
          : ""
      }
    </div>
  `;
}

function showLoading(key) {
  const body = $(`[data-body="${key}"]`);
  if (!body) return;
  body.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-space-sm py-space-xl text-secondary">
      <div class="w-10 h-10 rounded-full border-2 border-white/10 border-t-primary-container animate-spin"></div>
      <p class="font-body-sm text-body-sm">Đang tải dữ liệu...</p>
    </div>
  `;
}

function updateSummaries() {
  const summary = (key, text) => {
    const el = $(`[data-summary="${key}"]`);
    if (el) el.textContent = text;
  };

  summary(
    "favorites",
    state.favorites.length
      ? `${state.favorites.length} phim đã lưu`
      : "Danh sách phim bạn đã lưu sẽ hiển thị ở đây",
  );
  summary(
    "history",
    state.history.length
      ? `${state.history.length} phim đã xem`
      : "Chưa có lịch sử xem phim",
  );
  summary(
    "reviews",
    state.reviews.length
      ? `${state.reviews.length} phim đã đánh giá`
      : "Chưa có đánh giá nào",
  );

  const counts = {
    favorites: state.favorites.length,
    history: state.history.length,
    reviews: state.reviews.length,
  };

  $$(".tab-count").forEach((badge) => {
    const value = counts[badge.dataset.count];
    badge.textContent = value ? String(value) : "";
    badge.classList.toggle("hidden", !value);
  });
}

/* ================================================================== *
 * MODAL
 * ================================================================== */

const activeModal = { el: null, restoreFocus: null };

function openModal(id) {
  const modal = $(`#${id}`);
  if (!modal) return;
  activeModal.el = modal;
  activeModal.restoreFocus = document.activeElement;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
  modal.querySelector("input, textarea, button")?.focus();
}

function closeModal() {
  const modal = activeModal.el;
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
  activeModal.el = null;
  activeModal.restoreFocus?.focus?.();
}

function showFieldError(form, field, message) {
  const holder = form.querySelector(`[data-error-for="${field}"]`);
  const input = form.querySelector(`[name="${field}"]`);
  if (holder) {
    holder.textContent = message || "";
    holder.classList.toggle("hidden", !message);
  }
  if (input) input.classList.toggle("border-red-500", Boolean(message));
}

const clearErrors = (form) =>
  $$("[data-error-for]", form).forEach((node) => {
    node.textContent = "";
    node.classList.add("hidden");
  });

/* ================================================================== *
 * KIỂM TRA DỮ LIỆU THÔNG TIN CÁ NHÂN
 * ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function validateProfile(form, values, originalEmail) {
  clearErrors(form);
  const errors = {};

  const name = values.fullname.trim();
  if (!name) errors.fullname = "Vui lòng nhập họ và tên.";
  else if (name.length < 2) errors.fullname = "Họ và tên phải có ít nhất 2 ký tự.";

  const email = values.email.trim();
  if (!email) errors.email = "Vui lòng nhập email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Email không đúng định dạng.";

  const phone = values.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(digits)) {
      errors.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
    }
  }

  if (values.dob) {
    const dob = new Date(values.dob);
    if (Number.isNaN(dob.getTime())) {
      errors.dob = "Ngày sinh không hợp lệ.";
    } else {
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (dob.getTime() > Date.now()) errors.dob = "Ngày sinh không được ở tương lai.";
      else if (age < 13) errors.dob = "Bạn phải đủ 13 tuổi để sử dụng MovieF.";
    }
  }

  Object.entries(errors).forEach(([field, message]) => showFieldError(form, field, message));

  return { ok: Object.keys(errors).length === 0, errors, changedEmail: email !== originalEmail };
}

/* ================================================================== *
 * HÀNH ĐỘNG
 * ================================================================== */

/** Mở modal chỉnh sửa thông tin và điền sẵn dữ liệu hiện tại. */
function openEditProfile() {
  const form = $("#editProfileForm");
  clearErrors(form);

  const user = state.user || {};
  form.elements.fullname.value = user.fullname || "";
  form.elements.username.value = user.username || "";
  form.elements.email.value = user.email || "";
  form.elements.phone.value = user.phone || "";
  form.elements.dob.value = user.dob || "";

  const gender = form.querySelector(`input[name="gender"][value="${user.gender || "nam"}"]`);
  if (gender) gender.checked = true;

  openModal("editProfileModal");
}

async function submitEditProfile(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const originalEmail = (state.user?.email || "").trim();

  const { ok, errors, changedEmail } = validateProfile(form, values, originalEmail);
  if (!ok) {
    notifyError("Chưa lưu được", "Vui lòng kiểm tra lại các trường được đánh dấu đỏ.");
    return;
  }

  // Email phải là duy nhất trong hệ thống (giống luồng đăng ký của auth.js).
  if (changedEmail && state.usingApi) {
    const { default: api } = await import("../api.js");
    try {
      const users = await api.get("/users");
      const duplicated = users.some(
        (item) =>
          String(item.email).toLowerCase() === values.email.trim().toLowerCase() &&
          String(item.id) !== String(state.userId),
      );
      if (duplicated) {
        showFieldError(form, "email", "Email này đã được sử dụng.");
        notifyError("Email đã tồn tại", "Vui lòng sử dụng email khác.");
        return;
      }
    } catch {
      // Không kiểm tra được thì bỏ qua, vẫn cho phép lưu.
    }
  }

  const button = $("#submitEditProfile");
  button.disabled = true;

  const payload = {
    fullname: values.fullname.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
  };
  if (values.phone !== undefined) payload.phone = values.phone.trim();
  if (values.dob !== undefined) payload.dob = values.dob;
  payload.gender = values.gender || "nam";

  try {
    state.user = await updateUser(state.userId, payload);
    closeModal();
    renderHeaderCard();
    renderInfoPanel();
    toast("Cập nhật thông tin thành công!", "success");
  } catch (error) {
    console.error("[profile] Lỗi cập nhật thông tin:", error);
    notifyError("Có lỗi xảy ra", "Không thể cập nhật thông tin. Vui lòng thử lại.");
  } finally {
    button.disabled = false;
  }
}

/** Bộ chọn sao trong modal sửa đánh giá. */
function buildRatingPicker() {
  const picker = $("#ratingPicker");
  picker.innerHTML = [1, 2, 3, 4, 5]
    .map(
      (value) => `
      <button
        aria-label="${value} sao"
        class="rating-star p-1 rounded-md hover:bg-surface-container-high transition-colors"
        data-rating="${value}"
        role="radio"
        aria-checked="false"
        type="button"
      >
        ${icon("star", "text-[28px] text-secondary/40", false)}
      </button>`,
    )
    .join("");

  picker.addEventListener("click", (event) => {
    const star = event.target.closest("[data-rating]");
    if (!star) return;
    setRating(Number(star.dataset.rating));
  });
}

function setRating(value) {
  state.editingRating = value;

  $$("#ratingPicker .rating-star").forEach((button) => {
    const active = Number(button.dataset.rating) <= value;
    const symbol = button.querySelector("span");
    symbol.className = `material-symbols-outlined text-[28px] ${active ? "text-primary-container" : "text-secondary/40"}`;
    if (active) symbol.style.fontVariationSettings = "'FILL' 1";
    else symbol.style.removeProperty("font-variation-settings");
    button.setAttribute("aria-checked", String(Number(button.dataset.rating) === value));
  });

  const captions = ["", "Rất tệ", "Tệ", "Bình thường", "Hay", "Rất hay"];
  $("#ratingCaption").textContent = captions[value] || "Chưa chọn";
}

function openEditReview(reviewId) {
  const review = state.reviews.find((item) => String(item.id) === String(reviewId));
  if (!review) return;

  state.editingReviewId = review.id;
  $("#editReviewMovie").textContent = review.movie?.title || "";
  $("#reviewComment").value = review.comment || "";
  clearErrors($("#editReviewForm"));
  setRating(Number(review.rating) || 0);

  openModal("editReviewModal");
}

async function submitEditReview(event) {
  event.preventDefault();

  const form = event.currentTarget;
  clearErrors(form);

  if (!state.editingRating) {
    notifyError("Chưa chọn số sao", "Vui lòng chọn số sao từ 1 đến 5.");
    return;
  }

  const button = $("#submitEditReview");
  button.disabled = true;

  try {
    const payload = {
      rating: state.editingRating,
      comment: $("#reviewComment").value.trim(),
    };

    await updateReview(state.userId, state.editingReviewId, payload);

    // Cập nhật lại danh sách trong bộ nhớ rồi render lại tab.
    const target = state.reviews.find((item) => String(item.id) === String(state.editingReviewId));
    if (target) Object.assign(target, payload);

    closeModal();
    renderReviews();
    updateSummaries();
    toast("Đã cập nhật đánh giá của bạn!", "success");
  } catch (error) {
    console.error("[profile] Lỗi sửa đánh giá:", error);
    notifyError("Có lỗi xảy ra", "Không thể lưu đánh giá. Vui lòng thử lại.");
  } finally {
    button.disabled = false;
  }
}

/** Hộp thoại xác nhận trước khi xoá. */
async function confirmAction(title, text) {
  if (typeof window.Swal !== "function") return window.confirm(text);

  const result = await window.Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Xác nhận",
    cancelButtonText: "Huỷ bỏ",
    customClass: SWAL_THEME,
  });
  return result.isConfirmed;
}

async function handleRemoveFavorite(id, title) {
  const confirmed = await confirmAction(
    "Xóa khỏi yêu thích?",
    `Bạn có chắc muốn xóa "${title}" khỏi danh sách phim yêu thích không?`,
  );
  if (!confirmed) return;

  try {
    await removeFavorite(state.userId, id);
    state.favorites = state.favorites.filter((item) => String(item.id) !== String(id));
    renderFavorites();
    renderStats();
    updateSummaries();
    toast(`Đã xóa "${title}" khỏi yêu thích.`, "success");
  } catch (error) {
    console.error("[profile] Lỗi xóa yêu thích:", error);
    notifyError("Có lỗi xảy ra", "Không thể xoá phim yêu thích.");
  }
}

async function handleRemoveHistory(id, title) {
  const confirmed = await confirmAction(
    "Xóa khỏi lịch sử?",
    `Bạn có chắc muốn xoá "${title}" khỏi lịch sử xem phim không?`,
  );
  if (!confirmed) return;

  try {
    await removeHistory(state.userId, id);
    state.history = state.history.filter((item) => String(item.id) !== String(id));
    renderHistory();
    renderStats();
    updateSummaries();
    toast(`Đã xóa "${title}" khỏi lịch sử.`, "success");
  } catch (error) {
    console.error("[profile] Lỗi xoá lịch sử:", error);
    notifyError("Có lỗi xảy ra", "Không thể xoá lịch sử xem phim.");
  }
}

async function performLogout() {
  const confirmed = await confirmAction(
    "Đăng xuất?",
    "Bạn sẽ cần đăng nhập lại để xem trang cá nhân.",
  );
  if (!confirmed) return;

  logout();
  window.location.href = "/login";
}

/* ================================================================== *
 * ĐỔI MẬT KHẨU
 * ================================================================== */

function validatePasswordForm(form) {
  clearErrors(form);

  const current = form.elements.currentPassword.value;
  const next = form.elements.newPassword.value;
  const confirm = form.elements.confirmPassword.value;
  let ok = true;

  if (!current) {
    showFieldError(form, "currentPassword", "Vui lòng nhập mật khẩu hiện tại.");
    ok = false;
  }

  if (!next) {
    showFieldError(form, "newPassword", "Vui lòng nhập mật khẩu mới.");
    ok = false;
  } else if (next.length < 6) {
    showFieldError(form, "newPassword", "Mật khẩu mới phải có tối thiểu 6 ký tự.");
    ok = false;
  }

  if (!confirm) {
    showFieldError(form, "confirmPassword", "Vui lòng xác nhận mật khẩu mới.");
    ok = false;
  } else if (next && next !== confirm) {
    showFieldError(form, "confirmPassword", "Mật khẩu xác nhận không khớp.");
    ok = false;
  }

  return ok;
}

async function submitChangePassword(event) {
  event.preventDefault();

  const form = event.currentTarget;
  if (!validatePasswordForm(form)) {
    toast("Mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.", "error");
    return;
  }

  const button = $("#submitChangePassword");
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `${icon("progress_activity", "text-[18px] animate-spin")}<span>Đang xử lý...</span>`;

  try {
    const result = await changePassword(
      state.userId,
      form.elements.currentPassword.value,
      form.elements.newPassword.value,
    );

    if (!result.ok) {
      showFieldError(form, "currentPassword", result.message);
      toast(result.message, "error");
      return;
    }

    form.reset();
    // Đưa con trỏ về ô mật khẩu hiện tại cho lần nhập kế tiếp.
    form.elements.currentPassword.focus();

    const status = $("#passwordStatus");
    status.classList.remove("opacity-0");
    status.classList.add("opacity-100");
    setTimeout(() => {
      status.classList.remove("opacity-100");
      status.classList.add("opacity-0");
    }, 3000);

    notifySuccess("Đổi mật khẩu thành công", "Bạn có thể đăng nhập lại bằng mật khẩu mới.");
  } catch (error) {
    console.error("[profile] Lỗi đổi mật khẩu:", error);
    toast("Có lỗi xảy ra, vui lòng thử lại.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

/* ================================================================== *
 * GẮN SỰ KIỆN
 * ================================================================== */

function bindEvents() {
  // Chuyển tab
  $("#profileTabs").addEventListener("click", (event) => {
    const button = event.target.closest(".profile-tab");
    if (button) switchTab(button.dataset.tab);
  });

  // Các nút hành động dùng chung (edit profile / logout / xoá / sửa đánh giá)
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    const { action, id, title } = trigger.dataset;
    if (action === "edit-profile") openEditProfile();
    else if (action === "logout") performLogout();
    else if (action === "remove-favorite") handleRemoveFavorite(id, title);
    else if (action === "remove-history") handleRemoveHistory(id, title);
    else if (action === "edit-review") openEditReview(id);
  });

  // Đóng modal
  document.addEventListener("click", (event) => {
    if (event.target.closest(".modal-close")) closeModal();
  });

  // Bấm ra ngoài vùng nội dung modal để đóng.
  ["#editProfileModal", "#editReviewModal"].forEach((selector) => {
    const modal = $(selector);
    if (!modal) return;
    modal.addEventListener("mousedown", (event) => {
      if (event.target === modal) closeModal();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal.el) closeModal();
  });

  // Hiện / ẩn mật khẩu
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest(".toggle-password");
    if (!toggle) return;

    const input = document.getElementById(toggle.dataset.target);
    if (!input) return;

    input.type = input.type === "password" ? "text" : "password";
    toggle.setAttribute(
      "aria-label",
      input.type === "password" ? "Hiện mật khẩu" : "Ẩn mật khẩu",
    );
    const symbol = toggle.querySelector("span");
    if (symbol) symbol.textContent = input.type === "password" ? "visibility" : "visibility_off";
  });

  // Form
  $("#editProfileForm").addEventListener("submit", submitEditProfile);
  $("#editReviewForm").addEventListener("submit", submitEditReview);
  $("#changePasswordForm").addEventListener("submit", submitChangePassword);

  buildRatingPicker();
}

/* ================================================================== *
 * KHỞI TẠO
 * ================================================================== */

async function init() {
  if (!(await requireLogin())) return;

  const current = getCurrentUser();
  state.userId = current.id;
  state.usingApi = await checkApi();

  bindEvents();

  // Hiển thị loading ngay cho các panel dữ liệu.
  ["favorites", "history", "reviews"].forEach(showLoading);

  // Tab mở đầu tiên lấy từ hash (#history) nếu có.
  const hashTab = window.location.hash.replace("#", "");
  switchTab(TAB_META[hashTab] ? hashTab : "info");

  try {
    const [user, genresData, favorites, history, reviews] = await Promise.all([
      fetchUser(state.userId),
      fetchGenres(),
      fetchFavorites(state.userId),
      fetchHistory(state.userId),
      fetchReviews(state.userId),
    ]);

    state.user = user || current;
    state.genres = genresData.genres || [];
    state.movieGenres = genresData.movieGenres || [];
    state.favorites = favorites;
    state.history = history;
    state.reviews = reviews;
  } catch (error) {
    console.error("[profile] Lỗi tải dữ liệu:", error);
    notifyError("Không tải được dữ liệu", "Vui lòng tải lại trang để thử lại.");
  }

  renderHeaderCard();
  renderInfoPanel();
  renderFavorites();
  renderHistory();
  renderReviews();
  renderStats();
  updateSummaries();

  // Gợi ý chế độ dữ liệu mẫu khi backend chưa chạy.
  if (!state.usingApi) {
    toast("Đang dùng dữ liệu mẫu (chưa kết nối được máy chủ).", "info");
  }

  bindImageFallback(document);
}

init();
