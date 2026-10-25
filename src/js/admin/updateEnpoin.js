import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

// Chỉ Admin/Staff được khởi tạo logic quản trị tập phim.
await kiemTraDangNhapAdmin();

// ==================================================
// 1. PHẦN TỬ DOM CỦA MODAL CHỈNH SỬA TẬP PHIM
// ==================================================
const modalEditEpisode = document.getElementById("modal-edit-episode");
const formEditEpisode = document.getElementById("form-edit-episode");
const btnCloseEditEpisode = document.getElementById("btn-close-edit-episode");
const btnCancelEditEpisode = document.getElementById("btn-cancel-edit-episode");

const editEpisodeId = document.getElementById("edit-episode-id");
const editEpisodeSeasonId = document.getElementById("edit-episode-season-id");
const editEpisodeNumber = document.getElementById("edit-episode-number");
const editEpisodeTitle = document.getElementById("edit-episode-title");
const editEpisodeDescription = document.getElementById(
  "edit-episode-description",
);
const editEpisodeVideo = document.getElementById("edit-episode-video");
const editEpisodeVideoFile = document.getElementById(
  "edit-episode-video-file",
);
const editEpisodeThumbnail = document.getElementById(
  "edit-episode-thumbnail",
);
const editEpisodeThumbnailFile = document.getElementById(
  "edit-episode-thumbnail-file",
);
const editEpisodeDuration = document.getElementById("edit-episode-duration");
const editEpisodeReleaseDate = document.getElementById(
  "edit-episode-release-date",
);
const editEpisodeStatus = document.getElementById("edit-episode-status");

// ==================================================
// 2. THÔNG BÁO
// ==================================================
async function thongBaoTap({ icon = "info", title, text = "" }) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonColor: "#e50914",
    });
  }

  alert(text || title);
}

// ==================================================
// 3. TIỆN ÍCH
// ==================================================
function ganGiaTri(element, value) {
  if (!element) return;
  element.value = value ?? "";
}

function laAnhHopLe(file) {
  return Boolean(file && file.type.startsWith("image/"));
}

function laVideoHopLe(file) {
  return Boolean(file && file.type.startsWith("video/"));
}

// Chuẩn hóa trạng thái về boolean (dữ liệu cũ có thể là chuỗi).
function laHoatDong(status) {
  return !(
    status === false ||
    String(status).toLowerCase() === "false" ||
    String(status).toLowerCase() === "inactive"
  );
}

// ==================================================
// 4. UPLOAD FILE (dùng endpoint hiện có của dự án)
// ==================================================
async function uploadFile(file, type) {
  const uploadUrl =
    type === "image" ? "/api/upload-image" : "/api/upload-video";

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success || !result.url) {
    throw new Error(
      result.message || `Upload file thất bại (${response.status}).`,
    );
  }

  return result.url;
}

// Xóa file cũ trên server (chỉ khi file nằm trong public/, không xóa link online).
async function xoaFileCu(filePath) {
  if (!filePath) return;

  const response = await fetch("/api/delete-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filePath }),
  });

  if (!response.ok) {
    throw new Error("Không thể xóa file cũ.");
  }

  const result = await response.json().catch(() => ({}));

  if (!result.success) {
    throw new Error(result.message || "Xóa file cũ thất bại.");
  }
}

// ==================================================
// 5. MỞ MODAL CHỈNH SỬA VỚI DỮ LIỆU HIỆN TẠI
// ==================================================
function moModalSuaTap(tap) {
  if (!tap || !modalEditEpisode) return;

  ganGiaTri(editEpisodeId, tap.id);
  ganGiaTri(editEpisodeSeasonId, tap.seasonId);
  ganGiaTri(editEpisodeNumber, tap.episodeNumber);
  ganGiaTri(editEpisodeTitle, tap.title);
  ganGiaTri(editEpisodeDescription, tap.description);
  ganGiaTri(editEpisodeVideo, tap.video);
  ganGiaTri(editEpisodeThumbnail, tap.thumbnail);
  ganGiaTri(editEpisodeDuration, Number(tap.duration) || 0);
  ganGiaTri(editEpisodeReleaseDate, tap.releaseDate);
  ganGiaTri(editEpisodeStatus, laHoatDong(tap.status) ? "true" : "false");

  // Không giữ file đã chọn từ lần sửa trước.
  if (editEpisodeVideoFile) editEpisodeVideoFile.value = "";
  if (editEpisodeThumbnailFile) editEpisodeThumbnailFile.value = "";

  modalEditEpisode.classList.remove("hidden");
}

