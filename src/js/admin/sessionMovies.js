import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();

// ========================================
// 1. LẤY DANH SÁCH PHIM BỘ
// ========================================
async function movies() {
  try {
    const res = await api.get("/movies");

    return res.filter((item) => item.type == "series");
  } catch (error) {
    console.error("Lỗi lấy danh sách phim:", error);
    return [];
  }
}

// ========================================
// 2. HIỂN THỊ DANH SÁCH PHIM TRONG SELECT
// ========================================
function chonMovie(movieList) {
  const select = document.querySelector("#clickMovies");

  select.innerHTML = `
    <option value="">-- Chọn phim bộ --</option>
    ${movieList
      .map(
        (movie) => `
          <option value="${movie.id}">
            ${movie.title}
          </option>
        `,
      )
      .join("")}
  `;
}

// ========================================
// 3. LẤY PHIM THEO ID
// ========================================
async function layMovieTheoId(id) {
  try {
    const res = await api.get("/movies");

    return res.find((item) => item.id == id) || null;
  } catch (error) {
    console.error("Lỗi lấy thông tin phim:", error);
    return null;
  }
}

// ========================================
// 4. LẤY CÁC MÙA CỦA PHIM
// ========================================
async function laySeriTheoId(id) {
  try {
    const res = await api.get("/season");

    return res.filter(
      (item) =>
        item.movieId == id &&
        item.status == true &&
        item.isDeleted !== true,
    );
  } catch (error) {
    console.error("Lỗi lấy danh sách mùa:", error);
    return [];
  }
}

// ========================================
// 5. LẤY THỂ LOẠI
// ========================================
async function layGenres() {
  try {
    const res = await api.get("/genres");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Lỗi lấy thể loại:", error);
    return [];
  }
}

