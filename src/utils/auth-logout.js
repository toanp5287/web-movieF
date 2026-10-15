/**
 * File: src/utils/auth-logout.js
 * Mục đích: Cung cấp hàm xử lý đăng xuất tập trung,
 * xóa phiên đăng nhập theo cơ chế hiện có và cập nhật giao diện qua callback.
 *
 * Tái sử dụng:
 *  - auth-session.js: dangXuat() (xóa currentUser trong localStorage)
 *  - session-storage.js: dangXuat() (xóa movief_session và redirect)
 *  - remember-me.js: xoaGhiNhoDangNhap() (xóa lựa chọn ghi nhớ nếu cần)
 *
 * File này KHÔNG sửa nút đăng xuất hiện có.
 * KHÔNG xóa lịch sử xem phim, danh sách yêu thích, cài đặt người dùng.
 */

import { dangXuat as dangXuatAuthSession } from "./auth-session.js";
import { dangXuat as dangXuatSessionStorage } from "./session-storage.js";
import { xoaGhiNhoDangNhap } from "./remember-me.js";

/**
 * Xóa toàn bộ phiên đăng nhập theo cơ chế hiện có.
 *
 * @param {Object} [tuyChon]
 * @param {boolean} [tuyChon.xoaGhiNho=true] - Có xóa lựa chọn "Ghi nhớ đăng nhập" hay không.
 * @param {Function} [tuyChon.sauKhiDangXuat] - Callback chạy sau khi xóa phiên (ví dụ cập nhật UI, reload trang).
 * @returns {void}
 */
export function dangXuatToanBo({ xoaGhiNho = true, sauKhiDangXuat } = {}) {
  // 1. Xóa thông tin người dùng trong localStorage (khoá "currentUser")
  dangXuatAuthSession();

  // 2. Xóa phiên tạm trong sessionStorage (khoá "movief_session" và redirect)
  dangXuatSessionStorage();

  // 3. Nếu cấu hình cho phép, xóa dữ liệu remember-me (email đã lưu)
  if (xoaGhiNho) {
    xoaGhiNhoDangNhap();
  }

  // 4. Chạy callback nếu có (cập nhật giao diện, chuyển trang, ...)
  if (typeof sauKhiDangXuat === "function") {
    try {
      sauKhiDangXuat();
    } catch (loi) {
      console.warn("Lỗi trong callback sau khi đăng xuất:", loi);
    }
  }
}

/**
 * Đăng xuất rồi chuyển hướng đến trang xác định.
 *
 * @param {string} [trangSauDangXuat="/login"] - Đường dẫn đến sau khi đăng xuất.
 * @param {Object} [tuyChon] - Các tùy chọn giống dangXuatToanBo.
 * @returns {void}
 */
export function dangXuatVaChuyenHuong(trangSauDangXuat = "/login", tuyChon = {}) {
  dangXuatToanBo({
    ...tuyChon,
    sauKhiDangXuat: () => {
      if (typeof window !== "undefined") {
        window.location.href = trangSauDangXuat;
      }
      if (typeof tuyChon.sauKhiDangXuat === "function") {
        tuyChon.sauKhiDangXuat();
      }
    },
  });
}
