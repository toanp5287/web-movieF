import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// ===============================================================
// TIỆN ÍCH — bám đúng cấu trúc data/db.json
// ===============================================================

/** db.json chỉ dùng "published" và "Inactive" (xoá mềm). */
const MOVIE_STATUSES = [
  { value: "published", label: "🟢 Đã xuất bản" },
  { value: "Inactive", label: "🔴 Đã ẩn" },
];

/** db.json lưu year/duration là NUMBER (thiếu thì 0), không phải null. */
function readNumber(inputId) {
  const raw = document.getElementById(inputId).value.trim();

  if (raw === "") return 0;

  return Number(raw);
}

/** Số trong khoảng [min, max]; trả NaN nếu sai kiểu hoặc ngoài khoảng. */
function parseNumberInRange(raw, min, max) {
  if (!Number.isFinite(raw)) return NaN;

  if (min !== undefined && raw < min) return NaN;

  if (max !== undefined && raw > max) return NaN;

  return raw;
}

function createSlug(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Escape ký tự HTML trước khi chèn text từ db.json vào innerHTML. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * movies.genre trong db.json là mảng id, nhưng record cũ có thể để
 * null / vắng mặt / scalar. Chuẩn hoá về mảng string để so sánh.
 */
function toGenreIdList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);

  if (value === null || value === undefined || value === "") return [];

  return [String(value).trim()];
}

function normalizePath(path) {
  if (!path) return "";

  // Link online
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Ví dụ:
  // images/movies/endgame.jpg
  // ../videos/phim-demo-1.mp4
  // /images/movies/endgame.jpg
  return "/" + path.replace(/^\/+/, "").replace(/^(\.\.\/)+/, "");
}