// ========================================
// 6. HIỂN THỊ KHI CHỌN PHIM
// ========================================
document
  .querySelector("#clickMovies")
  .addEventListener("change", async (event) => {
    const id = event.target.value;
    const movieInfo = document.querySelector("#movieInfo");

    if (!id) {
      movieInfo.innerHTML = `
        <div class="rounded-2xl border border-dashed border-white/10 bg-[#151922] px-4 py-12 text-center">
          <span class="material-symbols-outlined text-4xl text-gray-600">
            movie
          </span>
          <p class="mt-3 text-sm font-semibold text-gray-300">
            Chưa chọn phim
          </p>
          <p class="mt-1 text-xs text-gray-500">
            Chọn phim bộ để xem thông tin và danh sách mùa.
          </p>
        </div>
      `;
      return;
    }

    movieInfo.innerHTML = `
      <div class="rounded-xl border border-white/10 bg-[#151922] p-6 text-center text-sm text-gray-400">
        Đang tải thông tin phim...
      </div>
    `;

    const [movie, genres, seri] = await Promise.all([
      layMovieTheoId(id),
      layGenres(),
      laySeriTheoId(id),
    ]);

    if (!movie) {
      movieInfo.innerHTML = `
        <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          Không tìm thấy thông tin phim.
        </div>
      `;
      return;
    }

    // ========================================
    // 7. XỬ LÝ THỂ LOẠI
    // ========================================
    const movieGenres = Array.isArray(movie.genre) ? movie.genre : [];

    const theLoai = genres.filter((genre) =>
      movieGenres.includes(String(genre.id)),
    );

    const renderTheLoai =
      theLoai.length > 0
        ? theLoai
            .map(
              (genre) => `
                <span class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                  ${genre.name}
                </span>
              `,
            )
            .join("")
        : `
            <span class="text-xs text-gray-500">
              Chưa có thể loại
            </span>
          `;

    // ========================================
    // 8. RENDER CÁC MÙA PHIM
    // ========================================
    const renderSeri =
      seri.length > 0
        ? seri
            .map(
              (season, index) => `
                <article class="group rounded-2xl border border-white/10 bg-[#151922] p-4 transition duration-200 hover:border-red-500/40 hover:bg-[#191e29] sm:p-5">

                  <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <!-- SỐ THỨ TỰ MÙA -->
                    <div class="flex min-w-0 flex-1 items-start gap-4">

                      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-xl font-bold text-red-400 transition group-hover:bg-red-500/15">
                        ${String(season.seasonNumber ?? index + 1).padStart(2, "0")}
                      </div>

                      <!-- THÔNG TIN MÙA -->
                      <div class="min-w-0 flex-1 space-y-3">

                        <div class="flex flex-wrap items-center gap-2">
                          <h5 class="break-words text-base font-bold leading-relaxed text-white transition group-hover:text-red-400">
                            ${season.title || `Mùa ${season.seasonNumber ?? index + 1}`}
                          </h5>

                          <span class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-400">
                            ID: ${season.id}
                          </span>
                        </div>

                        <p class="whitespace-pre-line break-words text-sm leading-6 text-gray-400">
                          ${season.description || "Chưa có mô tả cho mùa phim này."}
                        </p>

                        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                          <span class="inline-flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-base">
                              calendar_month
                            </span>
                            Mùa ${season.seasonNumber ?? index + 1}
                          </span>
                        </div>

                      </div>
                    </div>

                    <!-- NÚT THAO TÁC -->
                    <div class="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 lg:shrink-0 lg:border-0 lg:pt-0">

                      <a
                        href="/admin/episodes?season_id=${encodeURIComponent(season.id)}"
                        class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
                      >
                        <span class="material-symbols-outlined text-lg">
                          playlist_play
                        </span>
                        Quản lý tập
                      </a>

                      
<label
  for="modal-edit-toggle"
  data-edit-season
  data-season-id="${season.id}"
  title="Sửa mùa"
  class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
>
  <span class="material-symbols-outlined text-lg">
    edit
  </span>
</label>


                      <label
                        for="delete-alert-toggle"
                        data-delete-season
                        data-season-id="${season.id}"
                        title="Xóa mùa"
                        class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <span class="material-symbols-outlined text-lg">
                          delete
                        </span>
                      </label>

                    </div>
                  </div>
                </article>
              `,
            )
            .join("")
        : `
            <div class="rounded-2xl border border-dashed border-white/10 bg-[#151922] px-4 py-12 text-center">
              <span class="material-symbols-outlined text-4xl text-gray-600">
                video_library
              </span>

              <p class="mt-3 text-sm font-semibold text-gray-300">
                Chưa có mùa phim
              </p>

              <p class="mt-1 text-xs text-gray-500">
                Phim này hiện chưa có dữ liệu mùa.
              </p>
            </div>
          `;

    // ========================================
    // 9. RENDER GIAO DIỆN CHI TIẾT PHIM
    // ========================================
    movieInfo.innerHTML = `
      <div class="space-y-6">

        <!-- THÔNG TIN PHIM -->
        <section class="rounded-2xl border border-white/10 bg-[#151922] p-5 shadow-lg sm:p-6">

          <div class="flex flex-col gap-5 sm:flex-row sm:items-center">

            <!-- POSTER -->
            <div class="h-36 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg">
              <img
                src="${movie.poster || "/images/movies/default.jpg"}"
                alt="${movie.title}"
                class="h-full w-full object-cover"
                onerror="this.onerror=null;this.src='/images/movies/default.jpg'"
              />
            </div>

            <!-- THÔNG TIN -->
            <div class="min-w-0 flex-1 space-y-3">

              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md bg-red-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-400">
                  Phim đang chọn
                </span>

                <span class="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                  ID: ${movie.id}
                </span>

                <span class="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  ${movie.status || "Chưa cập nhật trạng thái"}
                </span>
              </div>

              <h3 class="break-words text-2xl font-bold tracking-tight text-white">
                ${movie.title}
              </h3>

              <div class="flex flex-wrap items-start gap-2 text-sm text-gray-400">
                <span class="pt-1 font-medium text-gray-300">
                  Thể loại:
                </span>

                <div class="flex flex-wrap gap-2">
                  ${renderTheLoai}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-3 text-sm text-gray-400">
                <span class="inline-flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg text-red-400">
                    movie
                  </span>
                  Phim bộ
                </span>

                <span class="inline-flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg text-red-400">
                    video_library
                  </span>
                  ${seri.length} mùa
                </span>

                ${
                  movie.releaseYear
                    ? `
                      <span class="inline-flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">
                          calendar_month
                        </span>
                        ${movie.releaseYear}
                      </span>
                    `
                    : ""
                }
              </div>

              ${
                movie.description
                  ? `
                    <p class="whitespace-pre-line break-words text-sm leading-6 text-gray-400">
                      ${movie.description}
                    </p>
                  `
                  : ""
              }

            </div>

            <!-- TRAILER -->
            <div class="sm:self-start">
              <label
                for="modal-trailer-toggle"
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-950/30 transition hover:bg-red-500 active:scale-[0.98]"
              >
                <span class="material-symbols-outlined text-xl">
                  play_circle
                </span>
                Xem trailer
              </label>
            </div>

          </div>
        </section>

        <!-- TIÊU ĐỀ DANH SÁCH MÙA -->
        <section class="space-y-4">

          <div class="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 class="text-lg font-bold text-white">
                Danh sách các mùa phim
              </h4>

              <p class="mt-1 text-sm text-gray-500">
                Thông tin mùa và đường dẫn quản lý tập phim.
              </p>
            </div>

            <span class="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400">
              <span class="material-symbols-outlined text-base text-red-400">
                video_library
              </span>
              ${seri.length} mùa
            </span>
          </div>

          <!-- DANH SÁCH MÙA -->
          <div class="space-y-4">
            ${renderSeri}
          </div>

        </section>

        <!-- GHI CHÚ -->
        <div class="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#10141c] p-4 sm:flex-row sm:items-start sm:justify-between">

          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined shrink-0 text-xl text-red-400">
              info
            </span>

            <p class="text-xs leading-6 text-gray-400">
              Thông tin mùa phim được hiển thị theo dữ liệu hiện có.
              Video và danh sách tập được quản lý tại mục
              <strong class="text-gray-200">Quản lý tập</strong>.
            </p>
          </div>

          <span class="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-400">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            Đã tải dữ liệu
          </span>

        </div>

      </div>
    `;
  });

