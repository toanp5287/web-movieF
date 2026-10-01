import { kiemTraDangNhapAdmin } from "./../../utils/storage";
import api from "../api";
await kiemTraDangNhapAdmin();

const loadMovies = async () => {
  try {
    const res = await api.get("/movies");
    console.log(res);
    const movies = res.filter((item) => item.status !== "Inactive");

    return movies;
  } catch (error) {
    console.log(error);
    return [];
  }
};
let currentPage = 1;
const moviesPerPage = 5;
let allMovies = [];

// ===============================
// TÌM KIẾM + LỌC THEO THỂ LOẠI
// ===============================

// masterMovies: toàn bộ phim đã load. allMovies: tập đang lọc (nguồn cho phân trang).
let masterMovies = [];
let genres = [];

const searchInput = document.querySelector("#searchInput");
const genreFilter = document.querySelector("#genreFilter");

/** Bỏ dấu + hạ chữ thường để tìm không phân biệt tiếng Việt/Anh. */
const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** `movies.genre` trong db.json là mảng id, nhưng record cũ có thể để null/scalar. */
const toGenreIdList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  return [String(value).trim()];
};

const getGenres = async () => {
  try {
    const res = await api.get("/genres");
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

/** Đổ danh sách thể loại từ db vào select, không tạo thể loại mới. */
function renderGenreOptions() {
  if (!genreFilter) return;

  genreFilter.innerHTML = `
    <option value="" class="bg-zinc-900 text-zinc-200">Tất cả thể loại</option>
    ${genres
      .map(
        (genre) =>
          `<option value="${genre.id}" class="bg-zinc-900 text-zinc-200">${genre.name}</option>`,
      )
      .join("")}
  `;
}

/** Lọc theo tên phim (không phân biệt hoa/thường, tìm theo một phần) VÀ thể loại. */
function getFilteredMovies() {
  const keyword = fold(searchInput?.value ?? "").trim();
  const genreId = String(genreFilter?.value ?? "").trim();

  return masterMovies.filter((movie) => {
    const matchName = !keyword || fold(movie.title).includes(keyword);

    const matchGenre =
      !genreId ||
      toGenreIdList(movie.genre).some((id) => id === genreId);

    return matchName && matchGenre;
  });
}

/** Cập nhật các con số "Đang hiển thị x-y / z phim". */
function renderFilterInfo(total) {
  const start = total === 0 ? 0 : (currentPage - 1) * moviesPerPage + 1;
  const end = Math.min(currentPage * moviesPerPage, total);
  const range = total === 0 ? "0" : `${start}-${end}`;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set("filterRange", range);
  set("filterTotal", String(total));
  set("footerRange", range);
  set("footerTotal", String(total));
}

function applyFilter() {
  currentPage = 1;
  renderMovies(getFilteredMovies());
}

function resetFilter() {
  if (searchInput) searchInput.value = "";
  if (genreFilter) genreFilter.value = "";

  currentPage = 1;
  renderMovies(masterMovies);
}

searchInput?.addEventListener("input", applyFilter);
genreFilter?.addEventListener("change", applyFilter);

window.applyFilter = applyFilter;
window.resetFilter = resetFilter;

function renderMovies(loadMovies) {
  allMovies = loadMovies;

  const movieList = document.querySelector("#movie-list");

  if (allMovies.length === 0) {
    movieList.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="py-10 text-center text-zinc-500 font-body-sm text-body-sm"
        >
          Không tìm thấy phim nào phù hợp.
        </td>
      </tr>
    `;

    renderFilterInfo(0);
    renderPagination(0);

    return;
  }

  const totalPages = Math.ceil(allMovies.length / moviesPerPage);

  // Trang hiện tại có thể vượt quá số trang sau khi lọc.
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * moviesPerPage;
  const end = start + moviesPerPage;

  const movies = allMovies.slice(start, end);

  movieList.innerHTML = movies
    .map(
      (movie) => `
        <!-- GIỮ NGUYÊN TR PHIM CỦA BẠN Ở ĐÂY -->
        <tr 
          data-id="${movie.id}" 
          class="bg-surface-container-low hover:bg-surface-container transition-colors group"
        >

          <td class="py-3.5 pl-space-md pr-space-xs text-center">
            <label class="relative flex items-center justify-center cursor-pointer">
              <input 
                class="movie-row-checkbox peer sr-only"
                type="checkbox"
                value="${movie.id}"
              />

              <span class="w-4 h-4 rounded bg-surface-container-high flex items-center justify-center peer-checked:bg-primary-container">
                <span class="material-symbols-outlined text-xs text-on-primary-container opacity-0 peer-checked:opacity-100 font-bold">
                  check
                </span>
              </span>
            </label>
          </td>

          <td class="py-3.5 px-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-container-highest">
                <img
                  class="w-full h-full object-cover"
                  src="${movie.poster}"
                  alt="${movie.title}"
                />
              </div>

              <div class="flex flex-col min-w-0">
                <span class="font-title-sm text-title-sm text-on-surface truncate">
                  ${movie.title}
                </span>

                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span>${movie.year}</span>
                  <span>•</span>
                  <span>${movie.director}</span>
                </div>
              </div>
            </div>
          </td>

          <td class="py-3.5 px-space-md">
            <span class="px-2.5 py-1 rounded-full bg-surface-container-high">
              ${movie.genre}
            </span>
          </td>

          <td class="py-3.5 px-space-md">
            ${movie.duration} phút
          </td>

          <td class="py-3.5 px-space-md">
            <span class="px-2 py-0.5 rounded bg-primary-container/15 text-primary">
              ${movie.quality}
            </span>
          </td>

          <td class="py-3.5 px-space-md">
            ${movie.views?.toLocaleString("vi-VN") || 0}
          </td>

          <td class="py-3.5 px-space-md">
            ⭐ ${movie.rating}
          </td>

          <td class="py-3.5 px-space-md">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800">
              <span class="w-1.5 h-1.5 rounded-full ${
                movie.status === "published"
                  ? "bg-emerald-500"
                  : movie.status === "draft"
                    ? "bg-amber-500"
                    : movie.status === "inactive"
                      ? "bg-rose-500"
                      : "bg-zinc-500"
              }"></span>

              ${
                movie.status === "published"
                  ? "Đã phát hành"
                  : movie.status === "draft"
                    ? "Bản nháp"
                    : movie.status === "inactive"
                      ? "Đã xóa"
                      : "Chưa xác định"
              }
            </span>
          </td>

          <td class="py-3.5 px-space-md text-right pr-space-lg">
            <div class="inline-flex items-center gap-1">

              <button
                type="button"
                onclick="viewMovie('${movie.id}')"
              >
                <span class="material-symbols-outlined text-lg">
                  visibility
                </span>
              </button>

              <button
                type="button"
                onclick="editMovie('${movie.id}')"
              >
                <span class="material-symbols-outlined text-lg">
                  edit
                </span>
              </button>

              <button
                type="button"
                onclick="deleteMovie('${movie.id}')"
              >
                <span class="material-symbols-outlined text-lg">
                  delete
                </span>
              </button>

            </div>
          </td>

        </tr>
      `,
    )
    .join("");

  renderFilterInfo(allMovies.length);
  renderPagination(totalPages);
}
function renderPagination(totalPages) {
  const pagination = document.querySelector("#pagination");

  // Không có phim nào khớp bộ lọc: không dựng thanh trang.
  if (totalPages === 0) {
    pagination.innerHTML = "";

    return;
  }

  pagination.innerHTML = `
    <div class="flex items-center justify-between mt-6">

      <span class="text-sm text-gray-400">
        Trang ${currentPage} / ${totalPages}
      </span>

      <div class="flex gap-2">

        <button
          onclick="previousPage()"
          ${currentPage === 1 ? "disabled" : ""}
          class="px-4 py-2 rounded-lg bg-gray-800 disabled:opacity-40"
        >
          Trước
        </button>

        ${Array.from(
          { length: totalPages },
          (_, i) => `
          <button
            onclick="goToPage(${i + 1})"
            class="w-9 h-9 rounded-lg ${
              currentPage === i + 1 ? "bg-red-600 text-white" : "bg-gray-800"
            }"
          >
            ${i + 1}
          </button>
        `,
        ).join("")}

        <button
          onclick="nextPage()"
          ${currentPage === totalPages ? "disabled" : ""}
          class="px-4 py-2 rounded-lg bg-gray-800 disabled:opacity-40"
        >
          Sau
        </button>

      </div>
    </div>
  `;
}

function goToPage(page) {
  currentPage = page;
  renderMovies(allMovies);
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderMovies(allMovies);
  }
}

function nextPage() {
  const totalPages = Math.ceil(allMovies.length / moviesPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    renderMovies(allMovies);
  }
}
window.goToPage = goToPage;
window.nextPage = nextPage;
window.previousPage = previousPage;
const movies = await loadMovies();
masterMovies = movies;

genres = await getGenres();
renderGenreOptions();

renderMovies(movies);

async function viewMovie(id) {
  try {
    const response = await api.get(`/movies/${id}`);
    const movie = response.data || response;

    // Map hiển thị đối tượng khán giả / giới tính
    const genderMap = {
      all: "Tất cả đối tượng",
      male: "Nam giới",
      female: "Nữ giới",
      other: "Khác / Phổ biến",
    };

    // Map hiển thị trạng thái phim
    const statusBadgeMap = {
      published:
        '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Published</span>',
      draft:
        '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 Draft</span>',
      inactive:
        '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 Inactive</span>',
    };

    const genreDisplay =
      movie.genreName ||
      (typeof movie.genre === "object"
        ? movie.genre?.name
        : `Thể loại #${movie.genre || movie.genreId || "N/A"}`);

    document.getElementById("movieDetailContent").innerHTML = `
      <!-- ================= POSTER & BACKDROP ================= -->
      <div class="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 border border-zinc-800 bg-zinc-950">
        <img 
          src="${movie.backdrop || movie.poster || "/images/default-backdrop.jpg"}" 
          alt="${movie.title || "Backdrop"}" 
          class="w-full h-full object-cover opacity-50"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>
        
        <div class="absolute bottom-4 left-4 right-4 flex items-end gap-4">
          <img 
            src="${movie.poster || "/images/default-poster.jpg"}" 
            alt="${movie.title || "Poster"}" 
            class="w-20 sm:w-28 aspect-[2/3] object-cover rounded-xl border border-zinc-700 shadow-2xl shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h3 class="text-xl sm:text-2xl font-bold text-white truncate">
                ${movie.title || "Chưa có tên phim"}
              </h3>
              ${
                movie.quality
                  ? `<span class="px-2 py-0.5 text-[11px] font-extrabold uppercase rounded bg-brand/20 text-brand border border-brand/30">${movie.quality}</span>`
                  : ""
              }
            </div>
            <p class="text-xs text-zinc-400 font-mono truncate">
              slug: ${movie.slug || "khong-co-slug"}
            </p>
          </div>
        </div>
      </div>

      <!-- ================= THÔNG SỐ CHI TIẾT ================= -->
      <div class="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3 text-sm">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 pb-2 border-b border-zinc-800 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base text-brand">info</span>
            Thông số phim
          </span>
          <span class="font-mono text-zinc-500 text-[11px]">ID: #${movie.id}</span>
        </h4>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Thể loại</span>
          <span class="text-zinc-200 font-medium">${genreDisplay}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Đối tượng / Giới tính</span>
          <span class="text-zinc-200 font-medium">${genderMap[movie.gender] || movie.gender || "Tất cả"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Đạo diễn</span>
          <span class="text-zinc-200 font-medium">${movie.director || "Chưa cập nhật"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Quốc gia</span>
          <span class="text-zinc-200 font-medium">${movie.country || "Chưa cập nhật"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Năm phát hành</span>
          <span class="text-zinc-200 font-medium">${movie.year || "Chưa cập nhật"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Thời lượng</span>
          <span class="text-zinc-200 font-medium">${movie.duration ? `${movie.duration} phút` : "Chưa cập nhật"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Chất lượng</span>
          <span class="text-zinc-200 uppercase font-medium">${movie.quality || "HD"}</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Lượt xem</span>
          <span class="text-zinc-200 font-medium">${(movie.views || 0).toLocaleString()} lượt</span>
        </div>

        <div class="flex justify-between py-1 border-b border-zinc-800/40">
          <span class="text-zinc-400">Ngày tạo</span>
          <span class="text-zinc-200 font-medium">${movie.createdAt || "Chưa cập nhật"}</span>
        </div>

        <div class="flex justify-between items-center py-1">
          <span class="text-zinc-400">Trạng thái</span>
<div>
  ${
    movie.status === "published"
      ? "🟢 Đã phát hành"
      : movie.status === "draft"
        ? "🟡 Bản nháp"
        : movie.status === "inactive"
          ? "🔴 Đã xóa"
          : "⚪ Chưa xác định"
  }
</div>
        </div>
      </div>

      <!-- ================= DIỄN VIÊN ================= -->
      <div class="mt-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base text-brand">groups</span>
          Dàn diễn viên
        </h4>
        <div class="flex flex-wrap gap-2">
          ${
            Array.isArray(movie.actors) && movie.actors.length > 0
              ? movie.actors
                  .map(
                    (actor) => `
                      <span class="px-3 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700/60 text-xs text-zinc-300">
                        ${actor}
                      </span>
                    `,
                  )
                  .join("")
              : `<span class="text-xs text-zinc-500 italic">Chưa có thông tin diễn viên</span>`
          }
        </div>
      </div>

      <!-- ================= MÔ TẢ ================= -->
      <div class="mt-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base text-brand">description</span>
          Nội dung tóm tắt
        </h4>
        <p class="text-sm text-zinc-300 leading-relaxed">
          ${movie.description || "Chưa có mô tả cho bộ phim này."}
        </p>
      </div>

      <!-- ================= NÚT PHÁT VIDEO ================= -->
      <div class="mt-6 space-y-3">
        ${
          movie.trailer
            ? `
              <button
                type="button"
                onclick="watchMovieMedia('${movie.trailer}', 'Trailer:${movie.title.replace(/'/g, "\\'")}')"
                class="w-full flex items-center justify-center gap-2
                       bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                       text-zinc-200 font-semibold py-3 px-4 rounded-xl
                       transition-all"
              >
                <span class="material-symbols-outlined text-lg">movie</span>
                Xem Trailer
              </button>
            `
            : ""
        }

        ${
          movie.video
            ? `
              <button
                type="button"
                onclick="watchMovieMedia('${movie.video}', 'Phim:${movie.title.replace(/'/g, "\\'")}')"
                class="w-full flex items-center justify-center gap-2
                       bg-brand hover:bg-brand-hover
                       text-white font-semibold py-3 px-4 rounded-xl
                       transition-all shadow-lg shadow-brand/30"
              >
                <span class="material-symbols-outlined text-xl">play_arrow</span>
                Xem phim ngay
              </button>
            `
            : `
              <div class="w-full p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                <span class="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-sm">warning</span>
                  Phim chưa có file video
                </span>
              </div>
            `
        }
      </div>

      <!-- ================= VIDEO PLAYER ================= -->
      <div id="movieVideoContainer" class="hidden mt-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
          <h4 id="movieVideoTitle" class="text-sm font-semibold text-white truncate">
            Đang phát
          </h4>
          <button 
            type="button" 
            onclick="closeMovieVideo()"
            class="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-800"
          >
            Đóng video
          </button>
        </div>

        <video
          id="movieVideo"
          class="w-full rounded-xl bg-black aspect-video"
          controls
          playsinline
        >
          <source id="movieVideoSource" src="" type="video/mp4">
          Trình duyệt của bạn không hỗ trợ phát video.
        </video>
      </div>
    `;

    // Hiện drawer
    const drawer = document.getElementById("movieDetailDrawer");
    const panel = document.getElementById("movieDetailPanel");
    const overlay = document.getElementById("movieDetailOverlay");

    drawer.classList.remove("invisible");

    requestAnimationFrame(() => {
      panel.classList.remove("translate-x-full");
      overlay.classList.remove("opacity-0");
    });
  } catch (error) {
    console.error("Lỗi xem chi tiết phim:", error);
    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Không thể lấy thông tin phim",
    });
  }
}

