import api from "../api";

// 1. Dữ liệu module và các quyền
const PERMISSION_MODULES = [
  {
    moduleKey: "dashboard",
    title: "Nhóm 1: Bảng điều khiển (Dashboard)",
    icon: "analytics",
    permissions: [
      {
        key: "dashboard.view",
        name: "Xem thống kê Dashboard",
        desc: "Truy cập tổng quan số liệu hệ thống, doanh thu và lưu lượng",
      },
    ],
  },
  {
    moduleKey: "movie",
    title: "Nhóm 2: Quản lý Phim (Movies)",
    icon: "theaters",
    permissions: [
      {
        key: "movie.view",
        name: "Xem phim",
        desc: "Xem dữ liệu phim, phát video nội dung trực tuyến",
      },
      {
        key: "movie.create",
        name: "Thêm phim mới",
        desc: "Đăng tải phim mới, upload trailer và các tập phim",
      },
      {
        key: "movie.update",
        name: "Cập nhật phim",
        desc: "Sửa metadata, poster, thông số và trạng thái phát hành",
      },
      {
        key: "movie.delete",
        name: "Xóa phim",
        desc: "Gỡ bỏ phim hoàn toàn khỏi cơ sở dữ liệu và kho media",
      },
    ],
  },
  {
    moduleKey: "genre",
    title: "Nhóm 3: Quản lý Thể loại (Genres)",
    icon: "category",
    permissions: [
      {
        key: "genre.view",
        name: "Xem thể loại",
        desc: "Tra cứu danh mục và phân nhóm lọc thể loại",
      },
      {
        key: "genre.create",
        name: "Tạo thể loại mới",
        desc: "Tạo danh mục thể loại (Hành động, Anime, Kinh dị,...)",
      },
      {
        key: "genre.update",
        name: "Sửa thể loại",
        desc: "Chỉnh sửa tên danh mục, đường dẫn slug và mô tả",
      },
      {
        key: "genre.delete",
        name: "Xóa thể loại",
        desc: "Gỡ bỏ danh mục thể loại khỏi hệ thống",
      },
    ],
  },
  {
    moduleKey: "user",
    title: "Nhóm 4: Quản lý Người dùng (Users)",
    icon: "group",
    permissions: [
      {
        key: "user.view",
        name: "Xem danh sách người dùng",
        desc: "Truy vấn hồ sơ, thông tin tài khoản và gói thành viên",
      },
      {
        key: "user.create",
        name: "Tạo người dùng mới",
        desc: "Tạo tài khoản nhân viên hoặc tài khoản người xem thủ công",
      },
      {
        key: "user.update",
        name: "Cập nhật tài khoản",
        desc: "Phân quyền vai trò, thay đổi trạng thái kích hoạt",
      },
      {
        key: "user.delete",
        name: "Khóa / Xóa tài khoản",
        desc: "Khóa hoặc xóa vĩnh viễn tài khoản người dùng",
      },
    ],
  },
  {
    moduleKey: "review",
    title: "Nhóm 5: Đánh giá & Bình luận (Reviews)",
    icon: "reviews",
    permissions: [
      {
        key: "review.view",
        name: "Xem đánh giá",
        desc: "Xem danh sách bình luận và số sao xếp hạng",
      },
      {
        key: "review.create",
        name: "Viết đánh giá",
        desc: "Gửi bình luận và chấm điểm sao cho phim",
      },
      {
        key: "review.update",
        name: "Chỉnh sửa đánh giá",
        desc: "Chỉnh sửa nội dung đánh giá của chính mình",
      },
      {
        key: "review.delete",
        name: "Xóa đánh giá",
        desc: "Xóa bình luận vi phạm hoặc đánh giá của chính mình",
      },
    ],
  },
  {
    moduleKey: "client",
    title: "Nhóm 6: Tính năng cá nhân người xem (Client Features)",
    icon: "account_circle",
    permissions: [
      {
        key: "favorite.manage",
        name: "Quản lý phim yêu thích",
        desc: "Thêm hoặc bớt phim khỏi Watchlist cá nhân",
      },
      {
        key: "history.manage",
        name: "Quản lý lịch sử xem",
        desc: "Tự động lưu playback và quản lý danh sách đã xem",
      },
      {
        key: "profile.update",
        name: "Cập nhật hồ sơ cá nhân",
        desc: "Đổi ảnh đại diện, tên hiển thị và mật khẩu cá nhân",
      },
    ],
  },
];

