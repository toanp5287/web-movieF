import { kiemTraDangNhapAdmin } from "./../../utils/storage";
import api from "../api";

await kiemTraDangNhapAdmin();

// ===============================
// BIẾN
// ===============================

let genres = [];

const tableBody = document.getElementById("tableBody");
const recordCount = document.getElementById("recordCount");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const modal = document.getElementById("genreModal");

// ===============================
// LOAD THỂ LOẠI
// ===============================

const genresLoad = async () => {
  try {
    const data = await api.get("/genres");

    genres = data;

    return genres;
  } catch (error) {
    console.log(error);
    genres = [];
    return [];
  }
};

// ===============================
// RENDER
// ===============================

function render(data) {
  recordCount.textContent = data.length;

  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="py-10 text-center text-zinc-500 text-xs"
        >
          Không tìm thấy thể loại nào phù hợp.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = data
    .map(
      (item) => `
        <tr class="hover:bg-zinc-800/30 transition-colors">

          <!-- ID -->
          <td class="py-3.5 px-5 font-mono text-xs text-zinc-500">
            #${item.id}
          </td>

          <!-- Tên -->
          <td class="py-3.5 px-5 font-medium text-white">
            ${item.name}
          </td>

          <!-- Slug -->
          <td class="py-3.5 px-5 font-mono text-xs text-zinc-400">
            ${item.slug}
          </td>

          <!-- Trạng thái -->
          <td class="py-3.5 px-5">
            ${
              item.status === "active"
                ? `
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    ></span>

                    Hoạt động
                  </span>
                `
                : `
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-zinc-400"
                    ></span>

                    Tạm ẩn
                  </span>
                `
            }
          </td>

          <!-- Action -->
          <td class="py-3.5 px-5 text-right space-x-1">

            <button
              onclick="editGenre('${item.id}')"
              class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Sửa"
            >
              <span class="material-symbols-outlined text-base">
                edit
              </span>
            </button>

            <button
              onclick="deleteGenre('${item.id}')"
              class="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Xóa"
            >
              <span class="material-symbols-outlined text-base">
                delete
              </span>
            </button>

          </td>

        </tr>
      `,
    )
    .join("");
}

// ===============================
// TÌM KIẾM + LỌC
// ===============================

function filterData() {
  const keyword = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = genres.filter((item) => {
    const matchKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.slug.toLowerCase().includes(keyword);

    const matchStatus = !status || item.status === status;

    return matchKeyword && matchStatus;
  });

  render(filtered);
}

// ===============================
// EVENT FILTER
// ===============================

searchInput.addEventListener("input", filterData);

statusFilter.addEventListener("change", filterData);

// ===============================
// RESET FILTER
// ===============================

function resetFilter() {
  searchInput.value = "";
  statusFilter.value = "";

  render(genres);
}

// ===============================
// TỰ ĐỘNG TẠO SLUG
// ===============================

function autoGenerateSlug(text) {
  if (document.getElementById("genreId").value) {
    return;
  }

  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  document.getElementById("genreSlug").value = slug;
}

function openModal() {
  document.getElementById("genreForm").reset();

  document.getElementById("genreId").value = "";

  document.getElementById("modalTitle").textContent = "Thêm thể loại mới";

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

function editGenre(id) {
  const item = genres.find((genre) => String(genre.id) === String(id));

  if (!item) {
    return;
  }

  document.getElementById("genreId").value = item.id;

  document.getElementById("genreName").value = item.name;

  document.getElementById("genreSlug").value = item.slug;

  document.getElementById("genreStatus").value = item.status;

  document.getElementById("modalTitle").textContent = "Chỉnh sửa thể loại";

  modal.classList.remove("hidden");
}

async function handleSave(e) {
  e.preventDefault();

  const id = document.getElementById("genreId").value;
  const name = document.getElementById("genreName").value.trim();
  const slug = document.getElementById("genreSlug").value.trim();
  const status = document.getElementById("genreStatus").value;

  if (!name || !slug) {
    alert("Vui lòng nhập đầy đủ thông tin.");
    return;
  }

  try {
    if (id) {
      // Chỉnh sửa
      const updatedGenre = {
        id,
        name,
        slug,
        status,
      };

      await api.put(`/genres/${id}`, updatedGenre);

      const index = genres.findIndex(
        (genre) => String(genre.id) === String(id),
      );

      if (index !== -1) {
        genres[index] = updatedGenre;
      }
    } else {
      // Thêm mới
      const newGenre = {
        id: String(Date.now()),
        name,
        slug,
        status,
      };

      const result = await api.post("/genres", newGenre);

      genres.unshift(result || newGenre);
    }

    closeModal();
    filterData();
  } catch (error) {
    console.log(error);
    alert("Có lỗi xảy ra. Vui lòng thử lại.");
  }
}

async function deleteGenre(id) {
  const confirmDelete = confirm("Bạn có chắc chắn muốn xóa thể loại này?");

  if (!confirmDelete) {
    return;
  }

  try {
    await api.patch(`/genres/${id}`, "inactive");

    genres = genres.filter(
      (genre) => String(genre.status) !== String("inactive"),
    );

    filterData();
  } catch (error) {
    console.log(error);

    alert("Xóa thể loại thất bại.");
  }
}

const data = await genresLoad();

render(data);

window.editGenre = editGenre;
window.deleteGenre = deleteGenre;
window.openModal = openModal;
window.closeModal = closeModal;
window.resetFilter = resetFilter;
window.autoGenerateSlug = autoGenerateSlug;
window.handleSave = handleSave;
