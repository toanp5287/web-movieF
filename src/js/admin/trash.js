import api from "../api";
import { kiemTraDangNhapAdmin } from "./../../utils/storage";

await kiemTraDangNhapAdmin();

// ========================================
// CẤU HÌNH
// ========================================
const ITEMS_PER_PAGE = 5;

const TYPE_META = {
  movie: {
    label: "Phim",
    endpoint: "/movies",
    icon: "movie",
    color: "text-primary-container",
  },
  season: {
    label: "Mùa phim",
    endpoint: "/season",
    icon: "layers",
    color: "text-tertiary",
  },
  episode: {
    label: "Tập phim",
    endpoint: "/episodes",
    icon: "smart_display",
    color: "text-secondary",
  },
  genre: {
    label: "Thể loại",
    endpoint: "/genres",
    icon: "category",
    color: "text-outline",
  },
};

// Map giá trị filter trên HTML sang loại dữ liệu thật.
const FILTER_TO_TYPE = {
  movie: "movie",
  season: "season",
  episode: "episode",
  category: "genre",
};

// ========================================
// TRẠNG THÁI
// ========================================
let allItems = [];
let filteredItems = [];
let currentPage = 1;
let pendingDelete = null;

// ========================================
// PHẦN TỬ DOM
// ========================================
const tableBody = document.querySelector("#trash-tbody");
const searchInput = document.querySelector("#trash-search");
const typeFilter = document.querySelector("#trash-filter");
const pageRange = document.querySelector("#page-range");
const totalCount = document.querySelector("#total-count");
const paginationControls = document.querySelector("#pagination-controls");
const modal = document.querySelector("#delete-confirm-modal");
const modalBox = document.querySelector("#modal-box");
const targetItemName = document.querySelector("#target-item-name");
const cancelModalBtn = document.querySelector("#cancel-modal-btn");
const confirmDeleteBtn = document.querySelector("#confirm-delete-action-btn");

// ========================================
// TIỆN ÍCH
// ========================================
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function notify({ icon = "info", title = "", text = "" }) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({ icon, title, text });
  }
  alert(text || title);
}

// ========================================
// XÁC ĐỊNH BẢN GHI ĐÃ XÓA MỀM
// Dựa đúng cơ chế đang dùng trong code hiện có.
// ========================================
function isDeletedMovie(movie) {
  // movies.js (deleteMovie): PATCH { status: "Inactive" }
  return movie?.status === "Inactive";
}

function isDeletedSeason(season) {
  // sessionMovies.js: PATCH { isDeleted: true }
  return season?.isDeleted === true;
}

function isDeletedEpisode(episode) {
  // phimBo.js (xoaMemTapPhim): PATCH { status: false }
  return episode?.status === false;
}

function isDeletedGenre(genre) {
  // genres.js (deleteGenre): PATCH "inactive"
  return typeof genre?.status === "string" && genre.status === "inactive";
}

// ========================================
// TẢI DỮ LIỆU ĐÃ XÓA
// ========================================
async function loadTrash() {
  const [movies, seasons, episodes, genres] = await Promise.all([
    api.get("/movies"),
    api.get("/season"),
    api.get("/episodes"),
    api.get("/genres"),
  ]);

  const items = [];

  (Array.isArray(movies) ? movies : [])
    .filter(isDeletedMovie)
    .forEach((movie) =>
      items.push({
        id: movie.id,
        type: "movie",
        name: movie.title || `Phim #${movie.id}`,
        subtitle: `ID: ${movie.id}`,
      }),
    );

  (Array.isArray(seasons) ? seasons : [])
    .filter(isDeletedSeason)
    .forEach((season) =>
      items.push({
        id: season.id,
        type: "season",
        name:
          season.title ||
          (season.seasonNumber
            ? `Mùa ${season.seasonNumber}`
            : `Mùa phim #${season.id}`),
        subtitle: `ID: ${season.id}`,
      }),
    );

  (Array.isArray(episodes) ? episodes : [])
    .filter(isDeletedEpisode)
    .forEach((episode) =>
      items.push({
        id: episode.id,
        type: "episode",
        name: episode.title || `Tập phim #${episode.id}`,
        subtitle: `ID: ${episode.id}`,
      }),
    );

  (Array.isArray(genres) ? genres : [])
    .filter(isDeletedGenre)
    .forEach((genre) =>
      items.push({
        id: genre.id,
        type: "genre",
        name: genre.name || `Thể loại #${genre.id}`,
        subtitle: `ID: ${genre.id}`,
      }),
    );

  return items;
}

