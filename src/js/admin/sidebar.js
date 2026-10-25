import api from "../api.js";

const ROUTE_TO_NAV = {
  "/admin": "dashboard",
  "/admin/movies": "movies",
  "/admin/addMovie": "movies",
  "/admin/editMovie": "movies",
  "/admin/session": "session",
  "/admin/episodes": "episodes",
  "/admin/genres": "genres",
  "/admin/users": "users",
  "/admin/authorization": "authorization",
  "/admin/reviews": "reviews",
  "/admin/trash": "trash",
};

const FILE_TO_NAV = {
  "dashboard.html": "dashboard",
  "movies.html": "movies",
  "addmovie.html": "movies",
  "editmovie.html": "movies",
  "sessionmovies.html": "session",
  "phimbo.html": "episodes",
  "genres.html": "genres",
  "users.html": "users",
  "authorization.html": "authorization",
  "reviews.html": "reviews",
  "trash.html": "trash",
};

function resolveActiveNav() {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";

  if (ROUTE_TO_NAV[path]) {
    return ROUTE_TO_NAV[path];
  }

  const file = path.split("/").pop().toLowerCase();

  return FILE_TO_NAV[file] || null;
}

function applyActiveNav() {
  const activeNav = resolveActiveNav();
  const items = document.querySelectorAll(".sidebar .menu-item[data-nav]");

  items.forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === activeNav);
  });
}

applyActiveNav();

// Ẩn các mục Quản lý người dùng / Phân quyền với vai trò không phải Admin.
// Đây chỉ là lớp giao diện; việc chặn URL vẫn do storage.js đảm nhiệm.
async function anMenuTheoQuyen() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return;

    const user = JSON.parse(raw);

    if (!user || user.roleId === undefined || user.roleId === null) return;

    const role = await api.get(`/roles/${String(user.roleId)}`);
    const ten = String(role?.name || "")
      .trim()
      .toLowerCase();

    if (ten === "admin") return;

    document
      .querySelectorAll(
        '.sidebar .menu-item[data-nav="users"], .sidebar .menu-item[data-nav="authorization"]',
      )
      .forEach((item) => {
        item.style.display = "none";
      });
  } catch (error) {
    console.error("❌ Lỗi ẩn menu theo quyền:", error);
  }
}

anMenuTheoQuyen();

// ========================================
// MENU BA CHẤM (Trang chủ / Đăng xuất)
// ========================================
(function khoiTaoMenuBaCham() {
  const nut = document.querySelector(".sidebar-account-btn");

  if (!nut) return;

  // Chống khởi tạo/đăng ký lặp nếu script chạy lại.
  if (nut.dataset.menuReady === "true") return;
  nut.dataset.menuReady = "true";

  // Chèn CSS dùng chung cho menu (không sửa file CSS/HTML nào khác).
  if (!document.getElementById("sidebar-more-menu-style")) {
    const style = document.createElement("style");
    style.id = "sidebar-more-menu-style";
    style.textContent = `
      .sidebar-more-menu {
        position: fixed;
        display: none;
        z-index: 9999;
        min-width: 11rem;
        padding: 0.25rem;
        background: #171717;
        border: 1px solid #292929;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        font-family: inherit;
      }

      .sidebar-more-menu.is-open {
        display: block;
      }

      .sidebar-more-menu-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.625rem 0.75rem;
        background: transparent;
        border: 0;
        border-radius: 8px;
        color: #e4e4e7;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .sidebar-more-menu-item:hover {
        background: #27272a;
        color: #ffffff;
      }

      .sidebar-more-menu-item .material-symbols-outlined {
        font-size: 18px;
      }

      .sidebar-more-menu-item[data-menu-action="logout"] {
        color: #f87171;
      }

      .sidebar-more-menu-item[data-menu-action="logout"]:hover {
        background: rgba(229, 9, 20, 0.12);
        color: #fca5a5;
      }
    `;
    document.head.appendChild(style);
  }

  // Tạo menu (một lần duy nhất).
  const menu = document.createElement("div");
  menu.className = "sidebar-more-menu";
  menu.innerHTML = `
    <button type="button" class="sidebar-more-menu-item" data-menu-action="home">
      <span class="material-symbols-outlined">home</span>
      <span>Trang chủ</span>
    </button>
    <button type="button" class="sidebar-more-menu-item" data-menu-action="logout">
      <span class="material-symbols-outlined">logout</span>
      <span>Đăng xuất</span>
    </button>
  `;
  document.body.appendChild(menu);

  let dangMo = false;

  // Đặt menu ngay trên nút ba chấm, không bị che khuất.
  function datViTri() {
    const r = nut.getBoundingClientRect();

    menu.style.left = `${Math.max(8, r.left)}px`;
    menu.style.bottom = `${window.innerHeight - r.top + 8}px`;
    menu.style.top = "auto";
  }

  function moMenu() {
    datViTri();
    menu.classList.add("is-open");
    dangMo = true;
  }

  function dongMenu() {
    menu.classList.remove("is-open");
    dangMo = false;
  }

  // Đăng xuất theo cơ chế hiện có của dự án (giống header người xem).
  async function xuLyDangXuat() {
    let daXacNhan = false;

    if (typeof Swal !== "undefined") {
      const xacNhan = await Swal.fire({
        icon: "warning",
        title: "Đăng xuất?",
        text: "Bạn có chắc chắn muốn đăng xuất khỏi MovieF?",
        showCancelButton: true,
        confirmButtonText: "Đăng xuất",
        cancelButtonText: "Hủy",
        confirmButtonColor: "#e50914",
        reverseButtons: true,
      });

      daXacNhan = Boolean(xacNhan.isConfirmed);
    } else {
      daXacNhan = window.confirm(
        "Bạn có chắc chắn muốn đăng xuất khỏi MovieF?",
      );
    }

    if (!daXacNhan) return;

    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("redirectAfterLogin");

    window.location.href = "/";
  }

  nut.addEventListener("click", (event) => {
    event.stopPropagation();
    dangMo ? dongMenu() : moMenu();
  });

  menu.addEventListener("click", (event) => {
    const bam = event.target.closest("[data-menu-action]");
    if (!bam) return;

    const hanhDong = bam.dataset.menuAction;

    if (hanhDong === "home") {
      dongMenu();
      window.location.href = "/";
      return;
    }

    if (hanhDong === "logout") {
      // Giữ menu đóng trong khi chờ xác nhận.
      dongMenu();
      xuLyDangXuat();
    }
  });

  // Nhấn ra ngoài thì đóng.
  document.addEventListener("click", (event) => {
    if (!dangMo) return;
    if (menu.contains(event.target) || nut.contains(event.target)) return;
    dongMenu();
  });

  // Nhấn Escape thì đóng.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dongMenu();
  });

  // Đóng menu khi cuộn để vị trí fixed không lệch khỏi nút.
  window.addEventListener("scroll", () => {
    if (dangMo) dongMenu();
  });
})();
