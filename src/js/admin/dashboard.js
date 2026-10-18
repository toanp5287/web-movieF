import api from "../api.js";
import { kiemTraDangNhapAdmin } from "../../utils/storage.js";
import {
  loadReviews,
  buildRatingMap,
  renderRatingHtml,
  isValidRating,
} from "./movies.js";

const allowed = await kiemTraDangNhapAdmin();

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
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
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setHtml(id, html) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = html;
}

function setStatus(message, tone = "muted") {
  const node = document.getElementById("dashboardStatus");
  if (!node) return;

  node.classList.remove("text-red-400", "text-emerald-400", "text-zinc-500");
  if (tone === "error") node.classList.add("text-red-400");
  else if (tone === "ok") node.classList.add("text-emerald-400");
  else node.classList.add("text-zinc-500");

  node.textContent = message;
}

/** Cùng quy tắc nhãn trạng thái với bảng quản lý phim (movies.js). */
function movieStatusInfo(status) {
  if (status === true || status === "published")
    return { label: "Đã phát hành", dot: "bg-emerald-500" };
  if (status === false || status === "draft")
    return { label: "Bản nháp", dot: "bg-amber-500" };
  if (status === "inactive" || status === "Inactive")
    return { label: "Đã xóa", dot: "bg-rose-500" };
  return { label: "Chưa xác định", dot: "bg-zinc-500" };
}