// ========================================
// 10. KHỞI TẠO DANH SÁCH PHIM
// ========================================
const result = await movies();
chonMovie(result);

// ========================================
// 11. XÓA MỀM MÙA PHIM
// ========================================
let pendingDeleteSeasonId = null;

const deleteSeasonModal = document.querySelector("#delete-alert-toggle");
const btnConfirmDeleteSeason = document.querySelector(
  "#btn-confirm-delete-season",
);

async function thongBaoXoaSeason({ icon = "info", title, text = "" }) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonColor: "#dc2626",
    });
  }

  alert(text || title);
}

document.querySelector("#movieInfo")?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-season]");

  if (!deleteButton) return;

  pendingDeleteSeasonId = deleteButton.dataset.seasonId ?? null;
});

btnConfirmDeleteSeason?.addEventListener("click", async () => {
  if (!pendingDeleteSeasonId) {
    await thongBaoXoaSeason({
      icon: "warning",
      title: "Chưa chọn mùa phim",
      text: "Vui lòng chọn mùa phim cần xóa.",
    });

    return;
  }

  const seasonId = pendingDeleteSeasonId;

  if (btnConfirmDeleteSeason.disabled) return;

  btnConfirmDeleteSeason.disabled = true;

  try {
    await api.patch(`/season/${encodeURIComponent(seasonId)}`, {
      isDeleted: true,
    });

    pendingDeleteSeasonId = null;

    if (deleteSeasonModal) {
      deleteSeasonModal.checked = false;
    }

    await thongBaoXoaSeason({
      icon: "success",
      title: "Xóa mùa phim thành công",
      text: "Mùa phim đã được đánh dấu là đã xóa.",
    });

    document
      .querySelector("#clickMovies")
      ?.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("Lỗi xóa mềm mùa phim:", error);

    await thongBaoXoaSeason({
      icon: "error",
      title: "Không thể xóa mùa phim",
      text: "Vui lòng kiểm tra API /season và kết nối JSON Server.",
    });
  } finally {
    btnConfirmDeleteSeason.disabled = false;
  }
});
