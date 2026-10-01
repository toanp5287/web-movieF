import { kiemTraDangNhapAdmin } from "./../../utils/storage";
import api from "../api";
await kiemTraDangNhapAdmin();
const loadUsers = async () => {
  try {
    const res = await api.get("/users");

    const users = res.filter((item) => item.status === "active");

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
    .map(
      (item) => `
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

              ${
                allRoles.find((role) => Number(role.id) === Number(item.roleId))
                  ?.name || "Không xác định"
              }
            </span>
          </td>

          <td class="px-6 py-5">
            <span
              class="status-active inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            >
              <span class="w-2 h-2 rounded-full bg-green-500"></span>

              ${item.status}
            </span>
          </td>

          <td class="px-6 py-5 text-gray-400">
            ${new Date(item.createdAt).toLocaleDateString("vi-VN")}
          </td>

          <td class="px-6 py-5">
            <div class="flex justify-end gap-2">

              <button
                title="Xem"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition"
              >
                <span class="material-symbols-outlined text-lg">
                  visibility
                </span>
              </button>

              <button
                title="Sửa"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition"
              >
                <span class="material-symbols-outlined text-lg">
                  edit
                </span>
              </button>

              <button
                title="Khóa tài khoản"
                onclick="blockUser(${item.id}, ${item.roleId})"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-red-600 flex items-center justify-center transition"
              >
                <span class="material-symbols-outlined text-lg">
                  block
                </span>
              </button>

            </div>
          </td>

        </tr>
      `,
    )
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
        title: `Đã khóa tài khoản ${userBlock.name}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    console.log(error);
  }
}

window.blockUser = blockUser;