async function getMovie(id) {
  try {
    const movie = await api.get(`/movies/${id}`);
    const resGenres = await api.get("/genres");

    if (!movie) {
      throw new Error("Không tìm thấy phim");
    }

    const genresData = Array.isArray(resGenres)
      ? resGenres
      : Array.isArray(resGenres?.data)
        ? resGenres.data
        : [];

    const posterPath = normalizePath(movie.poster);
    const videoPath = normalizePath(movie.video);

    // Preload MỌI thể loại của phim (một phim có thể thuộc nhiều thể loại).
    const currentGenreIds = toGenreIdList(movie.genre);

    const genreCheckboxes = genresData
      .map((genre) => {
        const isChecked = currentGenreIds.includes(String(genre.id));

        return `
          <label
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl
                   bg-cinema-950 border border-cinema-700/70
                   text-gray-200 text-sm cursor-pointer
                   hover:border-cinema-600 transition-colors"
          >
            <input
              type="checkbox"
              name="genre"
              value="${escapeHtml(genre.id)}"
              ${isChecked ? "checked" : ""}
              class="w-4 h-4 accent-brand cursor-pointer"
            />

            <span>${escapeHtml(genre.name)}</span>
          </label>
        `;
      })
      .join("");

    const statusOptions = MOVIE_STATUSES.map(
      (item) => `
        <option
          value="${item.value}"
          ${movie.status === item.value ? "selected" : ""}
        >
          ${item.label}
        </option>
      `,
    ).join("");

    // ===============================================================
    // FORM
    // ===============================================================

    document.getElementById("editMovieForm").innerHTML = `
  <!-- ID -->
  <div>
    <label class="block mb-2 text-sm font-semibold text-gray-200">
      ID phim
    </label>

    <input
      type="text"
      value="${escapeHtml(movie.id)}"
      readonly
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-gray-500
             cursor-not-allowed"
    />
  </div>

  <!-- Tên phim -->
  <div>
    <label
      for="title"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Tên phim <span class="text-brand">*</span>
    </label>

    <input
      id="title"
      type="text"
      value="${escapeHtml(movie.title)}"
      required
      placeholder="Nhập tên phim..."
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand
             focus:ring-2
             focus:ring-brand/20"
    />
  </div>

  <!-- Slug -->
  <div>
    <label
      for="slug"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Slug
    </label>

    <input
      id="slug"
      type="text"
      value="${escapeHtml(movie.slug)}"
      placeholder="avengers-endgame"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand
             focus:ring-2
             focus:ring-brand/20"
    />

    <p class="text-xs text-gray-400 mt-2">
      Để trống để tự sinh slug từ tên phim.
    </p>
  </div>

  <!-- Thông tin -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

    <!-- Đạo diễn -->
    <div>
      <label
        for="director"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Đạo diễn
      </label>

      <input
        id="director"
        type="text"
        value="${escapeHtml(movie.director)}"
        placeholder="VD: Anthony Russo, Joe Russo"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white
               placeholder-gray-500
               focus:outline-none
               focus:border-brand"
      />
    </div>

    <!-- Quốc gia -->
    <div>
      <label
        for="country"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Quốc gia
      </label>

      <input
        id="country"
        type="text"
        value="${escapeHtml(movie.country)}"
        placeholder="VD: USA"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white
               placeholder-gray-500
               focus:outline-none
               focus:border-brand"
      />
    </div>

    <!-- Năm -->
    <div>
      <label
        for="year"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Năm phát hành
      </label>

      <input
        id="year"
        type="number"
        min="1900"
        max="2100"
        value="${escapeHtml(movie.year ?? 0) || ""}"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white
               focus:outline-none
               focus:border-brand"
      />
    </div>

    <!-- Thời lượng -->
    <div>
      <label
        for="duration"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Thời lượng (phút)
      </label>

      <input
        id="duration"
        type="number"
        min="0"
        value="${escapeHtml(movie.duration ?? 0) || ""}"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white
               focus:outline-none
               focus:border-brand"
      />
    </div>

    <!-- Chất lượng -->
    <div>
      <label
        for="quality"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Chất lượng
      </label>

      <select
        id="quality"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white"
      >
        <option
          value=""
          ${!movie.quality ? "selected" : ""}
        >
          -- Không có --
        </option>

        <option
          value="hd"
          ${String(movie.quality).toLowerCase() === "hd" ? "selected" : ""}
        >
          HD (720p)
        </option>

        <option
          value="full hd"
          ${String(movie.quality).toLowerCase() === "full hd" ? "selected" : ""}
        >
          Full HD (1080p)
        </option>

        <option
          value="4k"
          ${String(movie.quality).toLowerCase() === "4k" ? "selected" : ""}
        >
          4K Ultra HD
        </option>
      </select>
    </div>

    <!-- Trạng thái -->
    <div>
      <label
        for="status"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Trạng thái
      </label>

      <select
        id="status"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white"
      >
        ${statusOptions}
      </select>
    </div>
  </div>

  <!-- Thể loại -->
  <div>
    <label
      for="genre"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Thể loại
      <span class="text-gray-500 font-normal">
        (có thể chọn nhiều)
      </span>
    </label>

    <div
      id="genre"
      class="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      ${genreCheckboxes}
    </div>

    <p class="text-xs text-gray-400 mt-2">
      Lưu dưới dạng mảng id thể loại, ví dụ <code>[1, 5, 7]</code>.
    </p>
  </div>

  <!-- Diễn viên -->
  <div>
    <label
      for="actors"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Diễn viên
    </label>

    <input
      id="actors"
      type="text"
      value="${escapeHtml(
        Array.isArray(movie.actors) ? movie.actors.join(", ") : "",
      )}"
      placeholder="VD: Robert Downey Jr., Chris Evans"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand"
    />

    <p class="text-xs text-gray-400 mt-2">
      Các diễn viên cách nhau bằng dấu phẩy.
    </p>
  </div>

  <!-- Poster -->
  <div>
    <label
      for="posterFile"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Poster
    </label>

    <input
      id="posterFile"
      type="file"
      accept="image/*"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             file:mr-4
             file:py-2
             file:px-4
             file:rounded-lg
             file:border-0
             file:bg-brand
             file:text-white
             file:font-semibold"
    />

    <div class="mt-4">
      ${
        posterPath
          ? `
            <img
              id="posterPreview"
              src="${escapeHtml(posterPath)}"
              alt="${escapeHtml(movie.title)}"
              class="w-32 aspect-[2/3]
                     object-cover
                     rounded-xl"
            />
          `
          : `
            <div
              id="posterPlaceholder"
              class="w-32 aspect-[2/3]
                     rounded-xl
                     bg-cinema-950
                     flex items-center justify-center
                     text-xs text-gray-500"
            >
              Chưa có poster
            </div>
          `
      }
    </div>

    <p
      id="posterFileName"
      class="text-sm text-gray-400 mt-2"
    >
      Chưa chọn ảnh mới
    </p>
  </div>

  <!-- Backdrop -->
  <div>
    <label
      for="backdropFile"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Backdrop
    </label>

    <input
      id="backdropFile"
      type="file"
      accept="image/*"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             file:mr-4
             file:py-2
             file:px-4
             file:rounded-lg
             file:border-0
             file:bg-brand
             file:text-white
             file:font-semibold"
    />

    <input
      id="backdrop"
      type="text"
      value="${escapeHtml(movie.backdrop)}"
      placeholder="/images/movies/endgame-bg.jpg"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand"
    />

    <p class="text-xs text-gray-400 mt-2">
      Chọn file mới để thay ảnh nền, hoặc sửa đường dẫn bên dưới.
    </p>
  </div>

  <!-- Trailer -->
  <div>
    <label
      for="trailerFile"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Trailer
    </label>

    <input
      id="trailerFile"
      type="file"
      accept="video/mp4,video/webm,video/ogg"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             file:mr-4
             file:py-2
             file:px-4
             file:rounded-lg
             file:border-0
             file:bg-brand
             file:text-white
             file:font-semibold"
    />

    <input
      id="trailer"
      type="text"
      value="${escapeHtml(movie.trailer)}"
      placeholder="/videos/trailer/endgame.mp4"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand
             font-mono text-sm"
    />

    <p class="text-xs text-gray-400 mt-2">
      Chọn file mới để thay trailer, hoặc sửa đường dẫn bên dưới.
    </p>
  </div>

  <!-- Video -->
  <div>
    <label
      for="videoFile"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Video phim
    </label>

    <input
      id="videoFile"
      type="file"
      accept="video/mp4,video/webm,video/ogg"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             file:mr-4
             file:py-2
             file:px-4
             file:rounded-lg
             file:border-0
             file:bg-brand
             file:text-white
             file:font-semibold"
    />

    <p class="text-xs text-gray-400 mt-2">
      Chọn video mới nếu muốn thay video hiện tại.
    </p>

    ${
      videoPath
        ? `
          <div class="mt-4">

            <p class="text-sm text-gray-300 mb-2">
              Video hiện tại
            </p>

            <video
              id="currentVideoPreview"
              class="w-full max-h-80 rounded-xl bg-black"
              controls
              preload="metadata"
            >
              <source
                src="${escapeHtml(videoPath)}"
                type="video/mp4"
              />
            </video>

          </div>
        `
        : `
          <p class="text-sm text-gray-500 mt-4">
            Phim chưa có video.
          </p>
        `
    }

    <p
      id="videoFileName"
      class="text-sm text-gray-400 mt-3"
    >
      Chưa chọn video mới
    </p>

    <div
      id="newVideoPreviewContainer"
      class="hidden mt-4"
    >
      <p class="text-sm text-gray-300 mb-2">
        Xem trước video mới
      </p>

      <video
        id="newVideoPreview"
        class="w-full max-h-80 rounded-xl bg-black"
        controls
        playsinline
      ></video>
    </div>
  </div>

  <!-- Mô tả -->
  <div>
    <label
      for="description"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Mô tả
    </label>

    <textarea
      id="description"
      rows="6"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             placeholder-gray-500
             focus:outline-none
             focus:border-brand
             resize-y"
    >${escapeHtml(movie.description)}</textarea>
  </div>

  <!-- Views + CreatedAt: chỉ xem -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

    <div>
      <label
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Lượt xem
      </label>

      <input
        type="text"
        value="${escapeHtml(movie.views ?? 0)}"
        readonly
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-gray-500
               cursor-not-allowed"
      />
    </div>

    <div>
      <label
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Ngày tạo
      </label>

      <input
        type="text"
        value="${escapeHtml(movie.createdAt)}"
        readonly
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-gray-500
               cursor-not-allowed"
      />
    </div>

  </div>

  <!-- Button -->
  <div
    class="flex justify-end gap-3
           pt-6
           border-t border-cinema-800"
  >

    <a
      href="/admin"
      class="px-5 py-2.5 rounded-xl
             bg-cinema-800
             hover:bg-cinema-700
             text-gray-300
             border border-cinema-700"
    >
      Hủy bỏ
    </a>

    <button
      type="submit"
      class="inline-flex items-center gap-2
             px-6 py-2.5 rounded-xl
             bg-brand
             hover:bg-brand-hover
             text-white
             font-semibold
             shadow-lg"
    >
      <span class="material-symbols-outlined">
        save
      </span>

      Lưu thay đổi
    </button>

  </div>
`;

    document
      .getElementById("editMovieForm")
      .addEventListener("submit", (event) => {
        event.preventDefault();

        editMovie(id, movie);
      });

    // =========================
    // PREVIEW POSTER MỚI
    // =========================

    const posterFile = document.getElementById("posterFile");
    const posterPreview = document.getElementById("posterPreview");
    const posterPlaceholder = document.getElementById("posterPlaceholder");
    const posterFileName = document.getElementById("posterFileName");

    if (posterFile) {
      posterFile.addEventListener("change", () => {
        const file = posterFile.files[0];

        if (!file) return;

        posterFileName.textContent = `Đã chọn: ${file.name}`;

        const imageUrl = URL.createObjectURL(file);

        if (posterPreview) {
          posterPreview.src = imageUrl;
          posterPreview.classList.remove("hidden");
        }

        posterPlaceholder?.classList.add("hidden");
      });
    }

    // =========================
    // PREVIEW VIDEO MỚI
    // =========================

    const videoFile = document.getElementById("videoFile");
    const videoFileName = document.getElementById("videoFileName");
    const newVideoPreviewContainer = document.getElementById(
      "newVideoPreviewContainer",
    );
    const newVideoPreview = document.getElementById("newVideoPreview");

    if (videoFile) {
      videoFile.addEventListener("change", () => {
        const file = videoFile.files[0];

        if (!file) return;

        videoFileName.textContent = `Đã chọn: ${file.name}`;

        newVideoPreview.src = URL.createObjectURL(file);

        newVideoPreviewContainer.classList.remove("hidden");

        newVideoPreview.load();
      });
    }
  } catch (error) {
    console.error("Lỗi getMovie:", error);

    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Không thể lấy thông tin phim",
    });
  }
}

