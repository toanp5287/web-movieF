import api from "../api";
import { luuGhiNhoDangNhap } from "../../utils/remember-me.js";

const formLogin = document.querySelector("#loginForm");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.querySelector("#emailInput").value.trim();

    const passwordInput = document.querySelector("#passwordInput").value.trim();
    sessionStorage.setItem("emailDangNhap", emailInput);
    try {
      const passwordHash = await hashPassword(passwordInput);

      const users = await api.get("/users");

      const result = users.find(
        (item) =>
          item.email === emailInput &&
          item.password === passwordHash &&
          item.status === "active",
      );

      if (!result) {
        await Swal.fire({
          icon: "error",
          title: "Đăng nhập thất bại",
          text: "Email hoặc mật khẩu không chính xác!",
          confirmButtonText: "Đóng",
          timer: 2000,
          timerProgressBar: true,

          customClass: {
            popup: "bg-[#141414] border border-white/10 rounded-2xl shadow-2xl",
            title: "text-white text-xl font-bold",
            htmlContainer: "text-gray-400 text-sm",
            confirmButton:
              "bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg",
          },
        });

        return;
      }
      const captchaToken = grecaptcha.getResponse();
      if (!captchaToken) {
        await Swal.fire({
          icon: "warning",
          title: "Xác nhận CAPTCHA",
          text: "Vui lòng xác nhận bạn không phải robot.",
          confirmButtonText: "OK",
        });

        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(result));

      // Lưu lựa chọn "Ghi nhớ đăng nhập" (chỉ email, không lưu mật khẩu).
      const rememberCheckbox = document.querySelector("#rememberMe");
      luuGhiNhoDangNhap(rememberCheckbox, emailInput);

      await Swal.fire({
        icon: "success",
        title: "Đăng nhập thành công!",
        text: `Chào mừng ${result.fullname}!`,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,

        customClass: {
          popup:
            "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
          title: "text-white! text-xl! font-semibold! mt-2!",
          htmlContainer: "text-gray-400! text-sm! mt-1!",
          timerProgressBar: "bg-red-600!",
        },
      });
      const redirectAfterLogin = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("emailDangNhap");
      if (redirectAfterLogin) {
        sessionStorage.removeItem("redirectAfterLogin");

        window.location.href = redirectAfterLogin;
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      await Swal.fire({
        icon: "error",
        title: "Có lỗi xảy ra!",
        text: "Không thể đăng nhập. Vui lòng thử lại sau.",
        confirmButtonText: "Đóng",
        timer: 2000,
        timerProgressBar: true,

        customClass: {
          popup: "bg-[#141414] border border-white/10 rounded-2xl shadow-2xl",
          title: "text-white text-xl font-bold",
          htmlContainer: "text-gray-400 text-sm",
          confirmButton:
            "bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg",
        },
      });
    }
  });
}

const formRegister = document.querySelector("#registerForm");

if (formRegister) {
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formName = document.querySelector("#formName").value.trim();
    const formEmail = document.querySelector("#formEmail").value.trim();

    const passwordInput = document
      .querySelector("#password-input")
      .value.trim();

    const confirmPassword = document
      .querySelector("#confirm-password-input")
      .value.trim();

    try {
      // Mật khẩu không khớp
      if (passwordInput !== confirmPassword) {
        await Swal.fire({
          icon: "error",
          title: "Đăng ký thất bại",
          text: "Mật khẩu xác nhận không khớp!",
          confirmButtonText: "Đóng",
          timer: 5000,
          timerProgressBar: true,

          customClass: {
            popup:
              "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
            title: "text-white! text-xl! font-semibold! mt-2!",
            htmlContainer: "text-gray-400! text-sm! mt-1!",
            confirmButton:
              "bg-red-600! hover:bg-red-700! text-white! font-medium! px-6! py-2.5! rounded-lg! transition!",
            timerProgressBar: "bg-red-600!",
          },
        });

        return;
      }

      // Lấy danh sách user
      const users = await api.get("/users");

      // Kiểm tra email
      const resultEmail = users.find((item) => item.email === formEmail);

      if (resultEmail) {
        await Swal.fire({
          icon: "warning",
          title: "Email đã tồn tại",
          text: "Vui lòng sử dụng email khác!",
          confirmButtonText: "Đóng",
          timer: 5000,
          timerProgressBar: true,

          customClass: {
            popup:
              "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
            title: "text-white! text-xl! font-semibold! mt-2!",
            htmlContainer: "text-gray-400! text-sm! mt-1!",
            confirmButton:
              "bg-red-600! hover:bg-red-700! text-white! font-medium! px-6! py-2.5! rounded-lg! transition!",
            timerProgressBar: "bg-red-600!",
          },
        });

        return;
      }

      // Hash password
      const passwordHash = await hashPassword(passwordInput);

      // Tạo tài khoản
      const result = await api.post("/users", {
        id: Date.now(),
        fullname: formName,
        email: formEmail,
        password: passwordHash,
        roleId: 3,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      // Đăng ký thành công
      if (result) {
        await Swal.fire({
          icon: "success",
          title: "Đăng ký thành công!",
          text: "Tài khoản của bạn đã được tạo.",
          confirmButtonText: "Đăng nhập",
          timer: 5000,
          timerProgressBar: true,

          customClass: {
            popup:
              "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
            title: "text-white! text-xl! font-semibold! mt-2!",
            htmlContainer: "text-gray-400! text-sm! mt-1!",
            confirmButton:
              "bg-red-600! hover:bg-red-700! text-white! font-medium! px-6! py-2.5! rounded-lg! transition!",
            timerProgressBar: "bg-red-600!",
          },
        });

        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Lỗi đăng ký:", error);

      await Swal.fire({
        icon: "error",
        title: "Đăng ký thất bại",
        text: "Đã xảy ra lỗi. Vui lòng thử lại sau!",
        confirmButtonText: "Đóng",
        timer: 5000,
        timerProgressBar: true,

        customClass: {
          popup:
            "bg-[#111111]! border! border-white/10! rounded-2xl! shadow-2xl! w-[380px]!",
          title: "text-white! text-xl! font-semibold! mt-2!",
          htmlContainer: "text-gray-400! text-sm! mt-1!",
          confirmButton:
            "bg-red-600! hover:bg-red-700! text-white! font-medium! px-6! py-2.5! rounded-lg! transition!",
          timerProgressBar: "bg-red-600!",
        },
      });
    }
  });
}
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// chuyen sang trang quyên mật khẩu

async function quenMatKhau() {
  const emailInput = document.querySelector("#emailInput");
  const email = emailInput?.value.trim();

  if (!email) {
    alert("Vui lòng nhập email trước.");
    emailInput?.focus();
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:3001/api/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );

    const ketQua = await response.json();

    if (!response.ok) {
      alert(ketQua.message || "Không gửi được mã OTP.");
      return;
    }

    sessionStorage.setItem("emailDangNhap", email);

    // Chuyển sang trang nhập OTP sau khi API phản hồi
    window.location.href = "/sacThuc";
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    alert("Không kết nối được máy chủ gửi email.");
  }
}

window.quenMatKhau = quenMatKhau;
