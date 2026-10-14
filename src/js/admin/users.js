import { kiemTraDangNhapAdmin } from "./../../utils/storage";
import api from "../api";
await kiemTraDangNhapAdmin();
const loadUsers = async () => {
  try {
    const users = await api.get("/users");

    // const users = res.filter((item) => item.status === "active");

    return users;
  } catch (error) {
    console.log(error);
    return [];
  }
};
const loadRoles = async () => {
  try {
    const roles = await api.get("/roles");
    return roles;
  } catch (error) {
    console.log(error);
    return [];
  }
};
let currentUserPage = 1;
const usersPerPage = 5;

let allUsers = [];
let allRoles = [];
function users(loadUsers, roles) {
  allUsers = loadUsers;

  allRoles = roles;
  const usersList = document.querySelector("#user-list");

  const totalPages = Math.ceil(allUsers.length / usersPerPage);

  if (currentUserPage > totalPages && totalPages > 0) {
    currentUserPage = totalPages;
  }

  const start = (currentUserPage - 1) * usersPerPage;
  const end = start + usersPerPage;

  const usersPage = allUsers.slice(start, end);

  usersList.innerHTML = usersPage
    .map((item) => {
      const role = allRoles.find(
        (role) => Number(role.id) === Number(item.roleId),
      );

      const isAdmin = role?.name === "admin";
      const isBlocked = item.status === "inactive";

      return `
        <tr class="table-row border-t border-gray-800">

          <td class="px-6 py-5">
            <div class="flex items-center gap-3">

              <img
                src="/${item.avatar}"
                alt="${item.fullname}"
                class="w-11 h-11 rounded-full object-cover"
              />

              <div>
                <p class="font-semibold">${item.fullname}</p>
                <p class="text-sm text-gray-500">@${item.username}</p>
              </div>

            </div>
          </td>

          <td class="px-6 py-5 text-gray-300">
            ${item.email}
          </td>

          <td class="px-6 py-5">
            <span
              class="role-admin inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
            >
              <span class="material-symbols-outlined text-sm">
                admin_panel_settings
              </span>

              ${role?.name || "Không xác định"}
            </span>
          </td>

          <td class="px-6 py-5">
            <span
              class="${
                isBlocked ? "status-inactive" : "status-active"
              } inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            >
              <span
                class="w-2 h-2 rounded-full ${
                  isBlocked ? "bg-red-500" : "bg-green-500"
                }"
              ></span>

              ${item.status}
            </span>
          </td>

          <td class="px-6 py-5 text-gray-400">
            ${new Date(item.createdAt).toLocaleDateString("vi-VN")}
          </td>

          <td class="px-6 py-5">
            <div class="flex justify-end gap-2">

              <!-- Xem -->
              <button
                title="Xem"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition"
              >
                <span class="material-symbols-outlined text-lg">
                  visibility
                </span>
              </button>

              <!-- Sửa -->
              <button
                title="Sửa"
                onclick="openEditUserModal('${item.id}')"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition"
              >
                <span class="material-symbols-outlined text-lg">
                  edit
                </span>
              </button>

              <!-- Khóa / Mở tài khoản -->
              ${
                isAdmin
                  ? ""
                  : isBlocked
                    ? `
                      <button
                        title="Mở tài khoản"
                        onclick="unblockUser('${item.id}')"
                        class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-green-600 flex items-center justify-center transition"
                      >
                        <span class="material-symbols-outlined text-lg">
                          lock_open
                        </span>
                      </button>
                    `
                    : `
                      <button
                        title="Khóa tài khoản"
                        onclick="blockUser('${item.id}', '${item.roleId}')"
                        class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-red-600 flex items-center justify-center transition"
                      >
                        <span class="material-symbols-outlined text-lg">
                          block
                        </span>
                      </button>
                    `
              }

            </div>
          </td>

        </tr>
      `;
    })
    .join("");

  renderUserPagination(totalPages);
}
function renderUserPagination(totalPages) {
  const pagination = document.querySelector("#user-pagination");

  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <div class="flex items-center justify-between mt-6">

      <span class="text-sm text-gray-400">
        Trang ${currentUserPage} / ${totalPages}
      </span>

      <div class="flex items-center gap-2">

        <button
          type="button"
          onclick="previousUserPage()"
          ${currentUserPage === 1 ? "disabled" : ""}
          class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Trước
        </button>

        ${Array.from(
          { length: totalPages },
          (_, i) => `
          <button
            type="button"
            onclick="goToUserPage(${i + 1})"
            class="w-9 h-9 rounded-lg ${
              currentUserPage === i + 1
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }"
          >
            ${i + 1}
          </button>
        `,
        ).join("")}

        <button
          type="button"
          onclick="nextUserPage()"
          ${currentUserPage === totalPages ? "disabled" : ""}
          class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sau
        </button>

      </div>
    </div>
  `;
}
function goToUserPage(page) {
  currentUserPage = page;

  const roles = allRoles;

  users(allUsers, roles);
}

function previousUserPage() {
  if (currentUserPage > 1) {
    currentUserPage--;

    users(allUsers, allRoles);
  }
}

function nextUserPage() {
  const totalPages = Math.ceil(allUsers.length / usersPerPage);

  if (currentUserPage < totalPages) {
    currentUserPage++;

    users(allUsers, allRoles);
  }
}
const data = await loadUsers();
const rolesData = await loadRoles();
users(data, rolesData);
window.goToUserPage = goToUserPage;
window.nextUserPage = nextUserPage;
window.previousUserPage = previousUserPage;

async function blockUser(idUser, roleId) {
  try {
    const role = await api.get(`/roles/${roleId}`);

    // Không cho khóa tài khoản admin
    if (role.name === "admin") {
      Swal.fire({
        icon: "warning",
        title: "Không thể khóa tài khoản",
        text: "Đây là tài khoản admin, không thể khóa tài khoản này.",
        confirmButtonText: "Đã hiểu",
      });
      return;
    }

    // Khóa tài khoản
    const userBlock = await api.patch(`/users/${idUser}`, {
      status: "inactive",
    });

    // Chỉ hiện Toast khi khóa thành công
    if (userBlock) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Đã khóa tài khoản ${userBlock.fullname ?? ""}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      // Render lại để nút thao tác chuyển sang "Mở tài khoản"
      const freshUsers = await loadUsers();
      users(freshUsers, allRoles);
    }
  } catch (error) {
    console.log(error);
  }
}

window.blockUser = blockUser;

async function unblockUser(idUser) {
  try {
    const userUnblock = await api.patch(`/users/${idUser}`, {
      status: "active",
    });

    if (userUnblock) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Đã mở khóa tài khoản ${userUnblock.fullname ?? ""}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      // Render lại để nút thao tác chuyển sang "Khóa tài khoản"
      const freshUsers = await loadUsers();
      users(freshUsers, allRoles);
    }
  } catch (error) {
    console.log(error);
  }
}

window.unblockUser = unblockUser;

/* ============================================================
   MODAL CHỈNH SỬA NGƯỜI DÙNG
   ============================================================ */
const userModal = document.getElementById("userModal");

// Chỉ đọc giá trị status đang thực sự dùng trong db.json
const USER_STATUS_VALUES = ["active", "inactive"];

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function showFormError(message) {
  const box = document.getElementById("userFormError");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearFormError() {
  const box = document.getElementById("userFormError");
  box.textContent = "";
  box.classList.add("hidden");
}

function closeUserModal() {
  userModal.classList.add("hidden");
  clearFormError();
}

// Đóng khi click ra ngoài vùng modal
function handleUserModalOverlay(event) {
  if (event.target === userModal) {
    closeUserModal();
  }
}

// Đóng khi nhấn Esc
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !userModal.classList.contains("hidden")) {
    closeUserModal();
  }
});

// Điền danh sách vai trò lấy trực tiếp từ collection roles
function renderRoleOptions(selectedRoleId) {
  const select = document.getElementById("userRoleId");
  select.innerHTML = allRoles
    .map((role) => {
      const value = role.id;
      const selected =
        Number(value) === Number(selectedRoleId) ? " selected" : "";
      return `<option value="${value}"${selected}>${
        role.displayName || role.name
      } (${role.name})</option>`;
    })
    .join("");
}

function openEditUserModal(id) {
  const user = allUsers.find((item) => String(item.id) === String(id));

  if (!user) {
    Swal.fire({
      icon: "error",
      title: "Không tìm thấy người dùng",
      text: "Vui lòng tải lại trang và thử lại.",
    });
    return;
  }

  document.getElementById("userModalTitle").textContent = "Chỉnh sửa người dùng";

  document.getElementById("userId").value = user.id;
  document.getElementById("userFullname").value = user.fullname ?? "";
  document.getElementById("userEmail").value = user.email ?? "";
  // Nhiều tài khoản trong db.json chưa có field username
  document.getElementById("userUsername").value = user.username ?? "";

  renderRoleOptions(user.roleId);

  const statusSelect = document.getElementById("userStatus");
  statusSelect.value = USER_STATUS_VALUES.includes(user.status)
    ? user.status
    : USER_STATUS_VALUES[0];

  clearFormError();
  userModal.classList.remove("hidden");
  document.getElementById("userFullname").focus();
}

function validateUserForm({ id, fullname, email, username, roleId, status }) {
  if (!fullname) {
    return "Vui lòng nhập họ tên.";
  }

  if (!email) {
    return "Vui lòng nhập email.";
  }

  if (!isValidEmail(email)) {
    return "Email không hợp lệ. Ví dụ: nguyen@movief.com";
  }

  // username là optional — chỉ check trùng khi thực sự có giá trị
  if (username) {
    const duplicated = allUsers.some(
      (item) =>
        String(item.id) !== String(id) &&
        String(item.username ?? "")
          .trim()
          .toLowerCase() === username.toLowerCase(),
    );

    if (duplicated) {
      return "Username đã tồn tại. Vui lòng chọn username khác.";
    }
  }

  const roleExists = allRoles.some((role) => Number(role.id) === Number(roleId));
  if (!roleExists) {
    return "Vai trò không hợp lệ.";
  }

  if (!USER_STATUS_VALUES.includes(status)) {
    return "Trạng thái không hợp lệ.";
  }

  return null;
}

async function handleSaveUser(event) {
  event.preventDefault();

  const id = document.getElementById("userId").value;
  const fullname = document.getElementById("userFullname").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const username = document.getElementById("userUsername").value.trim();
  const roleId = document.getElementById("userRoleId").value;
  const status = document.getElementById("userStatus").value;

  const errorMessage = validateUserForm({
    id,
    fullname,
    email,
    username,
    roleId,
    status,
  });

  if (errorMessage) {
    showFormError(errorMessage);

    Swal.fire({
      icon: "warning",
      title: "Thông tin chưa hợp lệ",
      text: errorMessage,
      confirmButtonText: "Đã hiểu",
    });
    return;
  }

  const submitBtn = document.getElementById("userSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang lưu...";

  // Chỉ gửi các field được phép sửa — không đụng id / createdAt / password
  const payload = { fullname, email, roleId: Number(roleId), status };

  if (username) {
    payload.username = username;
  }

  try {
    const updated = await api.patch(`/users/${id}`, payload);

    if (!updated || updated.id === undefined) {
      throw new Error("Phản hồi từ máy chủ không hợp lệ");
    }

    closeUserModal();

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Đã cập nhật người dùng ${updated.fullname || fullname}`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });

    // Render lại danh sách từ API để nút Khóa/Mở cập nhật theo status mới
    const freshUsers = await loadUsers();
    users(freshUsers, allRoles);
  } catch (error) {
    console.log(error);

    showFormError("Không thể lưu thay đổi. Vui lòng thử lại.");

    Swal.fire({
      icon: "error",
      title: "Cập nhật thất bại",
      text: "Không thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.",
      confirmButtonText: "Đã hiểu",
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Lưu thay đổi";
  }
}

window.openEditUserModal = openEditUserModal;
window.closeUserModal = closeUserModal;
window.handleUserModalOverlay = handleUserModalOverlay;
window.handleSaveUser = handleSaveUser;