// ===============================================================
// LƯU THAY ĐỔI
// ===============================================================

async function editMovie(id, oldMovie) {
  try {
    const title = document.getElementById("title").value.trim();

    // Ô slug có sẵn giá trị cũ: chỉ tự sinh khi người dùng xoá hết.
    const slugField = document.getElementById("slug").value.trim();

    const slug = slugField || createSlug(title);

    const description = document.getElementById("description").value.trim();

    const director = document.getElementById("director").value.trim();

    const country = document.getElementById("country").value.trim();

    const year = parseNumberInRange(readNumber("year"), 1900, 2100);

    const duration = parseNumberInRange(readNumber("duration"), 0);

    const quality = document.getElementById("quality").value;

    // movies.genre là MẢNG id -> đọc từ các checkbox đã tick.
    const genre = Array.from(
      document.querySelectorAll('#editMovieForm input[name="genre"]:checked'),
    ).map((box) => box.value);

    const status = document.getElementById("status").value;

    const actors = document
      .getElementById("actors")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // ===============================================================
    // VALIDATE
    // ===============================================================

    if (!title) {
      throw new Error("Vui lòng nhập tên phim!");
    }

    if (!slug) {
      throw new Error("Slug không hợp lệ. Vui lòng nhập lại tên phim!");
    }

    if (Number.isNaN(year)) {
      throw new Error("Năm phát hành phải là số từ 1900 đến 2100!");
    }

    if (Number.isNaN(duration)) {
      throw new Error("Thời lượng phải là số phút lớn hơn hoặc bằng 0!");
    }

    if (!MOVIE_STATUSES.some((item) => item.value === status)) {
      throw new Error("Trạng thái không hợp lệ!");
    }

    // ===============================================================
    // FILE CŨ
    // ===============================================================
    const oldPoster = oldMovie.poster || "";
    const oldVideo = oldMovie.video || "";

    // ===============================================================
    // FILE MỚI
    // ===============================================================
    const posterFile = document.getElementById("posterFile").files[0];

    const videoFile = document.getElementById("videoFile").files[0];

    const backdropFile = document.getElementById("backdropFile").files[0];

    const trailerFile = document.getElementById("trailerFile").files[0];

    let poster = oldPoster;
    let video = oldVideo;

    let backdrop = document.getElementById("backdrop").value.trim();

    let trailer = document.getElementById("trailer").value.trim();

    // ===============================================================
    // POSTER MỚI
    // ===============================================================
    if (posterFile) {
      console.log("📸 Đang upload poster mới...");

      poster = await uploadFile(posterFile, "image");

      // Xóa poster cũ — chỉ khi không còn phim nào dùng chung file đó.
      await deleteFileIfUnused(oldPoster, poster, id);

      console.log("✅ Poster mới:", poster);
    }

    // ===============================================================
    // VIDEO MỚI
    // ===============================================================
    if (videoFile) {
      console.log("🎬 Đang upload video mới...");

      video = await uploadFile(videoFile, "video");

      await deleteFileIfUnused(oldVideo, video, id);

      console.log("✅ Video mới:", video);
    }

    // ===============================================================
    // BACKDROP / TRAILER MỚI
    // ===============================================================
    // Ảnh nền dùng chung endpoint upload-image với poster.
    if (backdropFile) {
      backdrop = await uploadFile(backdropFile, "image");
    }

    // Trailer dùng chung endpoint upload-video với video.
    if (trailerFile) {
      trailer = await uploadFile(trailerFile, "video");
    }

    // ===============================================================
    // DATA PHIM
    // ===============================================================
    // Giữ nguyên id / views / createdAt; các field khác lấy từ form.
    // `quality` là field tuỳ chọn: xoá hẳn key nếu không chọn.
    const movieData = {
      id: id,

      title: title,

      slug: slug,

      description: description,

      poster: poster,

      backdrop: backdrop,

      year: year,

      duration: duration,

      country: country,

      director: director,

      actors: actors,

      genre: genre,

      trailer: trailer,

      video: video,

      status: status,

      views: Number(oldMovie.views) || 0,

      createdAt: oldMovie.createdAt,

      ...(quality ? { quality: quality } : {}),
    };

    console.log("📦 DATA UPDATE:", movieData);

    // ===============================================================
    // UPDATE JSON SERVER
    // ===============================================================
    await api.put(`/movies/${id}`, movieData);

    // ===============================================================
    // THÔNG BÁO
    // ===============================================================
    await Swal.fire({
      icon: "success",
      title: "Cập nhật thành công",
      text: "Thông tin phim đã được cập nhật.",
      confirmButtonText: "OK",
    });

    window.location.replace("/admin");
  } catch (error) {
    console.error("❌ Lỗi editMovie:", error);

    Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: error.message || "Không thể cập nhật phim.",
    });
  }
}

