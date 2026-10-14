import api from "../api";

// Các phần tử trong form HTML
const editSeasonForm = document.getElementById("form-edit-season");
const editSeasonModal = document.getElementById("modal-edit-toggle");

const editSeasonFileInput = document.getElementById("editSeasonPosterFile");
const editSeasonPosterInput = document.getElementById("editSeasonPoster");
const editSeasonPreview = document.getElementById("editSeasonPosterPreview");
const editSeasonPreviewImage = document.getElementById(
  "editSeasonPosterPreviewImage",
);

// Chuẩn hóa dữ liệu trả về từ API
function layMangSeason(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

// Thông báo
async function thongBaoSeason(title, icon = "info") {
  if (window.Swal) {
    await window.Swal.fire({
      title,
      icon,
      confirmButtonText: "Đóng",
    });
  } else {
    alert(title);
  }
}

// Gán giá trị vào input theo ID
function ganGiaTriSeason(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    console.error(`Không tìm thấy phần tử #${id}`);
    return;
  }

  element.value = value ?? "";
}

// Xem trước poster
function hienThiPosterSeason(src) {
  if (!editSeasonPreview || !editSeasonPreviewImage) return;

  if (!src) {
    editSeasonPreview.classList.add("hidden");
    editSeasonPreviewImage.removeAttribute("src");
    return;
  }

  editSeasonPreviewImage.src = src;
  editSeasonPreview.classList.remove("hidden");
}

// Tải thông tin một mùa phim từ API
async function laySeasonTheoId(seasonId) {
  const response = await api.get("/season");
  const seasons = layMangSeason(response);

  return seasons.find((season) => String(season.id) === String(seasonId));
}

// BẤM SỬA: lấy dữ liệu và đổ vào form
document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const editButton = target.closest("[data-edit-season]");

  if (!editButton) return;

  event.preventDefault();

  const seasonId = editButton.getAttribute("data-season-id");

  if (!seasonId) {
    await thongBaoSeason("Không tìm thấy ID mùa phim.", "error");
    return;
  }

  try {
    const season = await laySeasonTheoId(seasonId);

    if (!season) {
      await thongBaoSeason(`Không tìm thấy mùa phim ID ${seasonId}.`, "error");
      return;
    }

    // Đổ dữ liệu vào đúng các ID trong HTML của mày
    ganGiaTriSeason("editSeasonId", season.id);
    ganGiaTriSeason("editSeasonMovieId", season.movieId);
    ganGiaTriSeason("editSeasonNumber", season.seasonNumber);
    ganGiaTriSeason("editSeasonTitle", season.title);
    ganGiaTriSeason("editSeasonDescription", season.description);
    ganGiaTriSeason("editSeasonPoster", season.poster);
    ganGiaTriSeason("editSeasonReleaseYear", season.releaseYear);

    // Hỗ trợ status dạng boolean hoặc chuỗi
    const status = season.status;

    ganGiaTriSeason(
      "editSeasonStatus",
      status === false ||
        String(status).toLowerCase() === "false" ||
        String(status).toLowerCase() === "inactive"
        ? "false"
        : "true",
    );

    // Không giữ file ảnh đã chọn từ lần sửa trước
    if (editSeasonFileInput) {
      editSeasonFileInput.value = "";
    }

    // Hiện poster đang lưu
    hienThiPosterSeason(season.poster || "");

    // Mở modal sau khi đã đổ dữ liệu
    if (editSeasonModal) {
      editSeasonModal.checked = true;
    }

    console.log("Dữ liệu mùa phim đã đổ vào form:", season);
  } catch (error) {
    console.error("Lỗi tải mùa phim:", error);

    await thongBaoSeason(
      "Không thể tải dữ liệu mùa phim. Kiểm tra API và Console.",
      "error",
    );
  }
});

// Xem trước ảnh khi chọn file
editSeasonFileInput?.addEventListener("change", () => {
  const file = editSeasonFileInput.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    editSeasonFileInput.value = "";
    thongBaoSeason("Vui lòng chọn file ảnh hợp lệ.", "error");
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  hienThiPosterSeason(previewUrl);
});

// CẬP NHẬT: gửi dữ liệu lên JSON Server
editSeasonForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const seasonId = document.getElementById("editSeasonId")?.value;

  if (!seasonId) {
    await thongBaoSeason("Thiếu ID mùa phim cần cập nhật.", "error");
    return;
  }

  const seasonNumber = Number(
    document.getElementById("editSeasonNumber")?.value,
  );
  const title = document.getElementById("editSeasonTitle")?.value.trim();
  const description = document
    .getElementById("editSeasonDescription")
    ?.value.trim();
  const poster = editSeasonPosterInput?.value.trim() || "";
  const releaseYearValue = document.getElementById(
    "editSeasonReleaseYear",
  )?.value;
  const statusValue = document.getElementById("editSeasonStatus")?.value;

  if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
    await thongBaoSeason("Số mùa phải là số nguyên lớn hơn 0.", "warning");
    return;
  }

  if (!title) {
    await thongBaoSeason("Vui lòng nhập tên mùa phim.", "warning");
    return;
  }

  const updateData = {
    movieId: document.getElementById("editSeasonMovieId")?.value,
    seasonNumber,
    title,
    description,
    poster,
    releaseYear: releaseYearValue ? Number(releaseYearValue) : null,
    status: statusValue === "true",
  };

  try {
    // Lưu đường dẫn poster; không lưu dữ liệu ảnh Base64.
    // Nếu chọn file mới, cần upload file trước khi gọi PUT.
    if (editSeasonFileInput?.files?.length) {
      await thongBaoSeason(
        "Mày đã chọn poster mới. Cần tích hợp endpoint upload ảnh hiện có trước khi lưu.",
        "warning",
      );
      return;
    }

    await api.put(`/season/${encodeURIComponent(seasonId)}`, updateData);

    await thongBaoSeason("Cập nhật mùa phim thành công!", "success");

    if (editSeasonModal) {
      editSeasonModal.checked = false;
    }

    // Gọi hàm tải lại danh sách nếu file hiện tại đã có hàm này.
    // Ví dụ: await hienThiDanhSachSeason();
    window.dispatchEvent(
      new CustomEvent("season-updated", {
        detail: { id: seasonId },
      }),
    );
  } catch (error) {
    console.error("Lỗi cập nhật mùa phim:", error);

    await thongBaoSeason(
      "Cập nhật thất bại. Kiểm tra kết nối JSON Server.",
      "error",
    );
  }
});
