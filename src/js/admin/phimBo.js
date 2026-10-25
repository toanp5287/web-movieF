import { kiemTraDangNhapAdmin } from "./../../utils/storage";
import api from "../api";

await kiemTraDangNhapAdmin();

// ========================================
// CẤU HÌNH
// ========================================
const SO_TAP_MOI_TRANG = 5;

// ========================================
// PHẦN TỬ DOM
// ========================================
const tableBody = document.querySelector("#phimBo");
const searchInput = document.querySelector("#searchKeyword");
const resultCountEl = document.querySelector("#resultCount");
const totalEpisodesEl = document.querySelector("#totalEpisodes");
const pageSubtitleEl = document.querySelector("#pageSubtitle");
const prevPageBtn = document.querySelector("#prevPage");
const nextPageBtn = document.querySelector("#nextPage");

// ========================================
// TRẠNG THÁI
// ========================================
let tatCaTapPhim = [];
let trangHienTai = 1;

// Cho phép module khác (updateEnpoin.js) đọc danh sách tập hiện tại.
window.__tatCaTapPhim = tatCaTapPhim;

// ========================================
// TIỆN ÍCH
// ========================================
function layMang(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function boDau(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tenFile(duongDan) {
  const clean = String(duongDan ?? "").trim();

  if (!clean) return "";

  const parts = clean.split("/");

  return parts[parts.length - 1] || clean;
}

function laHoatDong(status) {
  return status === true || String(status).toLowerCase() === "true";
}

function sapXep(tapPhim) {
  return tapPhim.slice().sort((a, b) => {
    const na = Number(a.episodeNumber);
    const nb = Number(b.episodeNumber);

    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;

    return String(a.episodeNumber ?? "").localeCompare(
      String(b.episodeNumber ?? ""),
    );
  });
}

// ========================================
// GỌI API (dùng endpoint hiện có)
// ========================================
async function layPhimBo() {
  try {
    const res = await api.get("/movies");

    return layMang(res).filter((item) => item.type === "series");
  } catch (error) {
    console.error("Lỗi lấy danh sách phim bộ:", error);
    return [];
  }
}

async function layDanhSachSeason() {
  try {
    const res = await api.get("/season");

    return layMang(res);
  } catch (error) {
    console.error("Lỗi lấy danh sách mùa phim:", error);
    return [];
  }
}

async function layDanhSachTapPhim() {
  const resResult = await api.get("/episodes");
  const res = resResult.filter((item) => item.status !== false);

  return layMang(res);
}

// ========================================
// LỌC THEO TỪ KHÓA ĐANG NHẬP
// ========================================
function locTheoTuKhoa(danhSach) {
  const keyword = boDau(searchInput?.value ?? "").trim();

  if (!keyword) return danhSach;

  return danhSach.filter((tap) => {
    const title = boDau(tap.title);
    const number = boDau(tap.episodeNumber);

    return title.includes(keyword) || number.includes(keyword);
  });
}

// ========================================
// CẬP NHẬT TIÊU ĐỀ / PHÂN TRANG / THỐNG KÊ
// ========================================
function capNhatTieuDe(season, movie) {
  if (!pageSubtitleEl) return;

  if (season) {
    const tenPhim = movie?.title || "Phim bộ";
    const tenMua =
      season.title || `Mùa ${season.seasonNumber ?? ""}`.trim() || "Mùa";

    pageSubtitleEl.textContent = `${tenPhim} - ${tenMua}`;
    return;
  }

  pageSubtitleEl.textContent = "Tất cả tập phim";
}

function capNhatPhanTrang(trang, tongSoTrang) {
  const datTrangThai = (btn, disabled) => {
    if (!btn) return;

    btn.disabled = disabled;
    btn.classList.toggle("opacity-40", disabled);
    btn.classList.toggle("cursor-not-allowed", disabled);
  };

  datTrangThai(prevPageBtn, trang <= 1);
  datTrangThai(nextPageBtn, trang >= tongSoTrang);
}

function capNhatThongKe(soLuong) {
  if (resultCountEl) resultCountEl.textContent = String(soLuong);
  if (totalEpisodesEl) {
    totalEpisodesEl.textContent = `Tổng cộng ${soLuong} tập`;
  }
}

// ========================================
// RENDER
// ========================================
function renderDangTai() {
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="py-10 text-center text-zinc-500">
        Đang tải dữ liệu tập phim...
      </td>
    </tr>
  `;

  capNhatThongKe(0);
  capNhatPhanTrang(1, 1);
}

function renderThongBao(message, colorClass = "text-zinc-500") {
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="py-10 text-center ${colorClass}">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function taoDong(tap, index) {
  const number = String(tap.episodeNumber ?? index + 1).padStart(2, "0");
  const title = escapeHtml(tap.title || "Chưa có tên tập");
  const description = escapeHtml(tap.description || "");
  const duration =
    Number(tap.duration) > 0 ? `${Number(tap.duration)} phút` : "Chưa rõ";

  const coVideo = Boolean(String(tap.video ?? "").trim());
  const nhanVideo = coVideo ? escapeHtml(tenFile(tap.video)) : "Chưa có nguồn";
  const classVideo = coVideo
    ? "text-zinc-400 bg-zinc-900 border-zinc-800"
    : "text-amber-400/90 bg-amber-950/40 border-amber-900/50";

  const trangThai = laHoatDong(tap.status)
    ? `<span class="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
         <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
         Sẵn sàng
       </span>`
    : `<span class="inline-flex items-center gap-1.5 text-amber-400 text-[11px]">
         <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
         Đã ẩn
       </span>`;

  return `
    <tr data-episode-id="${escapeHtml(tap.id)}" class="hover:bg-zinc-800/30 transition">
      <td class="py-3 px-4 text-center font-semibold text-white">
        ${number}
      </td>
      <td class="py-3 px-4">
        <div class="font-medium text-white">
          ${title}
        </div>
        ${
          description
            ? `<div class="text-[11px] text-zinc-500">${description}</div>`
            : ""
        }
      </td>
      <td class="py-3 px-4 text-zinc-400">${duration}</td>
      <td class="py-3 px-4">
        <span
          class="font-mono text-[11px] ${classVideo} border px-2 py-0.5 rounded"
        >
          ${nhanVideo}
        </span>
      </td>
      <td class="py-3 px-4">${trangThai}</td>
      <td class="py-3 px-4 text-right">
     
<div class="inline-flex items-center gap-2">
  <button
    type="button"
    data-action="view"
    data-id="${escapeHtml(tap.id)}"
    title="Xem chi tiết tập phim"
    class="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 transition hover:border-red-500 hover:text-white"
  >
    <span class="material-symbols-outlined text-base">visibility</span>
    Xem chi tiết
  </button>

  <button
    type="button"
    data-action="edit-episode"
    data-id="${escapeHtml(tap.id)}"
    title="Chỉnh sửa tập"
    class="text-zinc-400 hover:text-white transition"
  >
    <span class="material-symbols-outlined text-base">edit</span>
  </button>

 <button
  type="button"
  data-action="delete"
  data-id="${escapeHtml(tap.id)}"
  title="Xóa tập"
  class="text-zinc-400 hover:text-red-400 transition"
>
  <span class="material-symbols-outlined text-base">delete</span>
</button>
</div>

      </td>
    </tr>
  `;
}

function render() {
  const danhSach = locTheoTuKhoa(tatCaTapPhim);
  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSach.length / SO_TAP_MOI_TRANG),
  );

  if (trangHienTai > tongSoTrang) trangHienTai = tongSoTrang;
  if (trangHienTai < 1) trangHienTai = 1;

  const batDau = (trangHienTai - 1) * SO_TAP_MOI_TRANG;
  const tapTrongTrang = danhSach.slice(batDau, batDau + SO_TAP_MOI_TRANG);

  if (danhSach.length === 0) {
    renderThongBao(
      tatCaTapPhim.length === 0
        ? "Chưa có tập phim nào."
        : "Không tìm thấy tập phim nào phù hợp.",
    );
  } else if (tableBody) {
    tableBody.innerHTML = tapTrongTrang.map(taoDong).join("");
  }

  capNhatThongKe(danhSach.length);
  capNhatPhanTrang(trangHienTai, tongSoTrang);
}

// ========================================
// KHỞI TẠO
// ========================================
async function khoiTao() {
  renderDangTai();

  const seasonId = new URLSearchParams(window.location.search).get("season_id");

  try {
    const [tapPhim, seasons, phimBo] = await Promise.all([
      layDanhSachTapPhim(),
      layDanhSachSeason(),
      layPhimBo(),
    ]);

    const season = seasonId
      ? seasons.find((item) => String(item.id) === String(seasonId)) || null
      : null;

    const movie = season
      ? phimBo.find((item) => String(item.id) === String(season.movieId)) ||
        null
      : null;

    capNhatTieuDe(season, movie);

    if (season) {
      tatCaTapPhim = sapXep(
        tapPhim.filter((item) => String(item.seasonId) === String(season.id)),
      );
    } else if (seasonId) {
      // Có season_id nhưng không tìm thấy mùa tương ứng trong API.
      tatCaTapPhim = [];
    } else {
      tatCaTapPhim = sapXep(tapPhim);
    }

    window.__tatCaTapPhim = tatCaTapPhim;

    render();
  } catch (error) {
    console.error("Lỗi tải dữ liệu tập phim:", error);

    tatCaTapPhim = [];
    window.__tatCaTapPhim = tatCaTapPhim;
    trangHienTai = 1;

    renderThongBao(
      "Không thể tải dữ liệu tập phim. Vui lòng kiểm tra kết nối API.",
      "text-red-400",
    );

    capNhatThongKe(0);
    capNhatPhanTrang(1, 1);
  }
}

// ========================================
// SỰ KIỆN (chỉ đăng ký một lần)
// ========================================
searchInput?.addEventListener("input", () => {
  trangHienTai = 1;
  render();
});

prevPageBtn?.addEventListener("click", () => {
  if (trangHienTai > 1) {
    trangHienTai -= 1;
    render();
  }
});

nextPageBtn?.addEventListener("click", () => {
  const danhSach = locTheoTuKhoa(tatCaTapPhim);
  const tongSoTrang = Math.max(
    1,
    Math.ceil(danhSach.length / SO_TAP_MOI_TRANG),
  );

  if (trangHienTai < tongSoTrang) {
    trangHienTai += 1;
    render();
  }
});

khoiTao();

// ========================================
// XEM CHI TIẾT TẬP PHIM
// ========================================

// Chuẩn hóa đường dẫn video trong public/videos/
function layDuongDanVideo(video) {
  const raw = String(video ?? "").trim();

  if (!raw) return "";

  // Đường dẫn video từ máy chủ khác (http/https hoặc //)
  if (/^(https?:)?\/\//i.test(raw)) {
    return raw;
  }

  // Chuẩn hóa dấu gạch chéo và bỏ tiền tố tương đối
  let path = raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");

  // public/videos/example.mp4 -> videos/example.mp4
  if (path.startsWith("public/")) {
    path = path.slice("public/".length);
  }

  // Tên file trần (không có thư mục) -> mặc định nằm trong public/videos/
  if (!path.includes("/")) {
    path = `videos/${path}`;
  }

  // Mã hóa từng phần đường dẫn nhưng không mã hóa dấu /
  return (
    "/" +
    path
      .split("/")
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join("/")
  );
}

// ========================================
// TẠO PANEL CHI TIẾT
// ========================================
function taoPanelChiTiet() {
  if (document.getElementById("episode-detail-overlay")) return;

  const overlay = document.createElement("div");

  overlay.id = "episode-detail-overlay";
  overlay.className =
    "fixed inset-0 z-[9999] invisible opacity-0 transition-opacity duration-300";

  overlay.innerHTML = `
    <div
      data-close-detail
      class="absolute inset-0 bg-black/70"
    ></div>

    <aside
      id="episode-detail-panel"
      class="absolute right-0 top-0 flex h-full w-full max-w-xl translate-x-full flex-col border-l border-zinc-800 bg-[#111113] text-white shadow-2xl transition-transform duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết tập phim"
    >
      <header class="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div>
          <p class="text-xs uppercase tracking-widest text-red-500">
            MovieF Admin
          </p>
          <h2 class="mt-1 text-lg font-bold">Chi tiết tập phim</h2>
        </div>

        <button
          type="button"
          data-close-detail
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          aria-label="Đóng"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>

      <div
        id="episode-detail-content"
        class="flex-1 space-y-5 overflow-y-auto p-5"
      ></div>
    </aside>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-close-detail]").forEach((element) => {
    element.addEventListener("click", dongChiTietTap);
  });
}

