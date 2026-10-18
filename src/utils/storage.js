import api from "../js/api";

// Các vai trò được phép vào khu vực Admin.
const VAI_TRO_ADMIN = ["admin", "staff"];

// Các trang chỉ dành riêng cho Admin (Staff bị chặn).
const TRANG_CHI_ADMIN = ["users", "authorization"];

/**
 * Khi bị từ chối quyền, hàm kiểm tra trả về một Promise không bao giờ resolve.
 * Nhờ đó `await` ở đầu module Admin sẽ dừng luồng khởi tạo mà không cần
 * đặt `return` ở cấp cao nhất của ES module.
 */
const dungKhoiTao = () => new Promise(() => {});

/** Đọc và parse `localStorage.currentUser` một cách an toàn. */
const layNguoiDung = () => {
  const currentUser = localStorage.getItem("currentUser");

  console.log("CURRENT USER:", currentUser);

  if (!currentUser) return null;

  try {
    const user = JSON.parse(currentUser);

    if (!user || typeof user !== "object") return null;

    if (user.roleId === undefined || user.roleId === null || user.roleId === "") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ currentUser sai định dạng JSON:", error);
    return null;
  }
};

/** Lấy vai trò từ API `/roles/:id` theo cấu trúc hiện có của MovieF. */
const layVaiTro = async (user) => {
  try {
    const role = await api.get(`/roles/${String(user.roleId)}`);

    console.log("ROLE:", role);

    if (!role || typeof role.name !== "string") return null;

    const ten = role.name.trim().toLowerCase();

    console.log("ROLE NAME:", ten);

    if (!ten) return null;

    return {
      name: ten,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    };
  } catch (error) {
    console.error("❌ Lỗi lấy vai trò:", error);
    return null;
  }
};

/**
 * Xác định phiên đăng nhập + vai trò.
 * Trả về `{ user, role }` nếu hợp lệ, ngược lại tự chuyển hướng và trả về null.
 */
const xacDinhPhien = async () => {
  const user = layNguoiDung();

  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "/login";
    return null;
  }

  const role = await layVaiTro(user);

  if (!role) {
    // Không xác định được vai trò (API lỗi / dữ liệu sai) => từ chối.
    window.location.href = "/";
    return null;
  }

  return { user, role };
};

/**
 * Kiểm tra quyền vào khu vực Admin (Admin và Staff được phép).
 */
export const kiemTraDangNhapAdmin = async () => {
  const phien = await xacDinhPhien();

  if (!phien) return dungKhoiTao();

  if (!VAI_TRO_ADMIN.includes(phien.role.name)) {
    console.log("❌ Không có quyền vào Admin");
    window.location.href = "/";
    return dungKhoiTao();
  }

  console.log("✅ ĐƯỢC PHÉP VÀO ADMIN");

  return true;
};

/**
 * Kiểm tra quyền truy cập từng trang Admin.
 * - Admin: được phép tất cả.
 * - Staff: bị chặn khỏi trang Quản lý người dùng và Phân quyền.
 * - Viewer / vai trò không hợp lệ: bị chặn khỏi toàn bộ Admin.
 *
 * @param {string} trang Khoá trang: "users" | "authorization" | ...
 */
export const kiemTraQuyenTrang = async (trang) => {
  if (typeof trang !== "string" || !trang.trim()) return dungKhoiTao();

  const phien = await xacDinhPhien();

  if (!phien) return dungKhoiTao();

  const { role } = phien;

  if (role.name === "admin") return true;

  if (role.name === "staff") {
    if (TRANG_CHI_ADMIN.includes(trang)) {
      console.log(`❌ Staff không được truy cập trang: ${trang}`);
      window.location.href = "/";
      return dungKhoiTao();
    }

    return true;
  }

  console.log(`❌ Không có quyền truy cập trang: ${trang}`);
  window.location.href = "/";
  return dungKhoiTao();
};