// ========================================
// LỌC + PHÂN TRANG
// ========================================
function applyFilters() {
  const keyword = (searchInput?.value ?? "").trim().toLowerCase();
  const filterValue = typeFilter?.value ?? "all";
  const wantedType = FILTER_TO_TYPE[filterValue];

  filteredItems = allItems.filter((item) => {
    const matchType = !wantedType || item.type === wantedType;
    const matchKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      String(item.id).toLowerCase().includes(keyword);

    return matchType && matchKeyword;
  });

  currentPage = 1;
  render();
}

// ========================================
// RENDER
// ========================================
function renderRows() {
  if (filteredItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 text-center text-outline font-body-sm text-body-sm">
          Thùng rác trống.
        </td>
      </tr>
    `;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(start, start + ITEMS_PER_PAGE);

  tableBody.innerHTML = pageItems
    .map((item) => {
      const meta = TYPE_META[item.type];
      return `
        <tr class="hover:bg-surface-container-low/60 transition-colors">
          <td class="py-4 px-space-lg">
            <div class="flex items-center gap-space-md min-w-0">
              <div class="w-8 h-8 rounded bg-surface-container flex items-center justify-center shrink-0 ${meta.color}">
                <span class="material-symbols-outlined text-space-lg">${meta.icon}</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-headline-sm text-headline-sm text-on-surface truncate font-medium">${escapeHtml(item.name)}</span>
                <span class="font-code-sm text-code-sm text-outline truncate">${escapeHtml(item.subtitle)}</span>
              </div>
            </div>
          </td>
          <td class="py-4 px-space-md whitespace-nowrap">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container ${meta.color} font-label-sm text-label-sm font-medium">
              ${meta.label}
            </span>
          </td>
          <td class="py-4 px-space-md whitespace-nowrap font-code-sm text-code-sm text-outline">
            —
          </td>
          <td class="py-4 px-space-md text-center whitespace-nowrap">
            <button
              class="js-restore inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors border border-surface-variant/40"
              data-type="${item.type}"
              data-id="${escapeHtml(item.id)}"
              data-name="${escapeHtml(item.name)}"
              type="button"
            >
              <span class="material-symbols-outlined text-base text-secondary">settings_backup_restore</span>
              <span>Khôi phục</span>
            </button>
          </td>
          <td class="py-4 pr-space-lg pl-space-md text-right whitespace-nowrap">
            <button
              class="js-delete inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-primary-container hover:bg-error-container text-on-primary-container font-label-md text-label-md font-semibold transition-colors active:scale-95 shadow-sm"
              data-type="${item.type}"
              data-id="${escapeHtml(item.id)}"
              data-name="${escapeHtml(item.name)}"
              type="button"
            >
              <span class="material-symbols-outlined text-base">delete_forever</span>
              <span>Xóa vĩnh viễn</span>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPagination() {
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const start = total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, total);

  if (pageRange) pageRange.textContent = total === 0 ? "0 - 0" : `${start} - ${end}`;
  if (totalCount) totalCount.textContent = String(total);

  if (!paginationControls) return;

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  let buttons = `
    <button
      class="js-page p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      data-page="${currentPage - 1}"
      ${prevDisabled ? "disabled" : ""}
      type="button"
    >
      <span class="material-symbols-outlined text-space-lg">chevron_left</span>
    </button>
  `;

  for (let page = 1; page <= totalPages; page += 1) {
    const active = page === currentPage;
    buttons += `
      <button
        class="js-page w-8 h-8 rounded-lg font-label-md text-label-md transition-colors ${
          active
            ? "bg-primary-container text-on-primary-container font-bold"
            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        }"
        data-page="${page}"
        type="button"
      >
        ${page}
      </button>
    `;
  }

  buttons += `
    <button
      class="js-page p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      data-page="${currentPage + 1}"
      ${nextDisabled ? "disabled" : ""}
      type="button"
    >
      <span class="material-symbols-outlined text-space-lg">chevron_right</span>
    </button>
  `;

  paginationControls.innerHTML = buttons;
}

function render() {
  renderRows();
  renderPagination();
}

function renderMessage(html) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="py-10 text-center text-outline font-body-sm text-body-sm">
        ${html}
      </td>
    </tr>
  `;
  if (pageRange) pageRange.textContent = "0 - 0";
  if (totalCount) totalCount.textContent = "0";
  if (paginationControls) paginationControls.innerHTML = "";
}

// ========================================
// KHÔI PHỤC
// ========================================
async function restoreItem(item) {
  const meta = TYPE_META[item.type];
  if (!meta) return;

  if (item.type === "movie") {
    // Không lưu trạng thái gốc: khôi phục về "published" theo quy ước
    // trạng thái hiển thị của Customer (movie-data.js ACTIVE_STATUS).
    await api.patch(`${meta.endpoint}/${encodeURIComponent(item.id)}`, {
      status: "published",
    });
  } else if (item.type === "season") {
    await api.patch(`${meta.endpoint}/${encodeURIComponent(item.id)}`, {
      isDeleted: false,
    });
  } else if (item.type === "episode") {
    await api.patch(`${meta.endpoint}/${encodeURIComponent(item.id)}`, {
      status: true,
    });
  } else if (item.type === "genre") {
    await api.patch(`${meta.endpoint}/${encodeURIComponent(item.id)}`, {
      status: "active",
    });
  }
}

// ========================================
// SỰ KIỆN BẢNG
// ========================================
tableBody?.addEventListener("click", async (event) => {
  const restoreBtn = event.target.closest(".js-restore");
  if (restoreBtn) {
    const { type, id, name } = restoreBtn.dataset;
    restoreBtn.disabled = true;

    try {
      await restoreItem({ type, id, name });
      await notify({
        icon: "success",
        title: "Khôi phục thành công",
        text: `Đã khôi phục "${name}".`,
      });
      await refresh();
    } catch (error) {
      console.error("Lỗi khôi phục:", error);
      await notify({
        icon: "error",
        title: "Khôi phục thất bại",
        text: "Không thể khôi phục dữ liệu. Vui lòng kiểm tra kết nối JSON Server.",
      });
      restoreBtn.disabled = false;
    }
    return;
  }

  const deleteBtn = event.target.closest(".js-delete");
  if (deleteBtn) {
    const { type, id, name } = deleteBtn.dataset;
    pendingDelete = { type, id, name };
    if (targetItemName) targetItemName.textContent = name || "—";
    openModal();
  }
});

// ========================================
// MODAL XÁC NHẬN XÓA VĨNH VIỄN
// ========================================
function openModal() {
  if (!modal) return;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    modalBox?.classList.remove("scale-95");
  });
}

function closeModal() {
  if (!modal) return;
  modal.classList.add("opacity-0");
  modalBox?.classList.add("scale-95");
  setTimeout(() => modal.classList.add("hidden"), 200);
  pendingDelete = null;
}

cancelModalBtn?.addEventListener("click", closeModal);

modal?.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

confirmDeleteBtn?.addEventListener("click", async () => {
  if (!pendingDelete) return;

  const { type, id, name } = pendingDelete;
  const meta = TYPE_META[type];
  if (!meta) return;

  if (confirmDeleteBtn.disabled) return;
  confirmDeleteBtn.disabled = true;

  try {
    await api.delete(`${meta.endpoint}/${encodeURIComponent(id)}`);
    closeModal();
    await notify({
      icon: "success",
      title: "Đã xóa vĩnh viễn",
      text: `"${name}" đã bị xóa hoàn toàn khỏi hệ thống.`,
    });
    await refresh();
  } catch (error) {
    console.error("Lỗi xóa vĩnh viễn:", error);
    await notify({
      icon: "error",
      title: "Xóa thất bại",
      text: "Không thể xóa vĩnh viễn. Vui lòng kiểm tra kết nối JSON Server.",
    });
  } finally {
    confirmDeleteBtn.disabled = false;
  }
});

// ========================================
// BỘ LỌC
// ========================================
searchInput?.addEventListener("input", applyFilters);
typeFilter?.addEventListener("change", applyFilters);

paginationControls?.addEventListener("click", (event) => {
  const btn = event.target.closest(".js-page");
  if (!btn || btn.disabled) return;

  const page = Number(btn.dataset.page);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
  );

  if (!Number.isFinite(page) || page < 1 || page > totalPages) return;

  currentPage = page;
  render();
});

// ========================================
// TẢI LẠI DANH SÁCH
// ========================================
async function refresh() {
  const items = await loadTrash();
  allItems = items;
  applyFilters();
}

// ========================================
// KHỞI TẠO
// ========================================
async function init() {
  renderMessage("Đang tải dữ liệu...");

  try {
    await refresh();
  } catch (error) {
    console.error("Lỗi tải thùng rác:", error);
    renderMessage(
      "Không thể tải dữ liệu thùng rác. Vui lòng kiểm tra kết nối JSON Server.",
    );
  }
}

await init();
