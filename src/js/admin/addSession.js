import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

// Chỉ Admin/Staff được khởi tạo logic quản trị mùa phim.
await kiemTraDangNhapAdmin();

// ========================================
// 1. KHAI BÁO PHẦN TỬ
// ========================================

// Form thêm mùa
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

// Form sửa mùa
const formEditSeason = document.querySelector("#form-edit-season");
const modalEditSeason = document.querySelector("#modal-edit-toggle");

const editSeasonFileInput = document.querySelector("#editSeasonPosterFile");
const editSeasonPosterInput = document.querySelector("#editSeasonPoster");
const editSeasonPreview = document.querySelector("#editSeasonPosterPreview");
const editSeasonPreviewImage = document.querySelector(
  "#editSeasonPosterPreviewImage",
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
// 4. UPLOAD FILE
// ========================================
async function uploadFile(file, type) {
  if (!file) return "";

  const uploadUrl =
    type === "image"
      ? "/api/upload-image"
      : type === "video"
        ? "/api/upload-video"
        : "";

  if (!uploadUrl) {
    throw new Error("Loại file upload không hợp lệ.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload file thất bại.");
  }

  const result = await response.json();

  if (!result.success || !result.url) {
    throw new Error(result.message || "Server không trả về đường dẫn file.");
  }

  return result.url;
}

// ========================================
// 5. HỖ TRỢ POSTER
// ========================================
function hienThiPoster(preview, previewImage, src) {
  if (!preview || !previewImage) return;

  if (!src) {
    preview.classList.add("hidden");
    previewImage.removeAttribute("src");
    return;
  }

  previewImage.src = src;
  preview.classList.remove("hidden");
}

function laAnhHopLe(file) {
  return Boolean(file && file.type.startsWith("image/"));
}

function layGiaTri(id) {
  return document.getElementById(id)?.value ?? "";
}

function ganGiaTri(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    console.error(`Không tìm thấy phần tử #${id}`);
    return;
  }

  element.value = value ?? "";
}

function chuanHoaTrangThai(status) {
  return !(
    status === false ||
    String(status).toLowerCase() === "false" ||
    String(status).toLowerCase() === "inactive"
  );
}

// ========================================
// 6. CẬP NHẬT TRẠNG THÁI NÚT THÊM MÙA
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
// 7. CHỌN PHIM BỘ
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
// 8. XEM TRƯỚC POSTER KHI THÊM MÙA
// ========================================
inputSeasonPosterFile?.addEventListener("change", () => {
  const file = inputSeasonPosterFile.files?.[0];

  if (!file) {
    hienThiPoster(seasonPosterPreview, seasonPosterPreviewImage, "");
    return;
  }

  if (!laAnhHopLe(file)) {
    inputSeasonPosterFile.value = "";

    hienThiPoster(seasonPosterPreview, seasonPosterPreviewImage, "");

    thongBaoSeason({
      icon: "warning",
      title: "File không hợp lệ",
      text: "Vui lòng chọn file ảnh.",
    });

    return;
  }

  const objectUrl = URL.createObjectURL(file);

  hienThiPoster(seasonPosterPreview, seasonPosterPreviewImage, objectUrl);
});

