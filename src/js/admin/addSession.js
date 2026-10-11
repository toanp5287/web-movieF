import api from "../api";

// ========================================
// 1. KHAI BÁO PHẦN TỬ
// ========================================
const selectMovies = document.querySelector("#clickMovies");
const btnOpenCreateSeason = document.querySelector("#btn-open-create-season");
const inputSeasonMovieId = document.querySelector("#seasonMovieId");
const modalCreateSeason = document.querySelector("#modal-create-toggle");
const formCreateSeason = document.querySelector("#form-create-season");

const inputSeasonNumber = document.querySelector("#seasonNumber");
const inputSeasonTitle = document.querySelector("#seasonTitle");
const inputSeasonDescription = document.querySelector("#seasonDescription");
const inputSeasonPosterFile = document.querySelector("#seasonPosterFile");
const inputSeasonReleaseYear = document.querySelector("#seasonReleaseYear");
const inputSeasonStatus = document.querySelector("#seasonStatus");

const seasonPosterPreview = document.querySelector("#seasonPosterPreview");
const seasonPosterPreviewImage = document.querySelector(
  "#seasonPosterPreviewImage",
);

// ========================================
// 2. THÔNG BÁO
// ========================================
async function thongBaoSeason({ icon = "info", title, text = "" }) {
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

// ========================================
// 3. CHUẨN HÓA DỮ LIỆU API
// ========================================
function layDanhSachSeason(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;

  return [];
}

// ========================================
// 4. CẬP NHẬT TRẠNG THÁI NÚT THÊM MÙA
// ========================================
function capNhatTrangThaiNutThemMua() {
  if (!selectMovies || !btnOpenCreateSeason) return;

  const daChonPhim = Boolean(selectMovies.value);

  btnOpenCreateSeason.classList.toggle("opacity-50", !daChonPhim);
  btnOpenCreateSeason.classList.toggle("cursor-not-allowed", !daChonPhim);
  btnOpenCreateSeason.classList.toggle("cursor-pointer", daChonPhim);

  btnOpenCreateSeason.title = daChonPhim
    ? "Thêm mùa cho phim đang chọn"
    : "Vui lòng chọn phim bộ trước";
}

// ========================================
// 5. CHỌN PHIM BỘ
// ========================================
selectMovies?.addEventListener("change", () => {
  if (inputSeasonMovieId) {
    inputSeasonMovieId.value = selectMovies.value;
  }

  capNhatTrangThaiNutThemMua();
});

btnOpenCreateSeason?.addEventListener("click", (event) => {
  if (!selectMovies?.value) {
    event.preventDefault();

    if (modalCreateSeason) {
      modalCreateSeason.checked = false;
    }

    thongBaoSeason({
      icon: "warning",
      title: "Chưa chọn phim",
      text: "Vui lòng chọn phim bộ trước khi thêm mùa.",
    });

    return;
  }

  if (inputSeasonMovieId) {
    inputSeasonMovieId.value = selectMovies.value;
  }
});

capNhatTrangThaiNutThemMua();

// ========================================
// 6. HIỂN THỊ POSTER
// ========================================
function hienThiPosterSeason(src) {
  if (!seasonPosterPreview || !seasonPosterPreviewImage) return;

  if (!src) {
    seasonPosterPreview.classList.add("hidden");
    seasonPosterPreviewImage.removeAttribute("src");
    return;
  }

  seasonPosterPreviewImage.src = src;
  seasonPosterPreview.classList.remove("hidden");
}

// ========================================
// 7. CHỌN FILE POSTER TỪ MÁY TÍNH
// ========================================
let posterDataUrl = "";

inputSeasonPosterFile?.addEventListener("change", async () => {
  const file = inputSeasonPosterFile.files?.[0];

  if (!file) {
    posterDataUrl = "";
    hienThiPosterSeason("");
    return;
  }

  // Chỉ cho phép JPG, PNG và WEBP
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    inputSeasonPosterFile.value = "";
    posterDataUrl = "";
    hienThiPosterSeason("");

    await thongBaoSeason({
      icon: "warning",
      title: "Định dạng ảnh không hợp lệ",
      text: "Vui lòng chọn ảnh JPG, PNG hoặc WEBP.",
    });

    return;
  }

  // Giới hạn dung lượng 2 MB
  if (file.size > 2 * 1024 * 1024) {
    inputSeasonPosterFile.value = "";
    posterDataUrl = "";
    hienThiPosterSeason("");

    await thongBaoSeason({
      icon: "warning",
      title: "Ảnh quá lớn",
      text: "Vui lòng chọn ảnh có dung lượng không vượt quá 2 MB.",
    });

    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Không đọc được dữ liệu ảnh."));
        }
      };

      reader.onerror = () => {
        reject(new Error("Lỗi đọc tệp ảnh."));
      };

      reader.readAsDataURL(file);
    });

    posterDataUrl = dataUrl;

    // Hiển thị ảnh xem trước
    hienThiPosterSeason(posterDataUrl);
  } catch (error) {
    console.error("Lỗi đọc ảnh poster:", error);

    inputSeasonPosterFile.value = "";
    posterDataUrl = "";
    hienThiPosterSeason("");

    await thongBaoSeason({
      icon: "error",
      title: "Không đọc được ảnh",
      text: "Vui lòng chọn lại ảnh khác.",
    });
  }
});