// ========================================
// MỞ CHI TIẾT TẬP PHIM
// ========================================
function moChiTietTap(tap) {
  if (!tap) return;

  taoPanelChiTiet();

  const overlay = document.getElementById("episode-detail-overlay");
  const panel = document.getElementById("episode-detail-panel");
  const content = document.getElementById("episode-detail-content");

  const videoUrl = layDuongDanVideo(tap.video);
  const coVideo = Boolean(videoUrl);
  const trangThai = laHoatDong(tap.status);

  const thoiLuong =
    Number(tap.duration) > 0 ? `${Number(tap.duration)} phút` : "Chưa rõ";

  content.innerHTML = `
    <!-- VIDEO -->
    <section class="overflow-hidden rounded-xl border border-zinc-800 bg-black">
      ${
        coVideo
          ? `
            <video
              id="episode-detail-video"
              class="aspect-video w-full bg-black"
              controls
              playsinline
              preload="metadata"
            >
              <source
                src="${escapeHtml(videoUrl)}"
                type="video/mp4"
              />
              Trình duyệt không hỗ trợ phát video.
            </video>

            <div
              id="episode-video-error"
              class="hidden space-y-2 border-t border-zinc-800 px-4 py-3"
            >
              <p class="text-sm font-medium text-amber-400">
                Không thể tải hoặc phát video.
              </p>

              <p class="text-xs leading-5 text-zinc-400">
                Kiểm tra tên file, đường dẫn và định dạng video.
              </p>

              <a
                href="${escapeHtml(videoUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block text-sm text-red-400 underline hover:text-red-300"
              >
                Mở video trong tab mới
              </a>
            </div>
          `
          : `
            <div class="flex aspect-video flex-col items-center justify-center gap-3 text-zinc-500">
              <span class="material-symbols-outlined text-5xl">
                videocam_off
              </span>
              <p class="text-sm">Tập phim chưa có video.</p>
            </div>
          `
      }
    </section>

    <!-- TÊN TẬP -->
    <section>
      <p class="text-xs font-semibold uppercase tracking-wider text-red-500">
        TẬP ${escapeHtml(tap.episodeNumber ?? "—")}
      </p>

      <h3 class="mt-2 break-words text-2xl font-bold">
        ${escapeHtml(tap.title || "Chưa có tên tập")}
      </h3>
    </section>

    <!-- THÔNG TIN -->
    <section class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-xs text-zinc-500">ID tập phim</p>
        <p class="mt-2 break-all text-sm font-medium">
          ${escapeHtml(tap.id ?? "Chưa có")}
        </p>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-xs text-zinc-500">ID mùa phim</p>
        <p class="mt-2 break-all text-sm font-medium">
          ${escapeHtml(tap.seasonId ?? "Chưa có")}
        </p>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-xs text-zinc-500">Thời lượng</p>
        <p class="mt-2 text-sm font-medium">
          ${escapeHtml(thoiLuong)}
        </p>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-xs text-zinc-500">Trạng thái</p>
        <p class="mt-2 text-sm font-medium ${
          trangThai ? "text-emerald-400" : "text-amber-400"
        }">
          ${trangThai ? "Đang hoạt động" : "Đã ẩn"}
        </p>
      </div>
    </section>

    <!-- MÔ TẢ -->
    <section>
      <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        MÔ TẢ TẬP PHIM
      </p>

      <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
        ${escapeHtml(tap.description || "Chưa có mô tả.")}
      </p>
    </section>

    <!-- ĐƯỜNG DẪN -->
    <section>
      <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        ĐƯỜNG DẪN VIDEO
      </p>

      <code class="mt-2 block break-all rounded-lg border border-zinc-800 bg-black/30 p-3 text-xs leading-5 text-zinc-300">
        ${escapeHtml(tap.video || "Chưa có đường dẫn video")}
      </code>

      ${
        coVideo
          ? `
            <p class="mt-2 break-all text-xs text-zinc-500">
              Đường dẫn phát: ${escapeHtml(videoUrl)}
            </p>
          `
          : ""
      }
    </section>

    <!-- NGÀY PHÁT HÀNH -->
    <section>
      <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        NGÀY PHÁT HÀNH
      </p>

      <p class="mt-2 text-sm text-zinc-300">
        ${escapeHtml(tap.releaseDate || "Chưa có thông tin")}
      </p>
    </section>
  `;

  // Hiện panel
  overlay.classList.remove("invisible", "opacity-0");
  panel.classList.remove("translate-x-full");

  document.body.classList.add("overflow-hidden");

  // Bắt lỗi tải video: lỗi có thể bắn trên <video> hoặc trên <source>
  const video = document.getElementById("episode-detail-video");
  const videoError = document.getElementById("episode-video-error");

  if (video && videoError) {
    const hienThiLoiVideo = () => {
      videoError.classList.remove("hidden");
    };

    const nguonVideo = video.querySelector("source");

    video.addEventListener("error", hienThiLoiVideo);
    nguonVideo?.addEventListener("error", hienThiLoiVideo);

    // Phòng trường hợp trình duyệt đã báo lỗi trước khi gắn sự kiện.
    if (video.error) {
      hienThiLoiVideo();
    }
  }
}

