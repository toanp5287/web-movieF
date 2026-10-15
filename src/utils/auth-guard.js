/**
 * File: src/utils/auth-guard.js
 * Mục đích: Kiểm tra quyền truy cập các trang yêu cầu đăng nhập,
 * cung cấp hàm chuyển hướng người dùng chưa đăng nhập đến trang đăng nhập.
 *
 * Tái sử dụng cơ chế hiện có:
 *  - auth-session.js: kiemTraDangNhap(), layThongTinNguoiDung()
 *  - session-storage.js: luuTrangChuyenHuongSauDangNhap()
 *
 * File này KHÔNG tự động tích hợp vào trang HTML hoặc JavaScript cũ.
 * Chỉ cung cấp hàm để module khác gọi.
 * KHÔNG coi kiểm tra frontend là biện pháp bảo mật duy nhất.
 */

import { kiemTraDangNhap } from "./auth-session.js";
import { luuTrangChuyenHuongSauDangNhap } from "./session-storage.js";

// Danh sách đường dẫn công khai (không yêu cầu đăng nhập)
const DUONG_DAN_CONG_KHAI = [
  "/",
  "/login",
  "/register",
  "/movies",
  "/movie-detail",
  "/watch",
  "/genres",
  "/top-movies",
  "/membership",
  "/demo-session",
];

// Danh sách đường dẫn yêu cầu đăng nhập (người dùng thường)
const DUONG_DAN_YEU_CAU_DANG_NHAP = [
  "/profile",
  "/favorite",
  "/settings",
];

// Danh sách đường dẫn dành cho admin/staff
const DUONG_DAN_ADMIN = [
  "/admin",
  "/admin/dashboard",
  "/admin/movies",
  "/admin/addMovie",
  "/admin/editMovie",
  "/admin/users",
  "/admin/genres",
  "/admin/authorization",
  "/admin/reviews",
  "/admin/session",
  "/admin/episodes",
];

/**
 * Chuẩn hóa đường dẫn URL (loại dấu slash cuối, tránh null).
 *
 * @param {string} pathname
 * @returns {string}
 */
function chuanHoaDuongDan(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return "/";
  }
  return pathname.replace(/\/$/, "") || "/";
}

/**
 * Kiểm tra xem đường dẫn có phải là trang công khai hay không.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function laTrangCongKhai(pathname) {
  const path = chuanHoaDuongDan(pathname);
  return DUONG_DAN_CONG_KHAI.includes(path);
}

/**
 * Kiểm tra xem đường dẫn có phải là trang yêu cầu đăng nhập hay không.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function laTrangYeuCauDangNhap(pathname) {
  const path = chuanHoaDuongDan(pathname);
  return DUONG_DAN_YEU_CAU_DANG_NHAP.includes(path);
}

/**
 * Kiểm tra xem đường dẫn có phải là trang quản trị hay không.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function laTrangQuanTri(pathname) {
  const path = chuanHoaDuongDan(pathname);
  return path === "/admin" || path.startsWith("/admin/");
}

/**
 * Kiểm tra quyền truy cập trang cho người dùng chưa đăng nhập.
 *
 * @param {string} pathname - Đường dẫn URL hiện tại.
 * @param {boolean} daDangNhap - Trạng thái đăng nhập hiện tại.
 * @returns {Object} { coDuocTruyCap: boolean, canhBao: string|null }
 */
export function kiemTraQuyenTruyCap(pathname, daDangNhap) {
  if (!pathname || typeof pathname !== "string") {
    return { coDuocTruyCap: true, canhBao: null };
  }

  // Trang công khai luôn cho phép
  if (laTrangCongKhai(pathname)) {
    return { coDuocTruyCap: true, canhBao: null };
  }

  // Trang quản trị: cần đăng nhập, vai trò admin/staff kiểm tra sau bởi backend/API
  if (laTrangQuanTri(pathname)) {
    if (!daDangNhap) {
      return {
        coDuocTruyCap: false,
        canhBao: "Vui lòng đăng nhập để truy cập trang quản trị.",
      };
    }
    return { coDuocTruyCap: true, canhBao: null };
  }

  // Trang yêu cầu đăng nhập
  if (laTrangYeuCauDangNhap(pathname)) {
    if (!daDangNhap) {
      return {
        coDuocTruyCap: false,
        canhBao: "Vui lòng đăng nhập để truy cập trang này.",
      };
    }
    return { coDuocTruyCap: true, canhBao: null };
  }

  // Đường dẫn khác không trong danh sách: cho phép truy cập (mặc định công khai)
  return { coDuocTruyCap: true, canhBao: null };
}

/**
 * Lưu trang hiện tại và chuyển hướng người dùng đến trang đăng nhập.
 *
 * @param {string} [trangHienTai] - URL trang hiện tại (mặc định lấy từ window.location.href).
 * @returns {void}
 */
export function chuyenHuongDenDangNhap(trangHienTai) {
  const url = trangHienTai || (typeof window !== "undefined" ? window.location.href : "");

  if (url) {
    luuTrangChuyenHuongSauDangNhap(url);
  }

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Kiểm tra và xử lý quyền truy cập cho một đường dẫn.
 * Nếu không đủ quyền, lưu trang chuyển hướng và điều hướng đến login.
 *
 * @param {string} pathname
 * @param {boolean} daDangNhap
 * @returns {boolean} true nếu được phép truy cập, false nếu đã chuyển hướng đi login.
 */
export function batBuocDangNhap(pathname, daDangNhap) {
  const ketQua = kiemTraQuyenTruyCap(pathname, daDangNhap);

  if (!ketQua.coDuocTruyCap) {
    console.warn(ketQua.canhBao);
    chuyenHuongDenDangNhap();
    return false;
  }

  return true;
}