function dongModalSuaTap() {
  modalEditEpisode?.classList.add("hidden");
}

// ==================================================
// 6. SỰ KIỆN ĐÓNG MODAL
// ==================================================
btnCloseEditEpisode?.addEventListener("click", dongModalSuaTap);
btnCancelEditEpisode?.addEventListener("click", dongModalSuaTap);

modalEditEpisode?.addEventListener("click", (event) => {
  if (event.target === modalEditEpisode) {
    dongModalSuaTap();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    modalEditEpisode &&
    !modalEditEpisode.classList.contains("hidden")
  ) {
    dongModalSuaTap();
  }
});

// ==================================================
// 7. LƯU THAY ĐỔI
// ==================================================
formEditEpisode?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const episodeId = editEpisodeId?.value?.trim();

  if (!episodeId) {
    await thongBaoTap({
      icon: "error",
      title: "Thiếu ID tập phim",
      text: "Không xác định được tập phim cần cập nhật.",
    });
    return;
  }

  const seasonId = editEpisodeSeasonId?.value?.trim() ?? "";
  const episodeNumber = Number(editEpisodeNumber?.value);
  const title = editEpisodeTitle?.value.trim() ?? "";
  const description = editEpisodeDescription?.value.trim() ?? "";
  const videoPath = editEpisodeVideo?.value.trim() ?? "";
  const thumbnailPath = editEpisodeThumbnail?.value.trim() ?? "";
  const duration = Number(editEpisodeDuration?.value);
  const releaseDate = editEpisodeReleaseDate?.value?.trim() ?? "";
  const status = editEpisodeStatus?.value === "true";

  const videoFile = editEpisodeVideoFile?.files?.[0] || null;
  const thumbnailFile = editEpisodeThumbnailFile?.files?.[0] || null;

  // -------- Kiểm tra dữ liệu đầu vào --------
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    await thongBaoTap({
      icon: "warning",
      title: "Số tập không hợp lệ",
      text: "Số tập phải là số nguyên lớn hơn 0.",
    });
    return;
  }

  if (!title) {
    await thongBaoTap({
      icon: "warning",
      title: "Thiếu tên tập",
      text: "Vui lòng nhập tên tập phim.",
    });
    return;
  }

  if (!Number.isFinite(duration) || duration < 0) {
    await thongBaoTap({
      icon: "warning",
      title: "Thời lượng không hợp lệ",
      text: "Thời lượng phải là số không âm (phút).",
    });
    return;
  }

  if (videoFile && !laVideoHopLe(videoFile)) {
    await thongBaoTap({
      icon: "warning",
      title: "File không hợp lệ",
      text: "File video được chọn không phải định dạng video.",
    });
    return;
  }

  if (thumbnailFile && !laAnhHopLe(thumbnailFile)) {
    await thongBaoTap({
      icon: "warning",
      title: "File không hợp lệ",
      text: "File thumbnail được chọn không phải định dạng ảnh.",
    });
    return;
  }

  const submitButton = formEditEpisode.querySelector('button[type="submit"]');

  if (submitButton?.disabled) return;

  const originalButtonHTML = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Đang lưu...";
  }

  let newVideoUploaded = null;
  let newThumbnailUploaded = null;

  try {
    // -------- Kiểm tra trùng số tập trong cùng mùa --------
    const danhSachTap = await api.get("/episodes");

    if (!Array.isArray(danhSachTap)) {
      throw new Error("Dữ liệu tập phim không hợp lệ.");
    }

    const trungSoTap = danhSachTap.some(
      (tap) =>
        String(tap.id) !== String(episodeId) &&
        String(tap.seasonId) === String(seasonId) &&
        Number(tap.episodeNumber) === episodeNumber,
    );

    if (trungSoTap) {
      throw new Error(`Mùa phim này đã có tập ${episodeNumber}.`);
    }

    const oldEpisode =
      danhSachTap.find((tap) => String(tap.id) === String(episodeId)) || null;

    // -------- Upload file mới (nếu người dùng chọn) --------
    let video = videoPath;
    let thumbnail = thumbnailPath;

    if (videoFile) {
      newVideoUploaded = await uploadFile(videoFile, "video");
      video = newVideoUploaded;
    }

    if (thumbnailFile) {
      newThumbnailUploaded = await uploadFile(thumbnailFile, "image");
      thumbnail = newThumbnailUploaded;
    }

    // -------- Dữ liệu cập nhật (giữ nguyên id, seasonId và kiểu dữ liệu) --------
    const updateData = {
      id: episodeId,
      seasonId: String(seasonId),
      episodeNumber,
      title,
      description,
      video,
      thumbnail,
      duration,
      releaseDate,
      status,
    };

    await api.put(`/episodes/${encodeURIComponent(episodeId)}`, updateData);

    // -------- Xóa file cũ nếu đã thay bằng file mới --------
    if (newVideoUploaded && oldEpisode?.video && oldEpisode.video !== video) {
      try {
        await xoaFileCu(oldEpisode.video);
      } catch (deleteError) {
        console.error("Đã cập nhật nhưng không xóa được video cũ:", deleteError);
      }
    }

    if (
      newThumbnailUploaded &&
      oldEpisode?.thumbnail &&
      oldEpisode.thumbnail !== thumbnail
    ) {
      try {
        await xoaFileCu(oldEpisode.thumbnail);
      } catch (deleteError) {
        console.error(
          "Đã cập nhật nhưng không xóa được thumbnail cũ:",
          deleteError,
        );
      }
    }

    await thongBaoTap({
      icon: "success",
      title: "Cập nhật tập phim thành công",
      text: "Thông tin tập phim đã được lưu.",
    });

    dongModalSuaTap();

    // Yêu cầu trang quản lý tập phim tải lại danh sách.
    document.dispatchEvent(
      new CustomEvent("episode-updated", {
        detail: { action: "updated", id: episodeId, episode: updateData },
      }),
    );
  } catch (error) {
    console.error("Lỗi cập nhật tập phim:", error);

    // Giữ modal mở và không xóa dữ liệu người dùng đang nhập.
    await thongBaoTap({
      icon: "error",
      title: "Không thể cập nhật tập phim",
      text: error.message || "Vui lòng kiểm tra kết nối API.",
    });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHTML ?? "Lưu thay đổi";
    }
  }
});

// ==================================================
// 8. LẮNG NGHE NÚT "SỬA" TỪ BẢNG TẬP PHIM
// ==================================================
document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const nutSua = target.closest('button[data-action="edit-episode"]');

  if (!nutSua) return;

  event.preventDefault();

  const episodeId = nutSua.getAttribute("data-id");

  if (!episodeId) {
    thongBaoTap({
      icon: "error",
      title: "Thiếu ID tập phim",
      text: "Nút sửa không có thuộc tính data-id.",
    });
    return;
  }

  const tap = window.__tatCaTapPhim?.find(
    (item) => String(item.id) === String(episodeId),
  );

  if (!tap) {
    thongBaoTap({
      icon: "error",
      title: "Không tìm thấy tập phim",
      text: `Không tìm thấy tập phim ID ${episodeId}.`,
    });
    return;
  }

  moModalSuaTap(tap);
});
