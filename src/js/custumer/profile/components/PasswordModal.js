/**
 * PasswordModal.js — Modal đổi mật khẩu dùng chung cho trang Cá nhân & Cài đặt.
 */

import { $ } from "../utils.js";
import { icon } from "../icons.js";
import { closeModal, openModal, toast } from "../ui.js";
import { changePassword, isSignedIn } from "../service.js";

const MARKUP = `
<div class="mf-modal mf-modal-sm" id="mfPassword" role="dialog" aria-modal="true" aria-labelledby="mfPasswordTitle" aria-hidden="true">
  <div class="mf-modal-card" role="document">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.07)">
      <div>
        <h2 id="mfPasswordTitle" class="mf-section-title">Đổi mật khẩu</h2>
        <p class="mf-muted" style="margin:4px 0 0;font-size:13px">Mật khẩu mới tối thiểu 6 ký tự.</p>
      </div>
      <button type="button" class="mf-icon-btn" data-modal-close aria-label="Đóng">${icon("close", "text-[22px]")}</button>
    </div>

    <form id="mfPasswordForm" novalidate style="padding:22px;display:flex;flex-direction:column;gap:16px">
      ${["Mật khẩu hiện tại", "Mật khẩu mới", "Nhập lại mật khẩu mới"]
        .map(
          (label, index) => `
        <div>
          <label class="mf-label" for="mfPw${index}">${label}</label>
          <div style="position:relative;display:flex;align-items:center">
            <input class="mf-input" id="mfPw${index}" name="pw${index}" type="password"
              style="padding-right:44px" autocomplete="${index === 0 ? "current-password" : "new-password"}"
              placeholder="${index === 0 ? "••••••••" : "Tối thiểu 6 ký tự"}" />
            <button type="button" class="mf-icon-btn" data-toggle-password="mfPw${index}"
              style="position:absolute;right:4px;width:34px;height:34px" aria-label="Hiện mật khẩu">
              ${icon("eye", "text-[18px]")}
            </button>
          </div>
          <p class="mf-error" data-error-for="pw${index}"></p>
        </div>`,
        )
        .join("")}

      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding-top:4px">
        <button type="button" class="mf-btn mf-btn-soft" data-modal-close>Huỷ</button>
        <button type="submit" class="mf-btn mf-btn-primary" data-pw-submit>
          ${icon("check", "text-[17px]")} Lưu mật khẩu
        </button>
      </div>
    </form>
  </div>
</div>`;

let modal = null;

const clearErrors = (form) => {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = "";
    node.classList.remove("is-visible");
  });
  form.querySelectorAll(".is-error").forEach((node) => node.classList.remove("is-error"));
};

const showError = (form, field, message) => {
  const node = form.querySelector(`[data-error-for="${field}"]`);
  if (node) {
    node.textContent = message;
    node.classList.add("is-visible");
  }
  form.elements[field]?.classList.add("is-error");
};

function mount() {
  if (document.getElementById("mfPassword")) {
    modal = document.getElementById("mfPassword");
    return;
  }
  const holder = document.createElement("div");
  holder.innerHTML = MARKUP;
  modal = holder.firstElementChild;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) closeModal(modal);

    const toggle = event.target.closest("[data-toggle-password]");
    if (!toggle) return;
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    toggle.innerHTML = icon(input.type === "password" ? "eye" : "eyeOff", "text-[18px]");
  });

  const form = $("#mfPasswordForm", modal);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const current = form.elements.pw0.value;
    const next = form.elements.pw1.value;
    const confirmValue = form.elements.pw2.value;

    clearErrors(form);
    const errors = {};
    if (!current) errors.pw0 = "Vui lòng nhập mật khẩu hiện tại.";
    if (!next) errors.pw1 = "Vui lòng nhập mật khẩu mới.";
    else if (next.length < 6) errors.pw1 = "Mật khẩu mới tối thiểu 6 ký tự.";
    if (!confirmValue) errors.pw2 = "Vui lòng xác nhận mật khẩu mới.";
    else if (next !== confirmValue) errors.pw2 = "Hai mật khẩu không khớp.";

    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([field, message]) => showError(form, field, message));
      toast("Mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.", "error");
      return;
    }

    const button = form.querySelector("[data-pw-submit]");
    button.disabled = true;
    try {
      const result = await changePassword(current, next);
      if (!result.ok) {
        showError(form, "pw0", result.message);
        toast(result.message, "error");
        return;
      }
      form.reset();
      closeModal(modal);
      toast("Đổi mật khẩu thành công.", "success");
    } catch (error) {
      console.error("[profile] Lỗi đổi mật khẩu:", error);
      toast("Không đổi được mật khẩu. Vui lòng thử lại.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

export function openPasswordModal() {
  if (!isSignedIn()) {
    toast("Vui lòng đăng nhập để đổi mật khẩu.", "error");
    setTimeout(() => {
      window.location.href = "/login";
    }, 900);
    return;
  }
  mount();
  const form = $("#mfPasswordForm", modal);
  form.reset();
  clearErrors(form);
  openModal(modal);
  modal.setAttribute("aria-hidden", "false");
  form.elements.pw0.focus();
}