// ========================================
// 9. TẠO MÙA PHIM
// ========================================
formCreateSeason?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const movieId = selectMovies?.value;
  const seasonNumber = Number(inputSeasonNumber?.value);
  const title = inputSeasonTitle?.value.trim() ?? "";
  const description = inputSeasonDescription?.value.trim() ?? "";
  const posterFile = inputSeasonPosterFile?.files?.[0];

  const releaseYearValue = inputSeasonReleaseYear?.value.trim() ?? "";
  const releaseYear = releaseYearValue ? Number(releaseYearValue) : null;
  const status = inputSeasonStatus?.value === "true";

  if (!movieId) {
    await thongBaoSeason({
      icon: "warning",
      title: "Chưa chọn phim",
      text: "Vui lòng chọn phim bộ trước khi thêm mùa.",
    });
    return;
  }

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

  if (!title) {
    await thongBaoSeason({
      icon: "warning",
      title: "Thiếu tên mùa",
      text: "Vui lòng nhập tên mùa phim.",
    });
    return;
  }

  if (!posterFile || !laAnhHopLe(posterFile)) {
    await thongBaoSeason({
      icon: "warning",
      title: "Poster không hợp lệ",
      text: "Vui lòng chọn file ảnh poster từ máy tính.",
    });
    return;
  }

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

  if (submitButton?.disabled) return;

  const originalButtonHTML = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Đang lưu mùa...";
  }

  try {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Đang lưu mùa phim...",
        text: "Đang kiểm tra dữ liệu và upload poster.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
    }

    // Kiểm tra trùng số mùa TRƯỚC khi upload để tránh file thừa.
    const response = await api.get("/season");
    const seasons = layDanhSachSeason(response);

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

    const posterUrl = await uploadFile(posterFile, "image");

    const maxId = seasons.reduce((max, season) => {
      const numericId = Number(season.id);

      return Number.isInteger(numericId) && numericId > max ? numericId : max;
    }, 0);

    const newSeason = {
      id: String(maxId + 1),
      movieId: String(movieId),
      seasonNumber,
      title,
      description,
      poster: posterUrl,
      releaseYear,
      status,
    };

    await api.post("/season", newSeason);

    await thongBaoSeason({
      icon: "success",
      title: "Thêm mùa thành công",
      text: `Đã tạo ${title}.`,
    });

    if (modalCreateSeason) {
      modalCreateSeason.checked = false;
    }

    formCreateSeason.reset();

    hienThiPoster(seasonPosterPreview, seasonPosterPreviewImage, "");

    if (inputSeasonMovieId) {
      inputSeasonMovieId.value = movieId;
    }

    selectMovies?.dispatchEvent(new Event("change", { bubbles: true }));

    window.dispatchEvent(
      new CustomEvent("season-updated", {
        detail: { action: "created", season: newSeason },
      }),
    );
  } catch (error) {
    console.error("Lỗi tạo mùa phim:", error);

    await thongBaoSeason({
      icon: "error",
      title: "Không thể tạo mùa phim",
      text: error.message || "Vui lòng kiểm tra kết nối.",
    });
  } finally {
    if (typeof Swal !== "undefined") {
      Swal.close();
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHTML ?? "Lưu mùa phim";
    }
  }
});

// ========================================
// 10. LẤY MÙA PHIM THEO ID
// ========================================
async function laySeasonTheoId(seasonId) {
  const response = await api.get("/season");
  const seasons = layDanhSachSeason(response);

  return seasons.find((season) => String(season.id) === String(seasonId));
}

// ========================================
// 11. ĐỔ DỮ LIỆU VÀO FORM SỬA
// ========================================
document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const editButton = target.closest("[data-edit-season]");

  if (!editButton) return;

  event.preventDefault();

  const seasonId = editButton.getAttribute("data-season-id");

  if (!seasonId) {
    await thongBaoSeason({
      icon: "error",
      title: "Thiếu ID mùa phim",
      text: "Nút sửa không có thuộc tính data-season-id.",
    });
    return;
  }

  try {
    const season = await laySeasonTheoId(seasonId);

    if (!season) {
      await thongBaoSeason({
        icon: "error",
        title: "Không tìm thấy mùa phim",
        text: `Không tìm thấy mùa phim ID ${seasonId}.`,
      });
      return;
    }

    ganGiaTri("editSeasonId", season.id);
    ganGiaTri("editSeasonMovieId", season.movieId);
    ganGiaTri("editSeasonNumber", season.seasonNumber);
    ganGiaTri("editSeasonTitle", season.title);
    ganGiaTri("editSeasonDescription", season.description);
    ganGiaTri("editSeasonPoster", season.poster);
    ganGiaTri("editSeasonReleaseYear", season.releaseYear);

    ganGiaTri(
      "editSeasonStatus",
      chuanHoaTrangThai(season.status) ? "true" : "false",
    );

    if (editSeasonFileInput) {
      editSeasonFileInput.value = "";
    }

    // Hiển thị poster cũ.
    hienThiPoster(
      editSeasonPreview,
      editSeasonPreviewImage,
      season.poster || "",
    );

    // Mở modal sau khi tải xong dữ liệu.
    if (modalEditSeason) {
      modalEditSeason.checked = true;
    }

    console.log("Đã đổ dữ liệu mùa phim vào form:", season);
  } catch (error) {
    console.error("Lỗi tải dữ liệu mùa phim:", error);

    await thongBaoSeason({
      icon: "error",
      title: "Không thể tải mùa phim",
      text: error.message || "Vui lòng kiểm tra API /season.",
    });
  }
});

