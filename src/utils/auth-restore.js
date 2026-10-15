/**
 * File: src/utils/auth-restore.js
 * Mục đích: Cung cấp các hàm khôi phục và kiểm tra trạng thái đăng nhập
 * khi người dùng tải lại trang hoặc mở lại website.
 *
 * Tái sử dụng cơ chế xác thực hiện có của dự án:
 *  - auth-session.js: đọc thông tin người dùng từ localStorage (khoá "currentUser").
 *  - remember-me.js: đọc lựa chọn "Ghi nhớ đăng nhập" (khoá "rememberMe").
 *  - session-storage.js: đọc/xóa phiên tạm thời trong sessionStorage (khoá "movief_session").
 *
 * =========================================================================
 * GIỚI HẠN CỦA KIẾN TRÚC HIỆN TẠI (bắt buộc đọc trước khi gọi)
 * =========================================================================
 * 1. Dự án KHÔNG có backend endpoint xác thực phiên (không có /auth/session,
 *    /auth/me, /auth/verify...). Backend hiện tại là json-server tại
 *    http://localhost:3000 chỉ cung cấp CRUD tài nguyên (/users, /movies...).
 * 2. Dữ liệu "currentUser" trong localStorage KHÔNG được coi là bằng chứng
 *    xác thực an toàn. Nó chỉ là bản sao thông tin người dùng lưu lại sau
 *    lần đăng nhập trước, có thể bị giả mạo từ phía trình duyệt.
 * 3. Kiến trúc hiện tại KHÔNG có thời gian hết hạn phiên (expiry timestamp),
 *    không có refresh token, không có cookie bảo mật.
 * 4. Do đó, các hàm trong file này chỉ KIỂM TRA CƠ BẢN (có dữ liệu localStorage
 *    hay không, người dùng đã chọn ghi nhớ hay không). KHÔNG thể xác nhận phiên
 *    vẫn còn hợp lệ đối với server.
 * 5. Các thao tác nhạy cảm (xem hồ sơ, thanh toán, quản trị...) vẫn cần gọi
 *    API xác thực lại trước khi thực hiện.
 * 6. File này KHÔNG lưu mật khẩu hoặc thông tin nhạy cảm vào localStorage
 *    hay sessionStorage.
 * 7. File này KHÔNG tự động cập nhật giao diện và KHÔNG tự động tích hợp vào
 *    trang HTML hoặc JavaScript cũ. Chỉ cung cấp hàm để module khác gọi.
 */

import {
  layThongTinNguoiDungHienTai,
  dangXuat as dangXuatAuthSession,
} from "./auth-session.js";
import { layDuLieuGhiNho } from "./remember-me.js";
import {
  layThongTinPhien,
  xoaPhienDangNhap as xoaPhienSessionStorage,
  xoaTrangChuyenHuongSauDangNhap as xoaTrangChuyenHuong,
} from "./session-storage.js";

/**
 * Kiểm tra xem trình duyệt có hỗ trợ localStorage hay không.
 *
 * @returns {boolean} true nếu hỗ trợ, ngược lại false.
 */
function kiemTraHoTroLocalStorage() {
  try {
    const kiemTra = "__auth_restore_test__";
    localStorage.setItem(kiemTra, kiemTra);
    localStorage.removeItem(kiemTra);
    return true;
  } catch (loi) {
    return false;
  }
}

/**
 * Kiểm tra xem hiện tại có dữ liệu phiên đăng nhập trong localStorage hay không.
 *
 * Lưu ý: Hàm này KHÔNG gọi API xác thực lại. Kết quả chỉ cho biết có dữ liệu
 * "currentUser" được lưu trước đó hay không, KHÔNG phải bằng chứng xác thực
 * phiên vẫn còn hợp lệ với server.
 *
 * @returns {Object|null} Thông tin người dùng nếu có dữ liệu, ngược lại null.
 */
export function kiemTraPhienCoDuLieu() {
  if (!kiemTraHoTroLocalStorage()) {
    console.warn("Trình duyệt không hỗ trợ localStorage.");
    return null;
  }

  return layThongTinNguoiDungHienTai();
}