// 2. Dữ liệu vai trò mặc định
const INITIAL_ROLES = [
  {
    id: "1",
    name: "admin",
    displayName: "Quản trị viên",
    description: "Quản lý toàn bộ hệ thống MovieF",
    permissions: [
      "dashboard.view",
      "movie.view",
      "movie.create",
      "movie.update",
      "movie.delete",
      "genre.view",
      "genre.create",
      "genre.update",
      "genre.delete",
      "user.view",
      "user.create",
      "user.update",
      "user.delete",
      "review.view",
      "review.delete",
    ],
  },
  {
    id: "2",
    name: "staff",
    displayName: "Nhân viên",
    description: "Quản lý nội dung phim và đánh giá",
    permissions: [
      "movie.view",
      "movie.create",
      "movie.update",
      "genre.view",
      "genre.create",
      "genre.update",
      "review.view",
      "review.delete",
    ],
  },
  {
    id: "3",
    name: "viewer",
    displayName: "Người xem",
    description: "Người dùng xem phim và sử dụng các chức năng cá nhân",
    permissions: [
      "movie.view",
      "genre.view",
      "favorite.manage",
      "history.manage",
      "review.create",
      "review.update",
      "review.delete",
      "profile.update",
    ],
  },
];

let currentRoles = [];
let isDirty = false;

// Kiểm tra phản hồi HTTP
async function requestApi(method, endpoint, data) {
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${endpoint}`);
  }

  return response.json();
}

// 3. Tải vai trò từ JSON Server
async function loadRoles() {
  try {
    const roles = await api.get("/roles");

    if (!Array.isArray(roles)) {
      throw new Error("Dữ liệu roles không hợp lệ");
    }

    currentRoles = roles.map((role) => ({
      ...role,
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
    }));

    isDirty = false;
    renderTable();
    updateStatus("Đã tải dữ liệu phân quyền", "normal");
  } catch (error) {
    console.error("Lỗi tải vai trò:", error);
    showToast("Không thể tải dữ liệu phân quyền!");
    updateStatus("Tải dữ liệu thất bại", "error");
  }
}

// 4. Render bảng phân quyền
function renderTable() {
  const tbody = document.getElementById("matrix-tbody");
  if (!tbody) return;

  let html = "";

  PERMISSION_MODULES.forEach((mod) => {
    html += `
      <tr class="bg-surface-container-lowest module-header"
          data-module="${mod.moduleKey}">
        <td class="py-3 pl-space-md font-headline-sm text-headline-sm text-on-surface"
            colspan="4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-xl">${mod.icon}</span>
            <span>${mod.title}</span>
          </div>
        </td>
      </tr>
    `;

    mod.permissions.forEach((perm) => {
      html += `
        <tr class="perm-row hover:bg-surface-container-high/40 transition-colors"
            data-perm-key="${perm.key}">
          <td class="py-3 pl-space-md">
            <div class="flex items-center gap-2">
              <span class="font-headline-sm text-headline-sm text-on-surface">${perm.name}</span>
              <code class="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">${perm.key}</code>
            </div>
            <div class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${perm.desc}</div>
          </td>
          ${renderCheckboxCell("admin", perm.key, "bg-primary-container/5")}
          ${renderCheckboxCell("staff", perm.key, "bg-secondary-container/10")}
          ${renderCheckboxCell("viewer", perm.key, "bg-surface-container-highest/10")}
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;
}

function renderCheckboxCell(roleName, permKey, bgClass) {
  const role = currentRoles.find((item) => item.name === roleName);
  const isChecked = role?.permissions.includes(permKey) ?? false;

  return `
    <td class="py-3 px-space-md text-center ${bgClass}">
      <label class="inline-flex items-center justify-center p-2 cursor-pointer">
        <input
          type="checkbox"
          class="perm-checkbox w-5 h-5 rounded border-surface-container-highest text-primary focus:ring-primary cursor-pointer accent-primary"
          data-role="${roleName}"
          data-perm="${permKey}"
          ${isChecked ? "checked" : ""}
        />
      </label>
    </td>
  `;
}

