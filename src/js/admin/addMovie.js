import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();

// ======================================================
// TẠO SLUG
// ======================================================

function createSlug(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ======================================================
// THỂ LOẠI
// ======================================================
// movies.genre trong db.json là MẢNG id (một phim có thể thuộc nhiều thể loại:
// "genre": [1, 5, 7]). Vì vậy form dùng nhiều checkbox, không dùng <select>
// đơn, và payload luôn gửi mảng — kể cả khi không chọn thì gửi [].

/** Đọc các thể loại đang được tick, trả về mảng id. */
function getSelectedGenreIds() {
  return Array.from(
    document.querySelectorAll('#addMovieForm input[name="genre"]:checked'),
  ).map((box) => box.value);
}

// ======================================================
// TRẠNG THÁI / SỐ
// ======================================================

/** db.json chỉ dùng "published" và "Inactive" (xoá mềm). */
const MOVIE_STATUSES = [
  { value: "published", label: "🟢 Đã xuất bản" },
  { value: "Inactive", label: "🔴 Đã ẩn" },
];

/** Trạng thái mặc định khi thêm mới. */
const DEFAULT_STATUS = "published";

/**
 * db.json lưu year/duration là NUMBER (thiếu thì 0), không phải null/string.
 * Ô input rỗng -> 0. Trả về NaN nếu người dùng gõ sai kiểu số.
 */
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

/**
 * db.json lưu createdAt dạng "YYYY-MM-DD" theo GIỜ ĐỊA PHƯƠNG.
 * toISOString() dùng UTC nên có thể lệch ngày, nên format thủ công.
 */
function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
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

    const genresData = Array.isArray(resGenres)
      ? resGenres
      : Array.isArray(resGenres?.data)
        ? resGenres.data
        : [];

    // ==================================================
    // FORM
    // ==================================================

    const statusOptions = MOVIE_STATUSES.map(
      (item) => `
        <option
          value="${item.value}"
          ${item.value === DEFAULT_STATUS ? "selected" : ""}
        >
          ${item.label}
        </option>
      `,
    ).join("");

    const genreCheckboxes = genresData
      .map(
        (genre) => `
          <label
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl
                   bg-zinc-950 border border-zinc-800
                   text-zinc-300 text-sm cursor-pointer
                   hover:border-zinc-700 transition-colors"
          >
            <input
              type="checkbox"
              name="genre"
              value="${genre.id}"
              class="w-4 h-4 accent-brand cursor-pointer"
            />

            <span>${genre.name}</span>
          </label>
        `,
      )
      .join("");

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
                <span class="text-zinc-600 normal-case tracking-normal">
                  (có thể chọn nhiều)
                </span>
              </label>

              <div
                id="genre"
                class="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                ${genreCheckboxes}
              </div>

              <p class="text-[11px] text-zinc-500 mt-1.5">
                Phim được lưu với <code>genre</code> là mảng id thể loại.
              </p>

            </div>


            <!-- NĂM + THỜI LƯỢNG + CHẤT LƯỢNG -->

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

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


              <div>

                <label
                  for="quality"
                  class="block mb-2 text-xs font-semibold
                  uppercase tracking-wider text-zinc-400"
                >
                  Chất lượng
                </label>

                <select
                  id="quality"
                  name="quality"
                  class="w-full px-3 py-2.5 rounded-xl
                  bg-zinc-950 border border-zinc-800
                  text-white text-sm
                  focus:outline-none focus:border-brand"
                >

                  <option value="">-- Không có --</option>
                  <option value="hd">HD (720p)</option>
                  <option value="full hd">Full HD (1080p)</option>
                  <option value="4k">4K Ultra HD</option>

                </select>

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

              ${statusOptions}

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

  // movies.genre là mảng id -> đọc từ các checkbox đã tick.
  const genreIds = getSelectedGenreIds();

  const year = parseNumberInRange(readNumber("year"), 1900, 2100);

  const duration = parseNumberInRange(readNumber("duration"), 0);

  // ====================================================
  // VALIDATE
  // ====================================================
  // Chỉ `title` là bắt buộc. db.json có phim thiếu thể loại/năm/thời lượng
  // (genre: [], year: 0, duration: 0) nên các ô còn lại được để trống.

  if (!title) {
    Swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng nhập tên phim!",
    });

    return;
  }

  if (!createSlug(title)) {
    Swal.fire({
      icon: "warning",
      title: "Tên phim không hợp lệ",
      text: "Tên phim cần có ít nhất một chữ cái hoặc số để tạo slug.",
    });

    return;
  }

  if (Number.isNaN(year)) {
    Swal.fire({
      icon: "warning",
      title: "Năm phát hành không hợp lệ",
      text: "Năm phải là số từ 1900 đến 2100.",
    });

    return;
  }

  if (Number.isNaN(duration)) {
    Swal.fire({
      icon: "warning",
      title: "Thời lượng không hợp lệ",
      text: "Thời lượng phải là số phút lớn hơn hoặc bằng 0.",
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
    // Không gửi `id`: json-server tự sinh id (randomBytes(8) base64url, 11 ký tự)
    // đúng như các phim id nanoid sẵn có trong db.json.
    // `year`/`duration` luôn là NUMBER (thiếu -> 0), không dùng null.
    // `genre` luôn là MẢNG id (có thể rỗng).

    const quality = document.getElementById("quality").value;

    const payload = {
      title: title,

      slug: createSlug(title),

      description: document.getElementById("description").value.trim(),

      genre: genreIds,

      poster: posterUrl,

      backdrop: backdropUrl,

      year: year,

      duration: duration,

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

      createdAt: toDateString(new Date()),

      // quality là field tuỳ chọn trong db.json: chỉ ghi khi thật sự chọn.
      ...(quality ? { quality: quality } : {}),
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
