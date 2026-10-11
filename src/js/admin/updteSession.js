import api from "../api";
/* =========================================
   CẬP NHẬT MÙA PHIM
========================================= */

const editSeasonForm = document.getElementById("form-edit-season");
const editSeasonModal = document.getElementById("modal-edit-toggle");
const editSeasonContainer = document.getElementById("movieInfo");

const editSeasonFileInput = document.getElementById("editSeasonPosterFile");
const editSeasonPosterInput = document.getElementById("editSeasonPoster");
const editSeasonPreview = document.getElementById("editSeasonPosterPreview");
const editSeasonPreviewImage = document.getElementById(
  "editSeasonPosterPreviewImage",
);

// Thông báo: ưu tiên SweetAlert2 nếu dự án đã cài
async function thongBaoEditSeason(title, icon = "info") {
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

// Chuẩn hóa dữ liệu trả về từ API
function layMangEditSeason(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

// Hiển thị ảnh xem trước
function hienThiPosterEditSeason(src) {
  if (!src) {
    editSeasonPreview?.classList.add("hidden");

    if (editSeasonPreviewImage) {
      editSeasonPreviewImage.removeAttribute("src");
    }

    return;
  }

  if (editSeasonPreviewImage && editSeasonPreview) {
    editSeasonPreviewImage.src = src;
    editSeasonPreview.classList.remove("hidden");
  }
}

// Nhập đường dẫn ảnh thì cập nhật xem trước
editSeasonPosterInput?.addEventListener("input", () => {
  hienThiPosterEditSeason(editSeasonPosterInput.value.trim());

  // Đường dẫn được nhập thủ công sẽ được ưu tiên
  if (editSeasonFileInput) {
    editSeasonFileInput.value = "";
  }
});

// Chọn ảnh từ máy tính: đọc ảnh để xem trước và lưu vào dữ liệu poster
editSeasonFileInput?.addEventListener("change", () => {
  const file = editSeasonFileInput.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    thongBaoEditSeason("Vui lòng chọn tệp hình ảnh.", "warning");
    editSeasonFileInput.value = "";
    return;
  }

  // Giới hạn 2 MB để tránh làm db.json quá lớn
  if (file.size > 2 * 1024 * 1024) {
    thongBaoEditSeason(
      "Ảnh không được vượt quá 2 MB. Vui lòng chọn ảnh nhỏ hơn.",
      "warning",
    );
    editSeasonFileInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") return;

    // Dữ liệu ảnh được lưu dạng Data URL trong trường poster
    editSeasonPosterInput.value = reader.result;
    hienThiPosterEditSeason(reader.result);
  };

  reader.onerror = () => {
    thongBaoEditSeason("Không thể đọc tệp ảnh.", "error");
  };

  reader.readAsDataURL(file);
});

// Bấm nút sửa mùa phim
editSeasonContainer?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-season]");

  if (!editButton) return;

  const seasonId = editButton.dataset.seasonId;

  if (!seasonId) {
    thongBaoEditSeason("Không tìm thấy ID mùa phim.", "error");
    return;
  }

  try {
    const response = await api.get("/season");
    const seasons = layMangEditSeason(response);

    const season = seasons.find((item) => String(item.id) === String(seasonId));

    if (!season) {
      thongBaoEditSeason("Mùa phim không tồn tại.", "error");
      return;
    }

    // Điền dữ liệu mùa phim vào form
    document.getElementById("editSeasonId").value = season.id ?? "";
    document.getElementById("editSeasonMovieId").value = season.movieId ?? "";

    document.getElementById("editSeasonNumber").value =
      season.seasonNumber ?? "";

    document.getElementById("editSeasonTitle").value = season.title ?? "";

    document.getElementById("editSeasonDescription").value =
      season.description ?? "";

    editSeasonPosterInput.value = season.poster ?? "";

    document.getElementById("editSeasonReleaseYear").value =
      season.releaseYear ?? "";

    document.getElementById("editSeasonStatus").value = String(
      season.status ?? true,
    );

    // Xóa lựa chọn tệp cũ, hiển thị poster hiện tại
    if (editSeasonFileInput) {
      editSeasonFileInput.value = "";
    }

    hienThiPosterEditSeason(season.poster ?? "");

    // Cập nhật tiêu đề modal nếu các phần tử tồn tại
    const heading = document.getElementById("editSeasonHeading");
    const movieTitle = document.getElementById("editSeasonMovieTitle");

    if (heading) {
      heading.textContent = `Chỉnh sửa ${season.title || "mùa phim"}`;
    }

    if (movieTitle) {
      const movieResponse = await api.get("/movies");
      const movies = layMangEditSeason(movieResponse);

      const movie = movies.find(
        (item) => String(item.id) === String(season.movieId),
      );

      movieTitle.textContent = movie?.title ?? "";
    }

    // Chỉ mở modal sau khi đã lấy được dữ liệu
    if (editSeasonModal) {
      editSeasonModal.checked = true;
    }
  } catch (error) {
    console.error("Lỗi lấy thông tin mùa phim:", error);

    thongBaoEditSeason(
      "Không thể tải thông tin mùa phim. Vui lòng thử lại.",
      "error",
    );
  }
});

