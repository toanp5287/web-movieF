import api from "../api";
import { hashPassword } from "./auth";

// =========================================
// 1. KIỂM TRA TRẠNG THÁI XÁC MINH OTP
// =========================================
const otpDaXacMinh = sessionStorage.getItem("otpDaXacMinh");

if (otpDaXacMinh !== "true") {
  window.location.replace("/sacThuc");
} else {
  // =========================================
  // 2. LẤY CÁC PHẦN TỬ HTML
  // =========================================
  const email = (sessionStorage.getItem("emailDangNhap") || "")
    .trim()
    .toLowerCase();

  const form = document.getElementById("formDatLaiMatKhau");
  const inputMatKhau = document.getElementById("matKhauMoi");
  const inputXacNhan = document.getElementById("xacNhanMatKhau");
  const inputHienMatKhau = document.getElementById("hienMatKhau");
  const emailHienThi = document.getElementById("emailHienThi");
  const thongBao = document.getElementById("thongBao");
  const btnLuu = document.getElementById("btnLuuMatKhau");

  // =========================================
  // 3. HIỂN THỊ THÔNG BÁO
  // =========================================
  function thongBaoTrangThai(noiDung, thanhCong = false) {
    thongBao.textContent = noiDung;
    thongBao.className = thanhCong
      ? "mb-4 min-h-5 text-sm text-green-400"
      : "mb-4 min-h-5 text-sm text-red-400";
  }

  // =========================================
  // 4. CHE EMAIL
  // =========================================
  function cheEmail(giaTri) {
    if (!giaTri || !giaTri.includes("@")) {
      return "Không tìm thấy email";
    }

    const [ten, mien] = giaTri.split("@");

    const tenDaChe =
      ten.length <= 2 ? `${ten.charAt(0)}***` : `${ten.slice(0, 2)}***`;

    return `${tenDaChe}@${mien}`;
  }

  emailHienThi.textContent = cheEmail(email);

  // =========================================
  // 5. HIỆN / ẨN MẬT KHẨU
  // =========================================
  inputHienMatKhau.addEventListener("change", () => {
    const loai = inputHienMatKhau.checked ? "text" : "password";

    inputMatKhau.type = loai;
    inputXacNhan.type = loai;
  });

  // =========================================
  // 6. XỬ LÝ FORM ĐẶT LẠI MẬT KHẨU
  // =========================================
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Kiểm tra email
    if (!email || !email.includes("@")) {
      thongBaoTrangThai(
        "Không tìm thấy email. Hãy thực hiện xác minh OTP lại.",
      );
      return;
    }

    const matKhauMoi = inputMatKhau.value;
    const xacNhan = inputXacNhan.value;

    // Kiểm tra độ dài mật khẩu
    if (matKhauMoi.length < 6 || matKhauMoi.length > 128) {
      thongBaoTrangThai("Mật khẩu không được dưới 6 ký tự.");
      inputMatKhau.focus();
      return;
    }

    // Kiểm tra xác nhận mật khẩu
    if (matKhauMoi !== xacNhan) {
      thongBaoTrangThai("Mật khẩu xác nhận không trùng khớp.");
      inputXacNhan.focus();
      return;
    }

    btnLuu.disabled = true;
    btnLuu.textContent = "Đang cập nhật...";
    inputMatKhau.disabled = true;
    inputXacNhan.disabled = true;
    inputHienMatKhau.disabled = true;

    try {
      // 1. Lấy danh sách người dùng từ JSON Server
      const users = await api.get("/users");

      if (!Array.isArray(users)) {
        throw new Error("Không lấy được danh sách tài khoản.");
      }

      // 2. Tìm đúng tài khoản theo email
      const user = users.find(
        (item) =>
          typeof item.email === "string" &&
          item.email.trim().toLowerCase() === email,
      );

      if (!user) {
        throw new Error("Không tìm thấy tài khoản.");
      }

      if (user.id === undefined || user.id === null) {
        throw new Error("Tài khoản không có ID hợp lệ.");
      }

      // 3. Băm mật khẩu bằng hàm đã có trong auth.js
      const passwordHash = await hashPassword(matKhauMoi);

      // 4. Cập nhật mật khẩu của đúng tài khoản
      await api.patch(`/users/${encodeURIComponent(String(user.id))}`, {
        password: passwordHash,
      });

      // 5. Thông báo thành công
      thongBaoTrangThai(
        "Đổi mật khẩu thành công! Đang chuyển về đăng nhập...",
        true,
      );

      // Xóa thông tin phiên quên mật khẩu
      sessionStorage.removeItem("emailDangNhap");
      sessionStorage.removeItem("otpDaXacMinh");

      form.reset();

      // 6. Chuyển về trang đăng nhập
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (error) {
      console.error("Lỗi đặt lại mật khẩu:", error);

      thongBaoTrangThai(
        error.message || "Không thể cập nhật mật khẩu. Hãy thử lại.",
      );
    } finally {
      if (sessionStorage.getItem("emailDangNhap")) {
        btnLuu.disabled = false;
        btnLuu.textContent = "Lưu mật khẩu mới";
        inputMatKhau.disabled = false;
        inputXacNhan.disabled = false;
        inputHienMatKhau.disabled = false;
      }
    }
  });

  // =========================================
  // 7. KIỂM TRA EMAIL KHI MỞ TRANG
  // =========================================
  if (!email || !email.includes("@")) {
    btnLuu.disabled = true;

    thongBaoTrangThai(
      "Không tìm thấy email cần xác minh. Hãy quay lại thực hiện quy trình quên mật khẩu.",
    );
  }
}