// ========================================
// 12. XEM TRƯỚC POSTER KHI SỬA MÙA
// ========================================
editSeasonFileInput?.addEventListener("change", () => {
  const file = editSeasonFileInput.files?.[0];

  if (!file) {
    // Nếu bỏ chọn file, hiển thị lại poster đang lưu.
    hienThiPoster(
      editSeasonPreview,
      editSeasonPreviewImage,
      editSeasonPosterInput?.value || "",
    );
    return;
  }

  if (!laAnhHopLe(file)) {
    editSeasonFileInput.value = "";

    hienThiPoster(
      editSeasonPreview,
      editSeasonPreviewImage,
      editSeasonPosterInput?.value || "",
    );

    thongBaoSeason({
      icon: "warning",
      title: "File không hợp lệ",
      text: "Vui lòng chọn file ảnh.",
    });

    return;
  }

  const objectUrl = URL.createObjectURL(file);

  hienThiPoster(editSeasonPreview, editSeasonPreviewImage, objectUrl);
});

// ========================================
// 13. XÓA FILE ẢNH CŨ TRÊN SERVER
// ========================================
// Yêu cầu backend có POST /api/delete-image.
// Backend chỉ được xóa file trong thư mục ảnh cho phép.
async function xoaAnhCu(posterUrl) {
  if (!posterUrl) return;

  const response = await fetch("/api/delete-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: posterUrl,
    }),
  });

  if (!response.ok) {
    throw new Error("Không thể xóa file poster cũ.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Xóa poster cũ thất bại.");
  }
}

// Kiểm tra poster có được mùa/phim khác sử dụng không.
async function anhConDuocSuDung(posterUrl, currentSeasonId) {
  if (!posterUrl) return true;

  const [seasonResponse, movieResponse] = await Promise.all([
    api.get("/season"),
    api.get("/movies"),
  ]);

  const seasons = layDanhSachSeason(seasonResponse);
  const movies = layDanhSachSeason(movieResponse);

  const seasonIsUsing = seasons.some(
    (season) =>
      String(season.id) !== String(currentSeasonId) &&
      season.poster === posterUrl,
  );

  const movieIsUsing = movies.some(
    (movie) =>
      movie.poster === posterUrl ||
      movie.image === posterUrl ||
      movie.thumbnail === posterUrl,
  );

  return seasonIsUsing || movieIsUsing;
}

