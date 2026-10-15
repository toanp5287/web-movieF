/**
 * File: src/utils/auth-init.js
 * Mục đích: Khởi tạo các module xác thực đã hoàn thành,
 * đảm bảo thứ tự khởi tạo đúng, tránh gọi hàm nhiều lần.
 *
 * File này CHỈ tích hợp các module thực sự tồn tại.
 * KHÔNG tự động sửa toàn bộ file HTML hoặc JavaScript hiện có.
 */

import { khoiPhucTrangThaiDangNhap } from "./auth-restore.js";
import { kiemTraDangNhap } from "./auth-session.js";

let daKhoiTao = false;

/**
 * Khởi tạo hệ thống xác thực.
 *
 * @param {Object} [tuyChon]
 * @param {Function} [tuyChon.trongKhiCoNguoiDung] - Callback khi có người dùng đã đăng nhập.
 * @param {Function} [tuyChon.trongKhiChuaDangNhap] - Callback khi chưa đăng nhập.
 * @param {Function} [tuyChon.trongKhiLoi] - Callback khi xảy ra lỗi.
 * @returns {Object|null} Trạng thái đăng nhập sau khi khôi phục, hoặc null nếu lỗi.
 */
export function khoiTaoAuth({
  trongKhiCoNguoiDung,
  trongKhiChuaDangNhap,
  trongKhiLoi,
} = {}) {
  // Tránh khởi tạo nhiều lần
  if (daKhoiTao) {
    console.warn("Hệ thống xác thực đã được khởi tạo trước đó.");
    return null;
  }

  try {
    const trangThai = khoiPhucTrangThaiDangNhap();
    daKhoiTao = true;

    if (trangThai.coNguoiDung) {
      if (typeof trongKhiCoNguoiDung === "function") {
        trongKhiCoNguoiDung(trangThai.thongTinNguoiDung);
      }
    } else {
      if (typeof trongKhiChuaDangNhap === "function") {
        trongKhiChuaDangNhap();
      }
    }

    return trangThai;
  } catch (loi) {
    console.error("Lỗi khởi tạo hệ thống xác thực:", loi);
    if (typeof trongKhiLoi === "function") {
      trongKhiLoi(loi);
    }
    return null;
  }
}

/**
 * Kiểm tra xem hệ thống đã được khởi tạo chưa.
 *
 * @returns {boolean}
 */
export function daDuocKhoiTao() {
  return daKhoiTao;
}

/**
 * Đặt lại cờ khởi tạo (dùng cho test hoặc khi cần khởi tạo lại).
 *
 * @returns {void}
 */
export function datLaiKhoiTao() {
  daKhoiTao = false;
}