/** `movies.genre` là mảng id; record cũ có thể để null/scalar. */
function toGenreIds(value) {
  if (Array.isArray(value))
    return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  return [String(value).trim()];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function renderKpis({ movies, users, reviews, seasons }) {
  if (movies) {
    const active = movies.filter((movie) => movie.status !== "Inactive").length;
    setText("totalMovies", formatNumber(movies.length));
    setText(
      "movieDescription",
      `${formatNumber(active)} đang hoạt động · ${formatNumber(
        movies.length - active,
      )} không hoạt động`,
    );
  } else {
    setText("totalMovies", "—");
    setText("movieDescription", "Không tải được dữ liệu phim");
  }

  setText("totalUsers", users ? formatNumber(users.length) : "—");
  setText("totalReviews", reviews ? formatNumber(reviews.length) : "—");
  setText("totalSeasons", seasons ? formatNumber(seasons.length) : "—");

  if (!seasons) {
    setText("seasonDescription", "Không tải được dữ liệu mùa phim");
  } else if (seasons.length) {
    const movieIds = new Set(seasons.map((season) => String(season.movieId)));
    setText(
      "seasonDescription",
      `${formatNumber(movieIds.size)} phim đã có mùa phim`,
    );
  } else {
    setText("seasonDescription", "Chưa có mùa phim nào");
  }
}

function renderMovieStatus(movies) {
  if (!movies) {
    setText("activeMovies", "—");
    setText("inactiveMovies", "—");
    return;
  }

  const active = movies.filter((movie) => movie.status !== "Inactive").length;
  const inactive = movies.length - active;

  setText("activeMovies", formatNumber(active));
  setText("inactiveMovies", formatNumber(inactive));

  const total = movies.length;
  const activeBar = document.getElementById("activeMovieBar");
  const inactiveBar = document.getElementById("inactiveMovieBar");

  if (activeBar)
    activeBar.style.width = total ? `${(active / total) * 100}%` : "0%";
  if (inactiveBar)
    inactiveBar.style.width = total ? `${(inactive / total) * 100}%` : "0%";
}

function renderGenreList(genres, movies) {
  if (!genres) {
    setHtml(
      "genreList",
      `<div class="empty-state">Không tải được dữ liệu thể loại.</div>`,
    );
    return;
  }

  if (!genres.length) {
    setHtml(
      "genreList",
      `<div class="empty-state">Chưa có thể loại nào.</div>`,
    );
    return;
  }

  const rows = genres
    .map((genre) => {
      const id = String(genre.id);
      const count = (movies || []).filter((movie) =>
        toGenreIds(movie.genre).includes(id),
      ).length;

      return { name: genre.name, count };
    })
    .sort((left, right) => right.count - left.count);

  setHtml(
    "genreList",
    rows
      .map(
        (row) => `
        <div class="data-row">
          <span class="min-w-0 flex-1 truncate text-sm text-zinc-200">${escapeHtml(
            row.name,
          )}</span>
          <span class="text-xs text-zinc-500 shrink-0">${formatNumber(
            row.count,
          )} phim</span>
        </div>`,
      )
      .join(""),
  );
}

function renderTopMovies(movies, ratingMap) {
  if (!movies) {
    setHtml(
      "topMoviesTable",
      `<tr><td colspan="3" class="empty-state">Không tải được dữ liệu phim.</td></tr>`,
    );
    return;
  }

  const top = movies
    .filter((movie) => movie.status !== "Inactive")
    .sort(
      (left, right) => Number(right.views || 0) - Number(left.views || 0),
    )
    .slice(0, 5);

  if (!top.length) {
    setHtml(
      "topMoviesTable",
      `<tr><td colspan="3" class="empty-state">Chưa có phim nổi bật.</td></tr>`,
    );
    return;
  }

  setHtml(
    "topMoviesTable",
    top
      .map((movie) => {
        const status = movieStatusInfo(movie.status);

        return `
        <tr>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <img
                src="${escapeHtml(posterUrl(movie.poster))}"
                alt=""
                class="w-10 h-14 rounded object-cover bg-zinc-800 shrink-0"
              />
              <div class="min-w-0">
                <p class="font-semibold text-zinc-100 truncate">${escapeHtml(
                  movie.title,
                )}</p>
                <p class="text-xs text-zinc-500">${formatNumber(
                  movie.views || 0,
                )} lượt xem</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-3.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300">
              <span class="w-1.5 h-1.5 rounded-full ${status.dot}"></span>
              ${status.label}
            </span>
          </td>
          <td class="px-4 py-3.5">${renderRatingHtml(ratingMap, movie.id)}</td>
        </tr>`;
      })
      .join(""),
  );
}

function renderRecentReviews(reviews, users, movies) {
  if (!reviews) {
    setHtml(
      "recentReviews",
      `<div class="empty-state">Không tải được dữ liệu đánh giá.</div>`,
    );
    return;
  }

  if (!reviews.length) {
    setHtml(
      "recentReviews",
      `<div class="empty-state">Chưa có đánh giá nào.</div>`,
    );
    return;
  }

  const userMap = new Map(
    (users || []).map((user) => [String(user.id), user]),
  );
  const movieMap = new Map(
    (movies || []).map((movie) => [String(movie.id), movie]),
  );

  const recent = [...reviews]
    .sort((left, right) =>
      String(right.createdAt || "").localeCompare(
        String(left.createdAt || ""),
      ),
    )
    .slice(0, 5);

  setHtml(
    "recentReviews",
    recent
      .map((review) => {
        const user = userMap.get(String(review.userId));
        const movie = movieMap.get(String(review.movieId));
        const name =
          user?.fullname || user?.username || `Người dùng #${review.userId}`;
        const movieTitle = movie?.title || `Phim #${review.movieId}`;
        const date = formatDate(review.createdAt);
        const ratingLabel = isValidRating(review.rating)
          ? `★ ${formatNumber(Number(review.rating))}/5`
          : "—";

        return `
        <div class="data-row">
          <span class="min-w-0 flex-1">
            <span class="block text-sm text-zinc-200 truncate">${escapeHtml(
              name,
            )} <span class="text-zinc-600">·</span> ${escapeHtml(movieTitle)}</span>
            <span class="block mt-0.5 text-xs text-zinc-500 truncate">“${escapeHtml(
              review.comment || "",
            )}”</span>
            ${
              date
                ? `<span class="block mt-1 text-[11px] text-zinc-600">${date}</span>`
                : ""
            }
          </span>
          <span class="shrink-0 text-xs font-semibold text-amber-400">${ratingLabel}</span>
        </div>`;
      })
      .join(""),
  );
}

async function loadDashboard() {
  const [moviesRes, usersRes, reviewsRes, genresRes, seasonsRes] =
    await Promise.allSettled([
      api.get("/movies"),
      api.get("/users"),
      loadReviews(),
      api.get("/genres"),
      api.get("/season"),
    ]);

  const value = (result) =>
    result.status === "fulfilled" ? result.value : null;

  const movies = value(moviesRes);
  const users = value(usersRes);
  const reviews = value(reviewsRes);
  const genres = value(genresRes);
  const seasons = value(seasonsRes);

  // Cùng nguồn + cùng hàm với trang quản lý phim → điểm số nhất quán.
  const ratingMap = buildRatingMap(reviews || []);

  renderKpis({ movies, users, reviews, seasons });
  renderMovieStatus(movies);
  setText("totalGenres", genres ? formatNumber(genres.length) : "—");
  renderGenreList(genres, movies);
  renderTopMovies(movies, ratingMap);
  renderRecentReviews(reviews, users, movies);

  const failed = [
    moviesRes,
    usersRes,
    reviewsRes,
    genresRes,
    seasonsRes,
  ].filter((result) => result.status === "rejected").length;

  if (failed > 0) {
    setStatus(`Có ${failed} nguồn dữ liệu không tải được.`, "error");
  } else {
    setStatus(`Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}.`, "ok");
  }
}

document.getElementById("refreshDashboard")?.addEventListener(
  "click",
  async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus("Đang làm mới dữ liệu...");

    try {
      await loadDashboard();
    } finally {
      button.disabled = false;
    }
  },
);

if (allowed) {
  loadDashboard().catch((error) => {
    console.error("Lỗi tải dashboard:", error);
    setStatus("Không thể tải dữ liệu dashboard. Vui lòng thử lại.", "error");
  });
}
