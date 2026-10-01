/**
 * auth.js — Xử lý form Đăng nhập + Đăng ký của khách MovieF.
 *
 * Phần đăng nhập dùng `auth-session.js` làm lõi kiểm tra tài khoản (6 bước),
 * hiển thị lỗi ngay dưới ô nhập + Toast, trạng thái nút "Đang kiểm tra...",
 * và tôn trọng tuỳ chọn "Ghi nhớ đăng nhập".
 *
 * Phần đăng ký giữ nguyên hành vi cũ (SweetAlert2 + json-server).
 */

import api from "../api.js";
import {
  checkAccount,
  getSessionUser,
  hashPassword,
  saveSession,
  takeNotice,
  takeRedirect,
} from "./auth-session.js";
import { toast } from "./profile/ui.js";

/* ================================================================== *
 * 1. ĐĂNG NHẬP — KIỂM TRA TÀI KHOẢN
 * ================================================================== */

function bindLoginForm() {
  const form = document.querySelector("#loginForm");
  if (!form) return;

  const identifierInput = form.querySelector("#emailInput");
  const passwordInput = form.querySelector("#passwordInput");
  const identifierError = form.querySelector("#identifierError");
  const passwordError = form.querySelector("#passwordError");
  const rememberInput = form.querySelector("#rememberMe");
  const submitBtn = form.querySelector("#submitBtn");
  const submitText = form.querySelector("#submitText");
  const submitIcon = form.querySelector("#submitIcon");
  const toggleBtn = form.querySelector("#togglePassword");
  const eyeIcon = form.querySelector("#eyeIcon");

  /* ---------- Thông báo mang từ trang bị chặn ---------- */

  const notice = takeNotice();
  if (notice) toast(notice, "info");

  const signedIn = getSessionUser();
  if (signedIn) {
    toast(`Bạn đang đăng nhập với tài khoản ${signedIn.fullname || signedIn.username}.`, "info");
  }

  /* ---------- Hiện / ẩn mật khẩu ---------- */

  toggleBtn?.addEventListener("click", () => {
    const showing = passwordInput.type === "password";
    passwordInput.type = showing ? "text" : "password";
    eyeIcon.textContent = showing ? "visibility_off" : "visibility";
    toggleBtn.setAttribute("aria-label", showing ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    passwordInput.focus();
  });

  /* ---------- Quên mật khẩu (chờ Backend) ---------- */

  form.querySelector("[data-forgot]")?.addEventListener("click", (event) => {
    event.preventDefault();
    toast("Tính năng quên mật khẩu sẽ có khi kết nối Backend.", "info");
  });

  /* ---------- Lỗi ngay dưới ô nhập ---------- */

  const hideError = (input, node) => {
    node.textContent = "";
    node.classList.remove("is-visible");
    input.classList.remove("is-error");
  };

  const showError = (input, node, message) => {
    node.textContent = `✕ ${message}`;
    node.classList.add("is-visible");
    input.classList.add("is-error");
  };

  const clearErrors = () => {
    hideError(identifierInput, identifierError);
    hideError(passwordInput, passwordError);
  };

  identifierInput.addEventListener("input", () => hideError(identifierInput, identifierError));
  passwordInput.addEventListener("input", () => hideError(passwordInput, passwordError));

  /* ---------- Trạng thái nút ---------- */

  let busy = false;

  const setButton = (state) => {
    if (state === "loading") {
      submitBtn.disabled = true;
      submitText.textContent = "Đang kiểm tra...";
      submitIcon.textContent = "progress_activity";
      submitIcon.classList.add("mf-spinner");
    } else if (state === "success") {
      submitBtn.disabled = true;
      submitText.textContent = "Đăng nhập thành công!";
      submitIcon.textContent = "check_circle";
      submitIcon.classList.remove("mf-spinner");
    } else {
      submitBtn.disabled = false;
      submitText.textContent = "ĐĂNG NHẬP";
      submitIcon.textContent = "arrow_forward";
      submitIcon.classList.remove("mf-spinner");
    }
  };

  /* ---------- Submit ---------- */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;

    clearErrors();

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value; // không trim: mật khẩu có thể chứa khoảng trắng

    // Bước 1 + 2 — kiểm tra nhanh phía trình duyệt để phản hồi tức thì.
    if (!identifier) {
      showError(identifierInput, identifierError, "Vui lòng nhập email hoặc tên tài khoản.");
      identifierInput.focus();
      return;
    }

    if (!password) {
      showError(passwordInput, passwordError, "Vui lòng nhập mật khẩu.");
      passwordInput.focus();
      return;
    }

    busy = true;
    setButton("loading");

    try {
      const result = await checkAccount({ identifier, password });

      if (!result.ok) {
        const field = result.field === "password" ? "password" : "identifier";
        const input = field === "password" ? passwordInput : identifierInput;
        const node = field === "password" ? passwordError : identifierError;

        showError(input, node, result.message);
        toast(result.message, "error");
        input.focus();

        busy = false;
        setButton("idle");
        return;
      }

      // Bước 6 — hợp lệ: lưu phiên + tôn trọng "Ghi nhớ đăng nhập".
      saveSession(result.user, { remember: rememberInput.checked });

      if (result.source === "demo") {
        toast("Máy chủ dữ liệu chưa chạy — đang kiểm tra bằng tài khoản mẫu.", "info");
      }

      setButton("success");
      toast(`✓ Đăng nhập thành công! Chào mừng ${result.user.fullname || result.user.username}.`, "success");

      const redirect = takeRedirect();
      setTimeout(() => {
        window.location.href = redirect || "/";
      }, 900);
    } catch (error) {
      console.error("[login] Lỗi kiểm tra tài khoản:", error);
      toast("Không thể kiểm tra tài khoản. Vui lòng thử lại sau.", "error");
      busy = false;
      setButton("idle");
    }
  });
}

/* ================================================================== *
 * 2. ĐĂNG KÝ (giữ nguyên hành vi cũ)
 * ================================================================== */

function bindRegisterForm() {
  const formRegister = document.querySelector("#registerForm");
  if (!formRegister) return;

  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formName = document.querySelector("#formName").value.trim();
    const formEmail = document.querySelector("#formEmail").value.trim();

    const passwordInput = document.querySelector("#password-input").value.trim();

    const confirmPassword = document.querySelector("#confirm-password-input").value.trim();

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

/* ================================================================== *
 * 3. KHỞI TẠO
 * ================================================================== */

bindLoginForm();
bindRegisterForm();
