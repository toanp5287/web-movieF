import api from "../api.js";
import { kiemTraDangNhapAdmin } from "../../utils/storage.js";
import { clearSession, getSessionUser } from "../custumer/auth-session.js";

const allowed = await kiemTraDangNhapAdmin();

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function posterUrl(poster) {
  if (!poster) return "/images/logo/logo.svg";
  if (/^(https?:)?\/\//.test(poster) || poster.startsWith("/")) return poster;
  return `/${String(poster).replace(/^\/+/, "")}`;
}

function setText(id, value) {
  const node = document.querySelector(`#${id}`);
  if (node) node.textContent = value;
}

function paintAdmin() {
  const user = getSessionUser();
  if (!user) return;

  const name = user.fullname || user.username || "Quản trị viên";

  document.querySelectorAll("[data-admin-name]").forEach((node) => {
    node.textContent = name;
  });
  document.querySelectorAll("[data-admin-email]").forEach((node) => {
    node.textContent = user.email || "";
  });
}

function renderTopMovies(movies) {
  const list = document.querySelector("#topMovies");
  if (!list) return;

  const ranked = [...movies].sort(
    (left, right) => Number(right.views || 0) - Number(left.views || 0),
  );
  const top = ranked.slice(0, 5);
  const maxViews = Number(top[0]?.views || 0) || 1;

  if (!top.length) {
    list.innerHTML = `<li class="font-body-sm text-body-sm text-on-surface-variant">Chưa có phim.</li>`;
    return;
  }

  list.innerHTML = top
    .map((movie) => {
      const views = Number(movie.views || 0);
      const width = Math.max(4, Math.round((views / maxViews) * 100));

      return `
        <li class="flex items-center gap-space-sm">
          <img
            class="w-10 h-14 rounded object-cover bg-surface-container shrink-0"
            src="${escapeHtml(posterUrl(movie.poster))}"
            alt="${escapeHtml(movie.title)}"
          />
          <div class="min-w-0 flex-1">
            <p class="font-title-sm text-title-sm text-on-surface truncate">${escapeHtml(movie.title)}</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(movie.year || "")}</p>
            <div class="mt-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div class="h-full rounded-full bg-primary-container" style="width: ${width}%"></div>
            </div>
          </div>
          <span class="font-title-sm text-title-sm text-primary shrink-0">${formatNumber(views)}</span>
        </li>
      `;
    })
    .join("");
}

function renderRecentUsers(users) {
  const list = document.querySelector("#recentUsers");
  if (!list) return;

  const recent = [...users]
    .sort((left, right) =>
      String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
    )
    .slice(0, 5);

  if (!recent.length) {
    list.innerHTML = `<li class="font-body-sm text-body-sm text-on-surface-variant">Chưa có người dùng.</li>`;
    return;
  }

  list.innerHTML = recent
    .map((user) => {
      const name = user.fullname || user.username || "Người dùng";
      const active = user.status === "active";

      return `
        <li class="flex items-center gap-space-sm">
          <span class="w-9 h-9 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-title-sm text-title-sm shrink-0">${escapeHtml(name.trim().charAt(0) || "U")}</span>
          <div class="min-w-0 flex-1">
            <p class="font-title-sm text-title-sm text-on-surface truncate">${escapeHtml(name)}</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${escapeHtml(user.email || "")}</p>
          </div>
          <span class="font-label-md text-label-md px-2 py-0.5 rounded-full ${active ? "bg-primary-container/20 text-primary-container" : "bg-surface-container-highest text-on-surface-variant"}">${active ? "Hoạt động" : "Khóa"}</span>
        </li>
      `;
    })
    .join("");
}

async function loadDashboard() {
  const [movies, genres, users, favorites, reviews] = await Promise.all([
    api.get("/movies"),
    api.get("/genres"),
    api.get("/users"),
    api.get("/favorites"),
    api.get("/reviews"),
  ]);

  const totalViews = movies.reduce(
    (sum, movie) => sum + Number(movie.views || 0),
    0,
  );
  const published = movies.filter((movie) => movie.status === "published").length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const activeGenres = genres.filter((genre) => genre.status === "active").length;

  setText("statMovies", formatNumber(movies.length));
  setText("statMoviesHint", `${formatNumber(published)} phim đã xuất bản`);
  setText("statGenres", formatNumber(genres.length));
  setText("statGenresHint", `${formatNumber(activeGenres)} thể loại đang dùng`);
  setText("statUsers", formatNumber(users.length));
  setText("statUsersHint", `${formatNumber(activeUsers)} tài khoản hoạt động`);
  setText("statViews", formatNumber(totalViews));
  setText(
    "statViewsHint",
    movies.length
      ? `Trung bình ${formatNumber(Math.round(totalViews / movies.length))} lượt / phim`
      : "Chưa có lượt xem",
  );
  setText("statFavorites", formatNumber(favorites.length));
  setText("statReviews", formatNumber(reviews.length));

  renderTopMovies(movies);
  renderRecentUsers(users);
}

function bindLogout() {
  document.querySelector("#adminLogout")?.addEventListener("click", () => {
    clearSession();
    window.location.href = "/login";
  });
}

if (allowed) {
  paintAdmin();
  bindLogout();
  loadDashboard().catch((error) => {
    console.error("Lỗi tải dashboard:", error);
    setText("statMovies", "—");
    setText("statMoviesHint", "Không tải được dữ liệu");
  });
}