// ========================================
// ĐÓNG CHI TIẾT TẬP PHIM
// ========================================
function dongChiTietTap() {
  const overlay = document.getElementById("episode-detail-overlay");
  const panel = document.getElementById("episode-detail-panel");
  const video = document.getElementById("episode-detail-video");

  if (!overlay || !panel) return;

  // Dừng video và giải phóng nguồn phát
  if (video) {
    video.pause();
    video.removeAttribute("src");

    video.querySelectorAll("source").forEach((source) => {
      source.removeAttribute("src");
    });

    video.load();
  }

  panel.classList.add("translate-x-full");
  overlay.classList.add("opacity-0");

  document.body.classList.remove("overflow-hidden");

  window.setTimeout(() => {
    overlay.classList.add("invisible");
  }, 300);
}

// ========================================
// SỰ KIỆN NÚT XEM CHI TIẾT
// ========================================
tableBody?.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="view"]');

  if (!button || !tableBody.contains(button)) return;

  const tap = tatCaTapPhim.find(
    (item) => String(item.id) === String(button.dataset.id),
  );

  if (tap) {
    moChiTietTap(tap);
  }
});

// ========================================
// ĐÓNG BẰNG PHÍM ESCAPE
// ========================================
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const overlay = document.getElementById("episode-detail-overlay");

  if (overlay && !overlay.classList.contains("invisible")) {
    dongChiTietTap();
  }
});