// ===============================================================
// XÓA FILE CŨ
// ===============================================================

/**
 * Xoá file cũ sau khi thay media, NHƯNG bỏ qua nếu phim khác vẫn đang
 * dùng chung file đó (ví dụ /videos/no-video.mp4 được nhiều phim trỏ tới).
 */
async function deleteFileIfUnused(filePath, newPath, currentId) {
  if (!filePath) return;

  if (filePath === newPath) return;

  // Không xóa link online
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return;
  }

  const stillUsed = await isUsedByOtherMovies(filePath, currentId);

  if (stillUsed) {
    console.log("⚠️ GIỮ FILE ĐANG DÙNG CHUNG:", filePath);

    return;
  }

  await deleteFile(filePath);
}

/** true nếu còn phim khác (khác currentId) trỏ tới filePath. */
async function isUsedByOtherMovies(filePath, currentId) {
  try {
    const res = await api.get("/movies");

    if (!Array.isArray(res)) return false;

    return res.some((movie) => {
      if (String(movie.id) === String(currentId)) return false;

      return (
        movie.poster === filePath ||
        movie.video === filePath ||
        movie.backdrop === filePath ||
        movie.trailer === filePath
      );
    });
  } catch (error) {
    // Không xác minh được thì giữ file an toàn hơn là xoá nhầm.
    console.warn("Không kiểm tra được file dùng chung, giữ lại:", filePath);

    return true;
  }
}

async function deleteFile(filePath) {
  if (!filePath) return;

  // Không xóa link online
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return;
  }

  const response = await fetch("/api/delete-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filePath,
    }),
  });

  if (!response.ok) {
    throw new Error("Không thể xóa file cũ!");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Không thể xóa file cũ!");
  }
}

// ===============================================================
// UPLOAD FILE
// ===============================================================

async function uploadFile(file, type) {
  if (!file) return "";

  const formData = new FormData();
  formData.append("file", file);

  const uploadUrl =
    type === "image" ? "/api/upload-image" : "/api/upload-video";

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload file thất bại!");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Upload file thất bại!");
  }

  return result.url;
}

getMovie(id);