// 2 hàm hỗ trợ phát video / đóng video trực tiếp trên drawer
window.watchMovieMedia = function (url, title) {
  const container = document.getElementById("movieVideoContainer");
  const video = document.getElementById("movieVideo");
  const source = document.getElementById("movieVideoSource");
  const titleEl = document.getElementById("movieVideoTitle");

  if (!container || !video || !source) return;

  source.src = url;
  if (titleEl) titleEl.textContent = title || "Đang phát video";
  container.classList.remove("hidden");
  video.load();
  video.play();
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.closeMovieVideo = function () {
  const container = document.getElementById("movieVideoContainer");
  const video = document.getElementById("movieVideo");
  if (video) video.pause();
  if (container) container.classList.add("hidden");
};

function closeMovieDetail() {
  const drawer = document.getElementById("movieDetailDrawer");
  const panel = document.getElementById("movieDetailPanel");
  const overlay = document.getElementById("movieDetailOverlay");

  panel.classList.add("translate-x-full");
  overlay.classList.add("opacity-0");

  setTimeout(() => {
    drawer.classList.add("invisible");
  }, 300);
}

function watchMovie(videoUrl) {
  if (!videoUrl) {
    Swal.fire({
      icon: "warning",
      title: "Chưa có video",
      text: "Phim này chưa có video để xem.",
    });
    return;
  }

  const container = document.getElementById("movieVideoContainer");
  const video = document.getElementById("movieVideo");

  container.classList.remove("hidden");

  video.load();

  video.play().catch((error) => {
    console.log("Không autoplay được:", error);
  });

  container.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}
window.viewMovie = viewMovie;
window.closeMovieDetail = closeMovieDetail;
window.watchMovie = watchMovie;

async function editMovie(id) {
  try {
    window.location.href = `/admin/editMovie?id=${id}`;
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Không thể chuyển đến trang sửa phim",
    });
  }
}
window.editMovie = editMovie;

// xoá mềm phim
async function deleteMovie(id) {
  try {
    await api.patch(`/movies/${id}`, {
      status: "Inactive",
    });

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Đã ẩn phim",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error(error);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: "Không thể xóa phim",
      showConfirmButton: false,
      timer: 2000,
    });
  }
}
window.deleteMovie = deleteMovie;

function addMovie() {
  window.location.href = "/admin/addMovie";
}
window.addMovie = addMovie;
