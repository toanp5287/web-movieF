import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function getMovie(id) {
  try {
    const movie = await api.get(`/movies/${id}`);
    const resGenres = await api.get("/genres");

    if (!movie) {
      throw new Error("Không tìm thấy phim");
    }

    const normalizePath = (path) => {
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
    };

    const posterPath = normalizePath(movie.poster);
    const videoPath = normalizePath(movie.video);

    const currentGenreId = movie.genreId ?? movie.genre ?? "";

    const genreOptions = resGenres
      .map(
        (genre) => `
          <option
            value="${genre.id}"
            ${String(genre.id) === String(currentGenreId) ? "selected" : ""}
          >
            ${genre.name}
          </option>
        `,
      )
      .join("");

    document.getElementById("editMovieForm").innerHTML = `
  <!-- ID -->
  <div>
    <label class="block mb-2 text-sm font-semibold text-gray-200">
      ID phim
    </label>

    <input
      type="text"
      value="${movie.id || ""}"
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
      value="${movie.title || ""}"
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
      value="${movie.slug || ""}"
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
        value="${movie.director || ""}"
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
        value="${movie.country || ""}"
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
        value="${movie.year || ""}"
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
        min="1"
        value="${movie.duration || ""}"
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
          value="hd"
          ${movie.quality?.toLowerCase() === "hd" ? "selected" : ""}
        >
          HD (720p)
        </option>

        <option
          value="full hd"
          ${movie.quality?.toLowerCase() === "full hd" ? "selected" : ""}
        >
          Full HD (1080p)
        </option>

        <option
          value="4k"
          ${movie.quality?.toLowerCase() === "4k" ? "selected" : ""}
        >
          4K Ultra HD
        </option>
      </select>
    </div>

    <!-- Thể loại -->
    <div>
      <label
        for="genre"
        class="block mb-2 text-sm font-semibold text-gray-200"
      >
        Thể loại
      </label>

      <select
        id="genre"
        class="w-full px-4 py-3 rounded-xl
               bg-cinema-950
               border border-cinema-700/70
               text-white"
      >
        <option value="">
          -- Chọn thể loại --
        </option>

        ${genreOptions}
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
        <option
          value="published"
          ${movie.status === "published" ? "selected" : ""}
        >
          🟢 Published
        </option>

        <option
          value="active"
          ${movie.status === "active" ? "selected" : ""}
        >
          🟢 Active
        </option>

        <option
          value="inactive"
          ${movie.status === "inactive" ? "selected" : ""}
        >
          🔴 Inactive
        </option>
      </select>
    </div>
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
      value="${(movie.actors || []).join(", ")}"
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
              src="${posterPath}"
              alt="${movie.title || "Poster"}"
              class="w-32 aspect-[2/3]
                     object-cover
                     rounded-xl"
            />
          `
          : `
            <div
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

    <input
      type="hidden"
      id="poster"
      value="${movie.poster || ""}"
    />
  </div>

  <!-- Backdrop -->
  <div>
    <label
      for="backdrop"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Backdrop
    </label>

    <input
      id="backdrop"
      type="text"
      value="${movie.backdrop || ""}"
      placeholder="/images/movies/endgame-bg.jpg"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             focus:outline-none
             focus:border-brand"
    />
  </div>

  <!-- Trailer -->
  <div>
    <label
      for="trailer"
      class="block mb-2 text-sm font-semibold text-gray-200"
    >
      Trailer
    </label>

    <input
      id="trailer"
      type="text"
      value="${movie.trailer || ""}"
      placeholder="/videos/trailer/endgame.mp4"
      class="w-full px-4 py-3 rounded-xl
             bg-cinema-950
             border border-cinema-700/70
             text-white
             focus:outline-none
             focus:border-brand
             font-mono text-sm"
    />
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
                src="${videoPath}"
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

    <input
      type="hidden"
      id="video"
      value="${movie.video || ""}"
    />
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
    >${movie.description || ""}</textarea>
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
        value="${movie.views || 0}"
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
        value="${movie.createdAt || ""}"
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
    const posterFileName = document.getElementById("posterFileName");

    if (posterFile) {
      posterFile.addEventListener("change", () => {
        const file = posterFile.files[0];

        if (!file) return;

        const imageUrl = URL.createObjectURL(file);

        if (posterPreview) {
          posterPreview.src = imageUrl;
          posterPreview.classList.remove("hidden");
        }

        if (posterFileName) {
          posterFileName.textContent = `Đã chọn: ${file.name}`;
        }
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

        const videoUrl = URL.createObjectURL(file);

        videoFileName.textContent = `Đã chọn: ${file.name}`;

        newVideoPreview.src = videoUrl;

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

// ===============================
// UPLOAD FILE
// ===============================

async function editMovie(id, oldMovie) {
  try {
    const title = document.getElementById("title").value.trim();

    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const description = document.getElementById("description").value.trim();

    const director = document.getElementById("director").value.trim();

    const country = document.getElementById("country").value.trim();

    const year = Number(document.getElementById("year").value);

    const duration = Number(document.getElementById("duration").value);

    const quality = document.getElementById("quality").value;

    const genre = document.getElementById("genre").value;

    const status = document.getElementById("status").value;

    const actors = document
      .getElementById("actors")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const backdrop = document.getElementById("backdrop").value.trim();

    const trailer = document.getElementById("trailer").value.trim();

    // ===============================
    // FILE CŨ
    // ===============================
    const oldPoster = oldMovie.poster || "";
    const oldVideo = oldMovie.video || "";

    // ===============================
    // FILE MỚI
    // ===============================
    const posterFile = document.getElementById("posterFile").files[0];

    const videoFile = document.getElementById("videoFile").files[0];

    let poster = oldPoster;
    let video = oldVideo;

    // ===============================
    // POSTER MỚI
    // ===============================
    if (posterFile) {
      console.log("📸 Đang upload poster mới...");

      // Upload poster mới trước
      const newPoster = await uploadFile(posterFile, "image");

      // Xóa poster cũ
      if (oldPoster && oldPoster !== newPoster) {
        await deleteFile(oldPoster);
      }

      // Gán poster mới
      poster = newPoster;

      console.log("✅ Poster mới:", poster);
    }

    // ===============================
    // VIDEO MỚI
    // ===============================
    if (videoFile) {
      console.log("🎬 Đang upload video mới...");

      // Upload video mới trước
      const newVideo = await uploadFile(videoFile, "video");

      // Xóa video cũ
      if (oldVideo && oldVideo !== newVideo) {
        await deleteFile(oldVideo);
      }

      // Gán video mới
      video = newVideo;

      console.log("✅ Video mới:", video);
    }

    // ===============================
    // DATA PHIM
    // ===============================
    const movieData = {
      ...oldMovie,

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

      genre: genre ? Number(genre) : null,

      trailer: trailer,

      video: video,

      status: status,

      views: oldMovie.views || 0,

      quality: quality,

      createdAt: oldMovie.createdAt,
    };

    console.log("📦 DATA UPDATE:", movieData);

    // ===============================
    // UPDATE JSON SERVER
    // ===============================
    await api.put(`/movies/${id}`, movieData);

    // ===============================
    // THÔNG BÁO
    // ===============================
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

// ===============================
// XÓA FILE CŨ
// ===============================
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
// ===============================
// UPLOAD FILE
// ===============================
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
