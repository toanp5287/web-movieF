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