// ========================================
// 14. CẬP NHẬT MÙA PHIM
// ========================================
formEditSeason?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const seasonId = layGiaTri("editSeasonId");

  if (!seasonId) {
    await thongBaoSeason({
      icon: "warning",
      title: "Thiếu ID mùa phim",
      text: "Không xác định được mùa phim cần cập nhật.",
    });
    return;
  }

  const submitButton = formEditSeason.querySelector('button[type="submit"]');

  if (submitButton?.disabled) return;

  const originalButtonHTML = submitButton?.innerHTML;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Đang cập nhật...";
  }

  let newPosterUploaded = false;
  let newPosterPath = "";

  try {
    const oldSeason = await laySeasonTheoId(seasonId);

    if (!oldSeason) {
      throw new Error("Không tìm thấy mùa phim cần cập nhật.");
    }

    const seasonNumber = Number(layGiaTri("editSeasonNumber"));
    const title = layGiaTri("editSeasonTitle").trim();
    const description = layGiaTri("editSeasonDescription").trim();
    const releaseYearValue = layGiaTri("editSeasonReleaseYear").trim();
    const releaseYear = releaseYearValue ? Number(releaseYearValue) : null;

    if (
      !Number.isInteger(seasonNumber) ||
      seasonNumber < 1 ||
      seasonNumber > 99
    ) {
      throw new Error("Số mùa phải là số nguyên từ 1 đến 99.");
    }

    if (!title) {
      throw new Error("Vui lòng nhập tên mùa phim.");
    }

    if (
      releaseYear !== null &&
      (!Number.isInteger(releaseYear) ||
        releaseYear < 1900 ||
        releaseYear > 2100)
    ) {
      throw new Error("Năm phát hành phải từ 1900 đến 2100.");
    }

    // Không cho trùng số mùa của cùng một phim.
    const response = await api.get("/season");
    const seasons = layDanhSachSeason(response);

    const duplicate = seasons.some(
      (season) =>
        String(season.id) !== String(seasonId) &&
        String(season.movieId) === String(layGiaTri("editSeasonMovieId")) &&
        Number(season.seasonNumber) === seasonNumber,
    );

    if (duplicate) {
      throw new Error(`Phim này đã có mùa ${seasonNumber}.`);
    }

    // MẶC ĐỊNH GIỮ POSTER CŨ.
    let posterPath = oldSeason.poster || "";

    const selectedFile = editSeasonFileInput?.files?.[0];

    if (selectedFile) {
      if (!laAnhHopLe(selectedFile)) {
        throw new Error("File poster mới không hợp lệ.");
      }

      // Upload poster mới trước.
      newPosterPath = await uploadFile(selectedFile, "image");
      newPosterUploaded = true;
      posterPath = newPosterPath;
    } else {
      // Không chọn file mới thì giữ poster cũ.
      // Nếu người dùng nhập đường dẫn khác bằng tay, dùng đường dẫn đó.
      const typedPath = editSeasonPosterInput?.value.trim();

      if (typedPath && typedPath !== oldSeason.poster) {
        posterPath = typedPath;
      }
    }

    const updateData = {
      movieId: String(layGiaTri("editSeasonMovieId")),
      seasonNumber,
      title,
      description,
      poster: posterPath,
      releaseYear,
      status: layGiaTri("editSeasonStatus") === "true",
    };

    // Cập nhật JSON Server trước khi xóa file cũ.
    await api.put(`/season/${encodeURIComponent(seasonId)}`, updateData);

    // Chỉ xóa poster cũ khi có poster mới và đường dẫn đã thay đổi.
    if (
      newPosterUploaded &&
      oldSeason.poster &&
      oldSeason.poster !== newPosterPath
    ) {
      try {
        const posterIsShared = await anhConDuocSuDung(
          oldSeason.poster,
          seasonId,
        );

        if (!posterIsShared) {
          await xoaAnhCu(oldSeason.poster);
        } else {
          console.info(
            "Giữ poster cũ vì vẫn còn nội dung khác sử dụng:",
            oldSeason.poster,
          );
        }
      } catch (deleteError) {
        // Dữ liệu mới đã lưu thành công; lỗi xóa file không được
        // biến thao tác cập nhật thành báo thất bại.
        console.error(
          "Đã cập nhật mùa nhưng không xóa được poster cũ:",
          deleteError,
        );
      }
    }

    await thongBaoSeason({
      icon: "success",
      title: "Cập nhật mùa phim thành công",
      text: "Thông tin mùa phim đã được lưu.",
    });

    if (modalEditSeason) {
      modalEditSeason.checked = false;
    }

    window.dispatchEvent(
      new CustomEvent("season-updated", {
        detail: {
          action: "updated",
          id: seasonId,
          season: updateData,
        },
      }),
    );
  } catch (error) {
    console.error("Lỗi cập nhật mùa phim:", error);

    await thongBaoSeason({
      icon: "error",
      title: "Không thể cập nhật mùa phim",
      text: error.message || "Vui lòng kiểm tra kết nối API.",
    });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHTML ?? "Lưu thay đổi";
    }
  }
});