// XÓA MỀM TẬP PHIM
async function xoaMemTapPhim(id) {
  try {
    const tapPhim = tatCaTapPhim.find((tap) => String(tap.id) === String(id));

    if (!tapPhim) {
      Swal.fire("Lỗi", "Không tìm thấy tập phim!", "error");
      return;
    }

    if (tapPhim.status === false) {
      Swal.fire("Thông báo", "Tập phim đã được xóa trước đó!", "info");
      return;
    }

    const ketQua = await Swal.fire({
      title: "Xóa tập phim?",
      text: `Bạn có chắc muốn xóa tập "${tapPhim.title}" không?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#e50914",
      reverseButtons: true,
    });

    if (!ketQua.isConfirmed) return;

    const response = await fetch(
      `http://localhost:3000/episodes/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: false,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API trả về HTTP ${response.status}`);
    }

    // Cập nhật dữ liệu trong bộ nhớ
    tapPhim.status = false;

    // Nếu danh sách đang hiển thị chỉ gồm tập hoạt động,
    // render lại bằng hàm render danh sách hiện có của dự án.
    if (typeof renderDanhSachTapPhim === "function") {
      renderDanhSachTapPhim();
    }

    await Swal.fire({
      title: "Đã xóa",
      text: "Tập phim đã được xóa mềm thành công.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Lỗi xóa mềm tập phim:", error);

    Swal.fire("Lỗi", "Không thể xóa mềm tập phim. Vui lòng thử lại!", "error");
  }
}
tableBody.addEventListener("click", (event) => {
  const nutXoa = event.target.closest('button[data-action="delete"]');

  if (nutXoa) {
    event.preventDefault();
    event.stopPropagation();

    xoaMemTapPhim(nutXoa.dataset.id);
    return;
  }

  // Giữ nguyên các xử lý click hiện có ở bên dưới.
});

// ========================================
// TẢI LẠI DANH SÁCH SAU KHI CẬP NHẬT TẬP PHIM
// updateEnpoin.js phát CustomEvent "episode-updated".
// ========================================
document.addEventListener("episode-updated", () => {
  khoiTao();
});
