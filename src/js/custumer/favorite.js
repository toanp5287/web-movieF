import api from "../api.js";
import { getSessionUser, requireAuth } from "./auth-session.js";

const swalClass = {
  popup:
    "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
  title: "text-white! text-xl! font-semibold! mt-2!",
  htmlContainer: "text-gray-400! text-sm! mt-1!",
  confirmButton:
    "bg-red-600! hover:bg-red-700! text-white! font-medium! px-6! py-2.5! rounded-lg! transition!",
  cancelButton:
    "bg-white/10! text-white! font-medium! px-6! py-2.5! rounded-lg!",
  timerProgressBar: "bg-red-600!",
};

const getCurrentUser = getSessionUser;

function redirectToLogin() {
  requireAuth({ message: "Vui lòng đăng nhập để tiếp tục." });
}

function sameId(left, right) {
  return String(left) === String(right);
}

function normalizeId(id) {
  return /^\d+$/.test(String(id)) ? Number(id) : id;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function posterUrl(poster) {
  if (!poster) return "";
  if (/^(https?:)?\/\//.test(poster) || poster.startsWith("/")) return poster;
  return `/${String(poster).replace(/^\/+/, "")}`;
}

function formatDuration(minutes) {
  const value = Number(minutes);
  if (!value) return "";

  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (!hours) return `${mins} phút`;
  return `${hours}g ${String(mins).padStart(2, "0")}p`;
}

function toast(title) {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
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
}

async function loadCatalog() {
  const [favorites, movies, genres, movieGenres] = await Promise.all([
    api.get("/favorites"),
    api.get("/movies"),
    api.get("/genres"),
    api.get("/movieGenres"),
  ]);

  return { favorites, movies, genres, movieGenres };
}

function genresForMovie(movieId, movieGenres, genres) {
  const genreIds = movieGenres
    .filter((item) => sameId(item.movieId, movieId))
    .map((item) => item.genreId);

  return genres.filter((genre) =>
    genreIds.some((genreId) => sameId(genreId, genre.id)),
  );
}

function findFavorite(favorites, userId, movieId) {
  return favorites.find(
    (item) => sameId(item.userId, userId) && sameId(item.movieId, movieId),
  );
}

async function addFavorite(user, movieId) {
  const favorites = await api.get("/favorites");
  const existing = findFavorite(favorites, user.id, movieId);
  if (existing) return existing;

  return api.post("/favorites", {
    userId: normalizeId(user.id),
    movieId: normalizeId(movieId),
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

async function removeFavorite(favoriteId) {
  return api.delete(`/favorites/${favoriteId}`);
}

function paintToggle(button, saved) {
  const icon = button.querySelector("#fav-icon");
  const text = button.querySelector("#fav-text");
  if (!icon || !text) return;

  icon.style.fontVariationSettings = saved ? "'FILL' 1" : "'FILL' 0";
  icon.classList.toggle("text-primary-container", saved);
  text.textContent = saved ? "Đã lưu vào yêu thích" : "Thêm vào yêu thích";
}

async function initFavoriteToggle(button) {
  const params = new URLSearchParams(window.location.search);
  const movieId = params.get("id") || button.dataset.movieId;
  if (!movieId) return;

  const user = getCurrentUser();
  let current = null;

  if (user) {
    try {
      const favorites = await api.get("/favorites");
      current = findFavorite(favorites, user.id, movieId) || null;
      paintToggle(button, Boolean(current));
    } catch (error) {
      console.error("Lỗi tải yêu thích:", error);
    }
  }

  button.addEventListener("click", async () => {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      redirectToLogin();
      return;
    }

    button.disabled = true;

    try {
      if (current) {
        await removeFavorite(current.id);
        current = null;
        paintToggle(button, false);
        await toast("Đã xóa khỏi yêu thích");
      } else {
        current = await addFavorite(activeUser, movieId);
        paintToggle(button, true);
        await toast("Đã thêm vào yêu thích");
      }
    } catch (error) {
      console.error("Lỗi cập nhật yêu thích:", error);
      await Swal.fire({
        icon: "error",
        title: "Không lưu được",
        text: "Vui lòng thử lại sau.",
        confirmButtonText: "Đóng",
        customClass: swalClass,
      });
    } finally {
      button.disabled = false;
    }
  });
}

function initFavoritePage() {
  const user = getCurrentUser();
  if (!user) {
    redirectToLogin();
    return;
  }

  const listSection = document.querySelector("#favoritesListSection");
  const emptySection = document.querySelector("#favoritesEmptySection");
  const grid = document.querySelector("#favoritesGrid");
  const count = document.querySelector("#favoriteCount");
  const allChip = document.querySelector("#favoriteAllChip");
  const searchInput = document.querySelector("#favoriteSearch");
  const searchEmpty = document.querySelector("#favoriteSearchEmpty");
  const form = document.querySelector("#addFavoriteForm");
  const movieSelect = document.querySelector("#movieSelect");
  const addButton = document.querySelector("#addFavoriteBtn");

  if (!listSection || !grid || !form || !movieSelect) return;

  let items = [];
  let movies = [];

  function renderSelect() {
    const savedIds = new Set(items.map((item) => String(item.movie.id)));
    const available = movies.filter(
      (movie) =>
        movie.status === "published" && !savedIds.has(String(movie.id)),
    );

    movieSelect.innerHTML =
      `<option value="">Chọn phim để thêm</option>` +
      available
        .map(
          (movie) =>
            `<option value="${escapeHtml(movie.id)}">${escapeHtml(movie.title)}</option>`,
        )
        .join("");

    if (addButton) addButton.disabled = available.length === 0;
  }

  function renderList() {
    const keyword = searchInput?.value.trim().toLowerCase() || "";
    const visible = items.filter((item) =>
      item.movie.title.toLowerCase().includes(keyword),
    );

    if (count) count.textContent = `${items.length} phim`;
    if (allChip) allChip.textContent = `Tất cả (${items.length})`;

    const hasItems = items.length > 0;
    listSection.style.display = hasItems ? "" : "none";
    if (emptySection) emptySection.style.display = hasItems ? "none" : "flex";

    if (searchEmpty) {
      searchEmpty.classList.toggle(
        "hidden",
        !hasItems || visible.length > 0 || !keyword,
      );
    }

    grid.innerHTML = visible
      .map((item) => {
        const movie = item.movie;
        const genre = item.genres[0]?.name || "Phim";
        const image = escapeHtml(posterUrl(movie.poster));

        return `
          <article class="group flex flex-col bg-surface-container-low rounded-xl overflow-hidden p-2.5">
            <div class="favorite-poster bg-surface-container-highest">
              <img src="${image}" alt="${escapeHtml(movie.title)}" />
              <div class="absolute top-2.5 left-2.5">
                <span class="px-2 py-0.5 rounded bg-surface-container-lowest/80 text-on-surface font-label-md text-label-md">${escapeHtml(genre)}</span>
              </div>
              <button
                class="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface-container-lowest/80 flex items-center justify-center text-primary-container hover:bg-surface-container-lowest hover:scale-110 transition-all"
                type="button"
                data-remove-favorite="${escapeHtml(item.favorite.id)}"
                title="Xóa khỏi yêu thích"
              >
                <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1">favorite</span>
              </button>
            </div>
            <div class="pt-3 pb-1 px-1 flex flex-col flex-1 justify-between">
              <div>
                <h3 class="font-title-md text-title-md text-on-surface truncate">
                  <a class="hover:text-primary-container transition-colors" href="/movie-detail?id=${escapeHtml(movie.id)}">${escapeHtml(movie.title)}</a>
                </h3>
                <div class="flex items-center gap-2 mt-1 font-body-sm text-body-sm text-secondary">
                  <span>${escapeHtml(movie.year || "")}</span>
                  <span>•</span>
                  <span>${escapeHtml(formatDuration(movie.duration))}</span>
                </div>
              </div>
              <div class="flex items-center justify-between mt-3 pt-2.5">
                <a class="px-3 py-1 rounded bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-inverse-primary transition-colors" href="/movie-detail?id=${escapeHtml(movie.id)}">Xem ngay</a>
                <span class="flex items-center gap-1 font-body-sm text-body-sm text-secondary">
                  <span class="material-symbols-outlined text-[14px] text-primary-container" style="font-variation-settings: 'FILL' 1">favorite</span>
                  Đã lưu
                </span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function refresh() {
    const catalog = await loadCatalog();
    movies = catalog.movies;
    items = catalog.favorites
      .filter((favorite) => sameId(favorite.userId, user.id))
      .map((favorite) => {
        const movie = catalog.movies.find((item) =>
          sameId(item.id, favorite.movieId),
        );
        return movie
          ? {
              favorite,
              movie,
              genres: genresForMovie(
                movie.id,
                catalog.movieGenres,
                catalog.genres,
              ),
            }
          : null;
      })
      .filter(Boolean)
      .sort((left, right) =>
        String(right.favorite.createdAt).localeCompare(
          String(left.favorite.createdAt),
        ),
      );

    renderSelect();
    renderList();
  }

  grid.innerHTML = `<p class="font-body-md text-body-md text-secondary col-span-full">Đang tải...</p>`;
  if (emptySection) emptySection.style.display = "none";

  refresh().catch((error) => {
    console.error("Lỗi tải danh sách yêu thích:", error);
    grid.innerHTML = `<p class="font-body-md text-body-md text-secondary col-span-full">Không tải được danh sách yêu thích.</p>`;
  });

  searchInput?.addEventListener("input", renderList);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const movieId = movieSelect.value;
    if (!movieId) return;

    if (addButton) addButton.disabled = true;

    try {
      await addFavorite(user, movieId);
      movieSelect.value = "";
      await refresh();
      await toast("Đã thêm vào yêu thích");
    } catch (error) {
      console.error("Lỗi thêm yêu thích:", error);
      await Swal.fire({
        icon: "error",
        title: "Không thêm được",
        text: "Vui lòng thử lại sau.",
        confirmButtonText: "Đóng",
        customClass: swalClass,
      });
    } finally {
      if (addButton) addButton.disabled = movieSelect.options.length <= 1;
    }
  });

  grid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-favorite]");
    if (!button) return;

    const favoriteId = button.dataset.removeFavorite;
    const item = items.find((entry) => sameId(entry.favorite.id, favoriteId));

    const result = await Swal.fire({
      icon: "warning",
      title: "Xóa khỏi yêu thích?",
      text: item
        ? `Bạn muốn xóa "${item.movie.title}"?`
        : "Bạn muốn xóa phim này?",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      customClass: swalClass,
    });

    if (!result.isConfirmed) return;

    button.disabled = true;

    try {
      await removeFavorite(favoriteId);
      await refresh();
      await toast("Đã xóa khỏi yêu thích");
    } catch (error) {
      console.error("Lỗi xóa yêu thích:", error);
      button.disabled = false;
      await Swal.fire({
        icon: "error",
        title: "Không xóa được",
        text: "Vui lòng thử lại sau.",
        confirmButtonText: "Đóng",
        customClass: swalClass,
      });
    }
  });
}

const watchLink = document.querySelector("#watchMovieLink");
if (watchLink) {
  const movieId =
    new URLSearchParams(window.location.search).get("id") || "7";
  watchLink.href = `/watch?id=${encodeURIComponent(movieId)}`;
}

const favoritePage = document.querySelector("#favoritesListSection");
const favoriteToggle = document.querySelector("#favorite-toggle");

if (favoritePage) initFavoritePage();
if (favoriteToggle) initFavoriteToggle(favoriteToggle);
