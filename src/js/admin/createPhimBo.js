import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

// Chỉ Admin/Staff được khởi tạo logic quản trị tập phim.
await kiemTraDangNhapAdmin();

// ==================================================
// 1. LẤY ID MÙA PHIM TỪ URL
// Ví dụ: /admin/episodes?season_id=6
// ==================================================
const params = new URLSearchParams(window.location.search);
const seasonId = params.get("season_id");

// ==================================================
// 2. LẤY CÁC PHẦN TỬ HTML
// ==================================================
const btnAddEpisode = document.getElementById("btn-add-episode");
const modalAddEpisode = document.getElementById("modal-add-episode");
const btnCloseEpisode = document.getElementById("btn-close-episode");
const btnCancelEpisode = document.getElementById("btn-cancel-episode");
const formAddEpisode = document.getElementById("form-add-episode");

const episodeNumberInput = document.getElementById("episode-number");
const episodeTitleInput = document.getElementById("episode-title");
const episodeDescriptionInput = document.getElementById("episode-description");
const episodeVideoInput = document.getElementById("episode-video");
const episodeStatusInput = document.getElementById("episode-status");

// ==================================================
// 3. HIỂN THỊ THÔNG BÁO
// ==================================================
async function showEpisodeMessage(type, message) {
  if (window.Swal) {
    await window.Swal.fire({
      icon: type,
      title: type === "success" ? "Thành công" : "Có lỗi xảy ra",
      text: message,
      confirmButtonColor: "#e50914",
    });
    return;
  }

  window.alert(message);
}

// ==================================================
// 4. MỞ / ĐÓNG MODAL
// ==================================================
function openAddEpisodeModal() {
  if (!seasonId) {
    showEpisodeMessage(
      "error",
      "Không xác định được mùa phim. Vui lòng mở từ danh sách mùa phim.",
    );
    return;
  }

  modalAddEpisode?.classList.remove("hidden");
}

function closeAddEpisodeModal() {
  modalAddEpisode?.classList.add("hidden");
}

btnAddEpisode?.addEventListener("click", openAddEpisodeModal);
btnCloseEpisode?.addEventListener("click", closeAddEpisodeModal);
btnCancelEpisode?.addEventListener("click", closeAddEpisodeModal);

modalAddEpisode?.addEventListener("click", (event) => {
  if (event.target === modalAddEpisode) {
    closeAddEpisodeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    modalAddEpisode &&
    !modalAddEpisode.classList.contains("hidden")
  ) {
    closeAddEpisodeModal();
  }
});

// ==================================================
// 5. LẤY DANH SÁCH DỮ LIỆU
// ==================================================
async function getList(endpoint) {
  const data = await api.get(endpoint);

  if (!Array.isArray(data)) {
    throw new Error(`Dữ liệu ${endpoint} không hợp lệ.`);
  }

  return data;
}

// ==================================================
// 6. LẤY NGÀY HIỆN TẠI
// ==================================================
function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ==================================================
// 7. UPLOAD VIDEO VÀO public/videos/
// API đã được khai báo trong vite.config.js
// POST /api/upload-video
// ==================================================
async function uploadEpisodeVideo(file) {
  const formData = new FormData();
  formData.append("file", file);

  // Upload đến Vite server, không phải JSON Server cổng 3000
  const response = await fetch("/api/upload-video", {
    method: "POST",
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success || !result.url) {
    throw new Error(
      result.message || `Upload video thất bại (${response.status}).`,
    );
  }

  return result.url;
}
// ==================================================
// 8. XỬ LÝ THÊM TẬP PHIM
// Upload video thành công rồi mới lưu vào JSON Server
// ==================================================
formAddEpisode?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!seasonId) {
    await showEpisodeMessage("error", "Không xác định được mùa phim.");
    return;
  }

  const episodeNumber = Number(episodeNumberInput.value);
  const title = episodeTitleInput.value.trim();
  const description = episodeDescriptionInput.value.trim();
  const videoFile = episodeVideoInput.files?.[0];
  const status = episodeStatusInput.value === "true";

  // Kiểm tra số tập
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    await showEpisodeMessage("error", "Số tập phải là số nguyên lớn hơn 0.");
    return;
  }

  // Kiểm tra tên tập
  if (!title) {
    await showEpisodeMessage("error", "Vui lòng nhập tên tập phim.");
    return;
  }

  // Kiểm tra file video
  if (!videoFile) {
    await showEpisodeMessage("error", "Vui lòng chọn video tập phim.");
    return;
  }

  if (!videoFile.type.startsWith("video/")) {
    await showEpisodeMessage("error", "File được chọn không phải video.");
    return;
  }

  // Giới hạn 500 MB
  if (videoFile.size > 500 * 1024 * 1024) {
    await showEpisodeMessage("error", "Dung lượng video tối đa là 500 MB.");
    return;
  }

  const submitButton = formAddEpisode.querySelector('button[type="submit"]');

  if (!submitButton) return;

  const originalButtonContent = submitButton.innerHTML;

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Đang kiểm tra...";

    // ----------------------------------------------
    // BƯỚC 1: KIỂM TRA MÙA PHIM
    // ----------------------------------------------
    const seasons = await getList("/season");

    const selectedSeason = seasons.find(
      (season) => String(season.id) === String(seasonId),
    );

    if (!selectedSeason) {
      throw new Error("Mùa phim không tồn tại trong hệ thống.");
    }

    // ----------------------------------------------
    // BƯỚC 2: KIỂM TRA TRÙNG SỐ TẬP
    // ----------------------------------------------
    const episodes = await getList("/episodes");

    const duplicate = episodes.some(
      (episode) =>
        String(episode.seasonId) === String(seasonId) &&
        Number(episode.episodeNumber) === episodeNumber,
    );

    if (duplicate) {
      throw new Error(`Mùa phim này đã có tập ${episodeNumber}.`);
    }

    // ----------------------------------------------
    // BƯỚC 3: UPLOAD VIDEO THẬT
    // Vite + Multer lưu file vào public/videos/
    // ----------------------------------------------
    submitButton.textContent = "Đang tải video lên...";

    const videoUrl = await uploadEpisodeVideo(videoFile);

    // ----------------------------------------------
    // BƯỚC 4: TẠO DỮ LIỆU TẬP PHIM
    // Chỉ lưu URL, không lưu nội dung file video
    // ----------------------------------------------
    const newEpisode = {
      id: crypto.randomUUID(),
      seasonId: String(seasonId),
      episodeNumber,
      title,
      description,
      video: videoUrl,
      thumbnail: "",
      duration: 0,
      releaseDate: getLocalDate(),
      status,
    };

    // ----------------------------------------------
    // BƯỚC 5: LƯU VÀO JSON SERVER
    // ----------------------------------------------
    submitButton.textContent = "Đang lưu tập phim...";

    await api.post("/episodes", newEpisode);

    // ----------------------------------------------
    // BƯỚC 6: THÔNG BÁO THÀNH CÔNG
    // ----------------------------------------------
    await showEpisodeMessage(
      "success",
      "Đã upload video vào public/videos/ và lưu đường dẫn tập phim thành công.",
    );

    formAddEpisode.reset();
    closeAddEpisodeModal();

    document.dispatchEvent(
      new CustomEvent("episode-created", {
        detail: newEpisode,
      }),
    );
  } catch (error) {
    console.error("Lỗi thêm tập phim:", error);

    await showEpisodeMessage(
      "error",
      error.message || "Không thể thêm tập phim.",
    );
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonContent;
  }
});
