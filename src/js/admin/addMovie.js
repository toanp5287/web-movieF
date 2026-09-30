import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();

// ======================================================
// TẠO SLUG
// ======================================================

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ======================================================
// UPLOAD FILE
// ======================================================

async function uploadFile(file, type) {
  if (!file) {
    return "";
  }

  const formData = new FormData();

  formData.append("file", file);

  let uploadUrl = "";

  if (type === "image") {
    uploadUrl = "/api/upload-image";
  } else if (type === "video") {
    uploadUrl = "/api/upload-video";
  }

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

// ======================================================
// LOAD FORM
// ======================================================

async function initAddMovieForm() {
  const formContainer = document.getElementById("addMovieForm");

  if (!formContainer) {
    return;
  }

  try {
    // Lấy thể loại
    const resGenres = await api.get("/genres");

    const genresData = resGenres.data || resGenres;

    const genresOptions = genresData
      .map((genre) => {
        return `
          <option value="${genre.id}">
            ${genre.name}
          </option>
        `;
      })
      .join("");

    // ==================================================
    // FORM
    // ==================================================

    formContainer.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- CỘT TRÁI -->

        <div class="lg:col-span-2 space-y-6">

          <div
            class="bg-zinc-900/70 border border-zinc-800/80
            rounded-2xl p-6 sm:p-7 space-y-5"
          >

            <h2
              class="text-base font-bold text-zinc-100
              flex items-center gap-2 pb-3
              border-b border-zinc-800"
            >
              <span class="material-symbols-outlined text-brand">
                info
              </span>

              Thông tin phim
            </h2>


            <!-- TÊN PHIM -->

            <div>

              <label
                for="title"
                class="block mb-2 text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Tên phim
                <span class="text-brand">*</span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="VD: The Batman"
                class="w-full px-4 py-2.5 rounded-xl
                bg-zinc-950 border border-zinc-800
                text-white placeholder-zinc-600 text-sm
                focus:outline-none focus:border-brand"
              />

            </div>


            <!-- ĐẠO DIỄN + QUỐC GIA -->

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label
                  for="director"
                  class="block mb-2 text-xs font-semibold
                  uppercase tracking-wider text-zinc-400"
                >
                  Đạo diễn
                </label>

                <input
                  id="director"
                  name="director"
                  type="text"
                  placeholder="VD: Matt Reeves"
                  class="w-full px-4 py-2.5 rounded-xl
                  bg-zinc-950 border border-zinc-800
                  text-white placeholder-zinc-600 text-sm
                  focus:outline-none focus:border-brand"
                />

              </div>


              <div>

                <label
                  for="country"
                  class="block mb-2 text-xs font-semibold
                  uppercase tracking-wider text-zinc-400"
                >
                  Quốc gia
                </label>

                <input
                  id="country"
                  name="country"
                  type="text"
                  placeholder="VD: USA"
                  class="w-full px-4 py-2.5 rounded-xl
                  bg-zinc-950 border border-zinc-800
                  text-white placeholder-zinc-600 text-sm
                  focus:outline-none focus:border-brand"
                />

              </div>

            </div>


            <!-- THỂ LOẠI -->

            <div>

              <label
                for="genre"
                class="block mb-2 text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Thể loại
                <span class="text-brand">*</span>
              </label>

              <select
                id="genre"
                name="genre"
                required
                class="w-full px-3 py-2.5 rounded-xl
                bg-zinc-950 border border-zinc-800
                text-white text-sm
                focus:outline-none focus:border-brand"
              >

                <option value="">
                  -- Chọn thể loại --
                </option>

                ${genresOptions}

              </select>

            </div>


            <!-- NĂM + THỜI LƯỢNG -->

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label
                  for="year"
                  class="block mb-2 text-xs font-semibold
                  uppercase tracking-wider text-zinc-400"
                >
                  Năm phát hành
                </label>

                <input
                  id="year"
                  name="year"
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="2024"
                  class="w-full px-4 py-2.5 rounded-xl
                  bg-zinc-950 border border-zinc-800
                  text-white placeholder-zinc-600 text-sm"
                />

              </div>


              <div>

                <label
                  for="duration"
                  class="block mb-2 text-xs font-semibold
                  uppercase tracking-wider text-zinc-400"
                >
                  Thời lượng (phút)
                </label>

                <input
                  id="duration"
                  name="duration"
                  type="number"
                  min="1"
                  placeholder="120"
                  class="w-full px-4 py-2.5 rounded-xl
                  bg-zinc-950 border border-zinc-800
                  text-white placeholder-zinc-600 text-sm"
                />

              </div>

            </div>


            <!-- DIỄN VIÊN -->

            <div>

              <label
                for="actors"
                class="block mb-2 text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Diễn viên
              </label>

              <input
                id="actors"
                name="actors"
                type="text"
                placeholder="Robert Pattinson, Zoë Kravitz, Paul Dano"
                class="w-full px-4 py-2.5 rounded-xl
                bg-zinc-950 border border-zinc-800
                text-white placeholder-zinc-600 text-sm"
              />

              <p class="text-[11px] text-zinc-500 mt-1.5">
                Nhập danh sách cách nhau bằng dấu phẩy (,)
              </p>

            </div>


            <!-- MÔ TẢ -->

            <div>

              <label
                for="description"
                class="block mb-2 text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Mô tả
              </label>

              <textarea
                id="description"
                name="description"
                rows="4"
                placeholder="Tóm tắt cốt truyện phim..."
                class="w-full px-4 py-3 rounded-xl
                bg-zinc-950 border border-zinc-800
                text-white placeholder-zinc-600 text-sm
                resize-y"
              ></textarea>

            </div>

          </div>

        </div>


        <!-- CỘT PHẢI -->

        <div class="space-y-6">


          <!-- TRẠNG THÁI -->

          <div
            class="bg-zinc-900/70 border border-zinc-800/80
            rounded-2xl p-6 space-y-4"
          >

            <h2
              class="text-base font-bold text-zinc-100
              flex items-center gap-2 pb-3
              border-b border-zinc-800"
            >

              <span class="material-symbols-outlined text-brand">
                toggle_on
              </span>

              Trạng thái

            </h2>


            <select
              id="status"
              name="status"
              class="w-full px-3 py-2.5 rounded-xl
              bg-zinc-950 border border-zinc-800
              text-white text-sm"
            >

          <option value="published">🟢 Đã xuất bản</option>
<option value="draft">🟡 Bản nháp</option>
<option value="coming_soon">🔵 Sắp ra mắt</option>

              

            </select>

          </div>


          <!-- MEDIA -->

          <div
            class="bg-zinc-900/70 border border-zinc-800/80
            rounded-2xl p-6 space-y-5"
          >

            <h2
              class="text-base font-bold text-zinc-100
              flex items-center gap-2 pb-3
              border-b border-zinc-800"
            >

              <span class="material-symbols-outlined text-brand">
                video_library
              </span>

              Tài nguyên Media

            </h2>


            <!-- POSTER -->

            <div class="space-y-2">

              <label
                for="posterFile"
                class="text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Poster
              </label>

              <div class="flex items-start gap-3">

                <div
                  class="w-14 h-20 shrink-0 rounded-lg
                  overflow-hidden border border-dashed
                  border-zinc-700 bg-zinc-950
                  flex items-center justify-center"
                >

                  <img
                    id="posterPreview"
                    src=""
                    alt="Poster"
                    class="w-full h-full object-cover hidden"
                  />

                  <span
                    id="posterPlaceholder"
                    class="material-symbols-outlined
                    text-zinc-600"
                  >
                    image
                  </span>

                </div>


                <div class="flex-1">

                  <input
                    id="posterFile"
                    type="file"
                    accept="image/*"
                    class="w-full text-xs text-zinc-400"
                  />

                  <input
                    id="poster"
                    name="poster"
                    type="text"
                    placeholder="Hoặc nhập URL ảnh..."
                    class="w-full mt-2 px-3 py-1.5 rounded-lg
                    bg-zinc-950 border border-zinc-800
                    text-white text-xs"
                  />

                </div>

              </div>

            </div>


            <!-- BACKDROP -->

            <div
              class="space-y-2 pt-3
              border-t border-zinc-800/50"
            >

              <label
                for="backdropFile"
                class="block text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Backdrop
              </label>

              <div class="flex items-start gap-3">

                <div
                  class="w-20 h-12 shrink-0 rounded-lg
                  overflow-hidden border border-dashed
                  border-zinc-700 bg-zinc-950"
                >

                  <img
                    id="backdropPreview"
                    src=""
                    alt="Backdrop"
                    class="w-full h-full object-cover hidden"
                  />

                  <span
                    id="backdropPlaceholder"
                    class="material-symbols-outlined
                    text-zinc-600"
                  >
                    panorama
                  </span>

                </div>


                <div class="flex-1">

                  <input
                    id="backdropFile"
                    type="file"
                    accept="image/*"
                    class="w-full text-xs text-zinc-400"
                  />

                  <input
                    id="backdrop"
                    name="backdrop"
                    type="text"
                    placeholder="Hoặc nhập URL ảnh..."
                    class="w-full mt-2 px-3 py-1.5 rounded-lg
                    bg-zinc-950 border border-zinc-800
                    text-white text-xs"
                  />

                </div>

              </div>

            </div>


            <!-- TRAILER -->

            <div
              class="space-y-2 pt-3
              border-t border-zinc-800/50"
            >

              <label
                for="trailerFile"
                class="block text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Trailer
              </label>

              <input
                id="trailerFile"
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                class="w-full text-xs text-zinc-400"
              />

              <video
                id="trailerPreview"
                class="w-full max-h-40 rounded-lg
                hidden bg-black"
                controls
              ></video>

              <input
                id="trailer"
                name="trailer"
                type="text"
                placeholder="Hoặc nhập URL trailer..."
                class="w-full px-3 py-1.5 rounded-lg
                bg-zinc-950 border border-zinc-800
                text-white text-xs"
              />

            </div>


            <!-- VIDEO PHIM -->

            <div
              class="space-y-2 pt-3
              border-t border-zinc-800/50"
            >

              <label
                for="videoFile"
                class="block text-xs font-semibold
                uppercase tracking-wider text-zinc-400"
              >
                Video phim
              </label>

              <input
                id="videoFile"
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                class="w-full text-xs text-zinc-400"
              />

              <video
                id="videoPreview"
                class="w-full max-h-40 rounded-lg
                hidden bg-black"
                controls
              ></video>

              <input
                id="video"
                name="video"
                type="text"
                placeholder="Hoặc nhập URL video..."
                class="w-full px-3 py-1.5 rounded-lg
                bg-zinc-950 border border-zinc-800
                text-white text-xs"
              />

            </div>

          </div>

        </div>

      </div>


      <!-- ACTION BAR -->

      <div
        class="sticky bottom-4 z-20
        flex items-center justify-end gap-3 p-4 mt-6
        rounded-2xl bg-zinc-900/90
        border border-zinc-800"
      >

        <a
          href="/admin"
          class="px-5 py-2.5 rounded-xl
          bg-zinc-800 hover:bg-zinc-700
          text-zinc-300"
        >
          Hủy bỏ
        </a>


        <button
          type="submit"
          class="inline-flex items-center gap-2
          px-6 py-2.5 rounded-xl
          bg-brand text-white text-sm font-semibold"
        >

          <span class="material-symbols-outlined">
            save
          </span>

          Lưu phim

        </button>

      </div>
    `;

    setupMediaPreview();

    formContainer.addEventListener("submit", handleSubmitForm);
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu form:", error);

    Swal.fire({
      icon: "error",
      title: "Lỗi tải dữ liệu",
      text: "Không thể lấy danh sách thể loại!",
    });
  }
}

// ======================================================
// PREVIEW ẢNH
// ======================================================

function setupImage(fileInputId, previewImgId, placeholderId) {
  const input = document.getElementById(fileInputId);

  const preview = document.getElementById(previewImgId);

  const placeholder = document.getElementById(placeholderId);

  input?.addEventListener("change", () => {
    const file = input.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "File không hợp lệ",
        text: "Vui lòng chọn file ảnh!",
      });

      input.value = "";

      return;
    }

    const url = URL.createObjectURL(file);

    preview.src = url;

    preview.classList.remove("hidden");

    placeholder?.classList.add("hidden");
  });
}

// ======================================================
// PREVIEW VIDEO
// ======================================================

function setupVideo(fileInputId, previewVideoId) {
  const input = document.getElementById(fileInputId);

  const preview = document.getElementById(previewVideoId);

  input?.addEventListener("change", () => {
    const file = input.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      Swal.fire({
        icon: "warning",
        title: "File không hợp lệ",
        text: "Vui lòng chọn file video!",
      });

      input.value = "";

      return;
    }

    const url = URL.createObjectURL(file);

    preview.src = url;

    preview.classList.remove("hidden");

    preview.load();
  });
}

// ======================================================
// SETUP PREVIEW
// ======================================================

function setupMediaPreview() {
  setupImage("posterFile", "posterPreview", "posterPlaceholder");

  setupImage("backdropFile", "backdropPreview", "backdropPlaceholder");

  setupVideo("trailerFile", "trailerPreview");

  setupVideo("videoFile", "videoPreview");
}

// ======================================================
// SUBMIT FORM
// ======================================================

async function handleSubmitForm(e) {
  e.preventDefault();

  // ====================================================
  // LẤY DỮ LIỆU
  // ====================================================

  const title = document.getElementById("title").value.trim();

  const genreId = document.getElementById("genre").value;

  // ====================================================
  // VALIDATE
  // ====================================================

  if (!title) {
    Swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng nhập tên phim!",
    });

    return;
  }

  if (!genreId) {
    Swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng chọn thể loại phim!",
    });

    return;
  }

  // ====================================================
  // LẤY FILE
  // ====================================================

  const posterFile = document.getElementById("posterFile").files[0];

  const backdropFile = document.getElementById("backdropFile").files[0];

  const trailerFile = document.getElementById("trailerFile").files[0];

  const videoFile = document.getElementById("videoFile").files[0];

  try {
    // ==================================================
    // HIỆN LOADING
    // ==================================================

    Swal.fire({
      title: "Đang lưu phim...",
      text: "Đang upload file, vui lòng chờ.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // ==================================================
    // UPLOAD POSTER
    // ==================================================

    let posterUrl = "";

    if (posterFile) {
      posterUrl = await uploadFile(posterFile, "image");
    } else {
      posterUrl = document.getElementById("poster").value.trim();
    }

    // ==================================================
    // UPLOAD BACKDROP
    // ==================================================

    let backdropUrl = "";

    if (backdropFile) {
      backdropUrl = await uploadFile(backdropFile, "image");
    } else {
      backdropUrl = document.getElementById("backdrop").value.trim();
    }

    // ==================================================
    // UPLOAD TRAILER
    // ==================================================

    let trailerUrl = "";

    if (trailerFile) {
      trailerUrl = await uploadFile(trailerFile, "video");
    } else {
      trailerUrl = document.getElementById("trailer").value.trim();
    }

    // ==================================================
    // UPLOAD VIDEO
    // ==================================================

    let videoUrl = "";

    if (videoFile) {
      videoUrl = await uploadFile(videoFile, "video");
    } else {
      videoUrl = document.getElementById("video").value.trim();
    }

    // ==================================================
    // TẠO PAYLOAD
    // ==================================================

    const payload = {
      title: title,

      slug: createSlug(title),

      description: document.getElementById("description").value.trim(),

      genre: genreId,

      poster: posterUrl,

      backdrop: backdropUrl,

      year: Number(document.getElementById("year").value) || null,

      duration: Number(document.getElementById("duration").value) || null,

      country: document.getElementById("country").value.trim(),

      director: document.getElementById("director").value.trim(),

      actors: document
        .getElementById("actors")
        .value.split(",")
        .map((actor) => actor.trim())
        .filter((actor) => actor !== ""),

      trailer: trailerUrl || "",

      video: videoUrl || "/videos/no-video.mp4",

      status: document.getElementById("status").value,

      views: 0,

      createdAt: new Date().toISOString().split("T")[0],
    };

    // ==================================================
    // LƯU VÀO JSON SERVER
    // ==================================================

    await api.post("/movies", payload);

    // ==================================================
    // THÀNH CÔNG
    // ==================================================

    const result = await Swal.fire({
      icon: "success",
      title: "Thành công!",
      text: "Phim đã được thêm vào hệ thống.",
      confirmButtonText: "OK",
      allowOutsideClick: false,
    });

    // ==================================================
    // QUAY VỀ ADMIN
    // ==================================================

    window.location.replace("/admin");
  } catch (error) {
    console.error("Lỗi thêm phim:", error);

    Swal.fire({
      icon: "error",
      title: "Thêm phim thất bại",
      text: error.message || "Không thể thêm phim!",
    });
  }
}

// ======================================================
// CHẠY
// ======================================================

initAddMovieForm();