// Lưu cập nhật mùa phim
editSeasonForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const seasonId = document.getElementById("editSeasonId").value;
  const movieId = document.getElementById("editSeasonMovieId").value;

  const seasonNumber = Number(
    document.getElementById("editSeasonNumber").value,
  );

  const title = document.getElementById("editSeasonTitle").value.trim();

  const description = document
    .getElementById("editSeasonDescription")
    .value.trim();

  const poster = editSeasonPosterInput.value.trim();

  const releaseYearValue = document.getElementById(
    "editSeasonReleaseYear",
  ).value;

  const status = document.getElementById("editSeasonStatus").value === "true";

  if (!seasonId || !movieId) {
    thongBaoEditSeason("Thiếu thông tin ID mùa phim hoặc phim cha.", "error");
    return;
  }

  if (!title) {
    thongBaoEditSeason("Vui lòng nhập tên mùa phim.", "warning");
    return;
  }

  if (
    !Number.isInteger(seasonNumber) ||
    seasonNumber < 1 ||
    seasonNumber > 99
  ) {
    thongBaoEditSeason("Số mùa phải nằm trong khoảng từ 1 đến 99.", "warning");
    return;
  }

  let releaseYear;

  if (releaseYearValue !== "") {
    releaseYear = Number(releaseYearValue);

    if (
      !Number.isInteger(releaseYear) ||
      releaseYear < 1900 ||
      releaseYear > 2100
    ) {
      thongBaoEditSeason("Năm phát hành không hợp lệ.", "warning");
      return;
    }
  }

  try {
    const response = await api.get("/season");
    const seasons = layMangEditSeason(response);

    // Kiểm tra trùng số mùa trong cùng một phim
    const duplicated = seasons.some(
      (season) =>
        String(season.id) !== String(seasonId) &&
        String(season.movieId) === String(movieId) &&
        Number(season.seasonNumber) === seasonNumber,
    );

    if (duplicated) {
      thongBaoEditSeason(
        `Phim này đã có mùa ${seasonNumber}. Vui lòng chọn số mùa khác.`,
        "warning",
      );
      return;
    }

    // Giữ nguyên các trường khác của mùa phim
    const oldSeason = seasons.find(
      (season) => String(season.id) === String(seasonId),
    );

    if (!oldSeason) {
      thongBaoEditSeason("Không tìm thấy mùa phim cần cập nhật.", "error");
      return;
    }

    const updatedSeason = {
      ...oldSeason,
      seasonNumber,
      title,
      description,
      poster,
      releaseYear: releaseYearValue === "" ? null : releaseYear,
      status,
    };

    await api.put(`/season/${encodeURIComponent(seasonId)}`, updatedSeason);

    // Đóng modal sau khi API cập nhật thành công
    if (editSeasonModal) {
      editSeasonModal.checked = false;
    }

    await thongBaoEditSeason("Cập nhật mùa phim thành công!", "success");

    // Tải lại danh sách mùa của phim đang chọn
    const movieSelect = document.getElementById("clickMovies");

    if (movieSelect) {
      movieSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch (error) {
    console.error("Lỗi cập nhật mùa phim:", error);

    thongBaoEditSeason(
      "Cập nhật mùa phim thất bại. Hãy kiểm tra API và kết nối JSON Server.",
      "error",
    );
  }
});