// 5. Cập nhật trạng thái thông báo
function updateStatus(message, type = "normal") {
  const notice = document.getElementById("status-notice");
  if (!notice) return;

  notice.textContent = message;

  if (type === "dirty") {
    notice.className =
      "font-label-sm text-label-sm text-amber-500 font-semibold";
  } else if (type === "error") {
    notice.className = "font-label-sm text-label-sm text-red-500 font-semibold";
  } else {
    notice.className = "font-label-sm text-label-sm text-primary font-medium";
  }
}

// 6. Bắt sự kiện checkbox
document.addEventListener("change", (event) => {
  const checkbox = event.target;

  if (!checkbox.matches(".perm-checkbox")) return;

  const roleName = checkbox.dataset.role;
  const permKey = checkbox.dataset.perm;
  const targetRole = currentRoles.find((role) => role.name === roleName);

  if (!targetRole) return;

  if (checkbox.checked) {
    if (!targetRole.permissions.includes(permKey)) {
      targetRole.permissions.push(permKey);
    }
  } else {
    targetRole.permissions = targetRole.permissions.filter(
      (permission) => permission !== permKey,
    );
  }

  isDirty = true;
  updateStatus("Có thay đổi chưa lưu", "dirty");
});

// 7. Lưu quyền vào JSON Server
document.getElementById("btn-save")?.addEventListener("click", async () => {
  const saveBtn = document.getElementById("btn-save");
  if (!saveBtn || saveBtn.disabled) return;

  const originalText = saveBtn.innerHTML;

  saveBtn.disabled = true;
  saveBtn.innerHTML = `
    <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
    <span>Đang lưu...</span>
  `;

  try {
    // Chỉ gửi trường permissions, không ghi đè thông tin vai trò.
    for (const role of currentRoles) {
      await requestApi("PATCH", `/roles/${role.id}`, {
        permissions: role.permissions,
      });
    }

    isDirty = false;
    updateStatus(`Đã đồng bộ lúc ${new Date().toLocaleTimeString("vi-VN")}`);
    showToast("Cập nhật ma trận phân quyền thành công!");
  } catch (error) {
    console.error("Lỗi lưu phân quyền:", error);
    updateStatus("Lưu thất bại, vui lòng thử lại", "error");
    showToast("Lưu thất bại, vui lòng thử lại!");
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
});

// 8. Đặt lại quyền mặc định và lưu vào JSON Server
document.getElementById("btn-reset")?.addEventListener("click", async () => {
  if (
    !confirm("Khôi phục phân quyền về mặc định ban đầu và lưu vào hệ thống?")
  ) {
    return;
  }

  const resetBtn = document.getElementById("btn-reset");
  if (resetBtn) resetBtn.disabled = true;

  try {
    const rolesFromServer = await api.get("/roles");

    for (const initialRole of INITIAL_ROLES) {
      const existingRole = rolesFromServer.find(
        (role) => role.id === initialRole.id,
      );

      if (!existingRole) {
        throw new Error(`Không tìm thấy vai trò ${initialRole.name}`);
      }

      await requestApi("PATCH", `/roles/${initialRole.id}`, {
        permissions: [...initialRole.permissions],
      });
    }

    await loadRoles();
    showToast("Đã khôi phục phân quyền mặc định!");
  } catch (error) {
    console.error("Lỗi khôi phục phân quyền:", error);
    showToast("Khôi phục thất bại, vui lòng thử lại!");
    updateStatus("Khôi phục thất bại", "error");
  } finally {
    if (resetBtn) resetBtn.disabled = false;
  }
});

// 9. Tìm kiếm quyền
document.getElementById("matrix-search")?.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  const rows = document.querySelectorAll(".perm-row");
  const headers = document.querySelectorAll(".module-header");

  rows.forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(query)
      ? ""
      : "none";
  });

  headers.forEach((header) => {
    const moduleKey = header.dataset.module;
    const relatedRows = document.querySelectorAll(
      `tr[data-perm-key^="${moduleKey}."]`,
    );

    const hasVisible = Array.from(relatedRows).some(
      (row) => row.style.display !== "none",
    );

    header.style.display = query === "" || hasVisible ? "" : "none";
  });
});

// 10. Toast thông báo
function showToast(message) {
  const toast = document.getElementById("save-toast");
  const toastMsg = document.getElementById("toast-message");

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.remove("translate-y-20", "opacity-0", "pointer-events-none");

  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0", "pointer-events-none");
  }, 3000);
}

// 11. Khởi chạy
loadRoles();