/**
 * Kiểm tra xem người dùng trước đó có chọn "Ghi nhớ đăng nhập" hay không.
 *
 * @returns {{ email: string } | null}
 *          Đối tượng { email } nếu có dữ liệu ghi nhớ, ngược lại null.
 */
export function kiemTraLuaChonGhiNho() {
  return layDuLieuGhiNho();
}

/**
 * Kiểm tra xem phiên đăng nhập trong sessionStorage còn dữ liệu hay không.
 *
 * @returns {Object|null} Thông tin phiên nếu có, ngược lại null.
 */
export function kiemTraPhienSession() {
  return layThongTinPhien();
}

/**
 * Khôi phục trạng thái đăng nhập khi tải lại trang hoặc mở lại website.
 *
 * Hàm này KHÔNG tự động cập nhật giao diện và KHÔNG tự động coi người dùng
 * đã đăng nhập chỉ vì tìm thấy dữ liệu trong localStorage. Nó chỉ thu thập
 * thông tin trạng thái để module gọi sau (ví dụ auth-init hoặc trang HTML)
 * quyết định cách xử lý.
 *
 * Kết quả trả về:
 *  - coNguoiDung: boolean, có dữ liệu "currentUser" trong localStorage hay không.
 *  - thongTinNguoiDung: Object|null, thông tin người dùng (không chứa mật khẩu).
 *  - daChonGhiNho: boolean, người dùng đã chọn "Ghi nhớ đăng nhập" trước đó hay không.
 *  - emailGhiNho: string|null, email đã được ghi nhớ (nếu có).
 *  - coPhienSession: boolean, có phiên trong sessionStorage hay không.
 *  - phienConHieuLuc: boolean, true khi có dữ liệu localStorage (cơ bản, KHÔNG xác thực với server).
 *
 * @returns {Object} Đối tượng mô tả trạng thái đăng nhập hiện tại.
 */
export function khoiPhucTrangThaiDangNhap() {
  const nguoiDung = kiemTraPhienCoDuLieu();
  const thongTinGhiNho = kiemTraLuaChonGhiNho();
  const thongTinPhien = kiemTraPhienSession();

  const coNguoiDung = Boolean(nguoiDung && nguoiDung.id);
  const daChonGhiNho = Boolean(thongTinGhiNho);
  const emailGhiNho = thongTinGhiNho ? thongTinGhiNho.email : null;
  const coPhienSession = Boolean(thongTinPhien && thongTinPhien.userId);

  // "Phiên còn hiệu lực" ở đây chỉ mang nghĩa cơ bản: có dữ liệu người dùng lưu trong trình duyệt.
  // KHÔNG được coi là xác thực với server.
  const phienConHieuLuc = coNguoiDung;

  return {
    coNguoiDung,
    thongTinNguoiDung: coNguoiDung
      ? {
          id: nguoiDung.id,
          fullname: nguoiDung.fullname,
          email: nguoiDung.email,
          username: nguoiDung.username,
          avatar: nguoiDung.avatar,
          roleId: nguoiDung.roleId,
          status: nguoiDung.status,
        }
      : null,
    daChonGhiNho,
    emailGhiNho,
    coPhienSession,
    phienConHieuLuc,
  };
}

/**
 * Xóa phiên đăng nhập khi người dùng KHÔNG chọn "Ghi nhớ đăng nhập"
 * hoặc khi phiên không còn hợp lệ.
 *
 * Hàm này chỉ xóa dữ liệu phiên đăng nhập (localStorage "currentUser" và
 * sessionStorage "movief_session" kèm trang chuyển hướng). KHÔNG xóa dữ
 * liệu không liên quan như lịch sử xem phim, danh sách yêu thích hoặc
 * cài đặt người dùng.
 *
 * @returns {void}
 */
export function xoaPhienKhiKhongGhiNho() {
  // Xóa thông tin người dùng trong localStorage (khoá "currentUser")
  // bằng cơ chế đăng xuất hiện có của auth-session.js.
  dangXuatAuthSession();

  // Xóa phiên tạm trong sessionStorage (khoá "movief_session") và
  // trang chuyển hướng sau đăng nhập.
  try {
    xoaPhienSessionStorage();
    xoaTrangChuyenHuong();
  } catch (loi) {
    console.warn("Không xóa được phiên sessionStorage:", loi);
  }
}