// ========================================
// 8. TẠO MÙA PHIM
// ========================================
formCreateSeason?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const movieId = selectMovies?.value;

  // Kiểm tra phim bộ
  if (!movieId) {
    await thongBaoSeason({
      icon: "warning",
      title: "Chưa chọn phim",
      text: "Vui lòng chọn phim bộ trước khi thêm mùa.",
    });

    return;
  }

  // Đồng bộ movieId
  if (inputSeasonMovieId) {
    inputSeasonMovieId.value = movieId;
  }

  const seasonNumber = Number(inputSeasonNumber?.value);
  const title = inputSeasonTitle?.value.trim() ?? "";
  const description = inputSeasonDescription?.value.trim() ?? "";
  const poster = posterDataUrl;

  const releaseYearValue = inputSeasonReleaseYear?.value.trim() ?? "";
  const releaseYear = releaseYearValue ? Number(releaseYearValue) : null;

  const status = inputSeasonStatus?.value === "true";

  // Kiểm tra số mùa
  if (
    !Number.isInteger(seasonNumber) ||
    seasonNumber < 1 ||
    seasonNumber > 99
  ) {
    await thongBaoSeason({
      icon: "warning",
      title: "Số mùa không hợp lệ",
      text: "Số mùa phải là số nguyên từ 1 đến 99.",
    });

    return;
  }

  // Kiểm tra tên mùa
  if (!title) {
    await thongBaoSeason({
      icon: "warning",
      title: "Thiếu tên mùa",
      text: "Vui lòng nhập tên mùa phim.",
    });

    return;
  }

  // Bắt buộc chọn file poster
  if (!poster) {
    await thongBaoSeason({
      icon: "warning",
      title: "Chưa chọn poster",
      text: "Vui lòng chọn file ảnh poster từ máy tính.",
    });

    return;
  }

  // Kiểm tra năm nếu người dùng nhập
  if (
    releaseYear !== null &&
    (!Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > 2100)
  ) {
    await thongBaoSeason({
      icon: "warning",
      title: "Năm phát hành không hợp lệ",
      text: "Năm phát hành phải nằm trong khoảng 1900 đến 2100.",
    });

    return;
  }

  const submitButton = formCreateSeason.querySelector('button[type="submit"]');

  // Chống gửi form nhiều lần
  if (submitButton?.disabled) return;

  const originalButtonHTML = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Đang lưu mùa...";
  }

  try {
    // Lấy danh sách mùa hiện tại
    const response = await api.get("/season");
    const seasons = layDanhSachSeason(response);

    // Kiểm tra trùng số mùa trong cùng phim
    const daTonTai = seasons.some(
      (season) =>
        String(season.movieId) === String(movieId) &&
        Number(season.seasonNumber) === seasonNumber,
    );

    if (daTonTai) {
      await thongBaoSeason({
        icon: "warning",
        title: "Mùa phim đã tồn tại",
        text: `Phim này đã có mùa ${seasonNumber}.`,
      });

      return;
    }

    // Sinh ID số tiếp theo
    const maxId = seasons.reduce((max, season) => {
      const numericId = Number(season.id);

      return Number.isInteger(numericId) && numericId > max ? numericId : max;
    }, 0);

    // Chuẩn bị dữ liệu mùa phim
    const newSeason = {
      id: String(maxId + 1),
      movieId: String(movieId),
      seasonNumber,
      title,
      description,
      poster,
      releaseYear,
      status,
    };

    // Gửi dữ liệu lên JSON Server
    await api.post("/season", newSeason);

    await thongBaoSeason({
      icon: "success",
      title: "Thêm mùa thành công",
      text: `Đã tạo ${title}.`,
    });

    // Đóng modal
    if (modalCreateSeason) {
      modalCreateSeason.checked = false;
    }

    // Reset form và dữ liệu ảnh
    formCreateSeason.reset();
    posterDataUrl = "";
    hienThiPosterSeason("");

    // Giữ lại phim đang chọn
    if (inputSeasonMovieId) {
      inputSeasonMovieId.value = movieId;
    }

    // Cập nhật danh sách mùa theo phim
    selectMovies?.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("Lỗi tạo mùa phim:", error);

    await thongBaoSeason({
      icon: "error",
      title: "Không thể tạo mùa phim",
      text: "Vui lòng kiểm tra API /season và kết nối JSON Server.",
    });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;

      if (originalButtonHTML !== undefined) {
        submitButton.innerHTML = originalButtonHTML;
      } else {
        submitButton.textContent = "Lưu mùa phim";
      }
    }
  }
});
