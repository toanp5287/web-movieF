/**
 * EditProfileModal.js — Modal chỉnh sửa hồ sơ (ảnh đại diện, họ tên, username,
 * email, số điện thoại, ngày sinh, giới thiệu) kèm validation.
 */

import { $, AVATAR_FALLBACK } from "../utils.js";
import { icon } from "../icons.js";
import { closeModal, openModal, toast } from "../ui.js";
import { saveProfile } from "../service.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const GENDERS = [
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
  { value: "khac", label: "Khác" },
];

const MARKUP = `
<div class="mf-modal" id="mfEditProfile" role="dialog" aria-modal="true" aria-labelledby="mfEditTitle" aria-hidden="true">
  <div class="mf-modal-card" role="document">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.07)">
      <div style="min-width:0">
        <h2 id="mfEditTitle" class="mf-section-title">Chỉnh sửa hồ sơ</h2>
        <p class="mf-muted" style="margin:4px 0 0;font-size:13px">Cập nhật thông tin cá nhân hiển thị trên MovieF.</p>
      </div>
      <button type="button" class="mf-icon-btn" data-modal-close aria-label="Đóng">${icon("close", "text-[22px]")}</button>
    </div>

    <form id="mfEditForm" novalidate>
      <div style="padding:22px;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;align-items:center;gap:16px;padding:16px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.02)">
          <img
            data-preview
            src="${AVATAR_FALLBACK}"
            alt="Xem trước ảnh đại diện"
            style="width:64px;height:64px;border-radius:999px;object-fit:cover;flex:none;border:2px solid rgba(255,32,40,.45)"
          />
          <div style="min-width:0;flex:1">
            <p style="margin:0;font-size:14px;font-weight:600">Ảnh đại diện</p>
            <p class="mf-muted" style="margin:3px 0 10px;font-size:12.5px;line-height:1.5">Dán liên kết ảnh (URL) hoặc chọn tệp từ máy.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label class="mf-btn mf-btn-soft mf-btn-sm" style="cursor:pointer">
                ${icon("upload", "text-[15px]")} Chọn tệp
                <input type="file" accept="image/*" data-file hidden />
              </label>
              <button type="button" class="mf-btn mf-btn-outline mf-btn-sm" data-clear-avatar>${icon("trash", "text-[15px]")} Xoá ảnh</button>
            </div>
          </div>
        </div>

        <div style="display:grid;gap:16px" data-form-grid>
          <div>
            <label class="mf-label" for="mfFullName">Họ và tên</label>
            <input class="mf-input" id="mfFullName" name="fullname" type="text" autocomplete="name" placeholder="Nguyễn Văn A" required />
            <p class="mf-error" data-error-for="fullname"></p>
          </div>

          <div>
            <label class="mf-label" for="mfUsername">Tên tài khoản</label>
            <div style="position:relative;display:flex;align-items:center">
              <span class="mf-muted" style="position:absolute;left:14px;font-size:14px;pointer-events:none">@</span>
              <input class="mf-input" id="mfUsername" name="username" type="text" autocomplete="nickname" style="padding-left:30px" placeholder="nguyenvana" required />
            </div>
            <p class="mf-error" data-error-for="username"></p>
          </div>

          <div>
            <label class="mf-label" for="mfEmail">Email</label>
            <input class="mf-input" id="mfEmail" name="email" type="email" autocomplete="email" placeholder="example@movief.vn" required />
            <p class="mf-error" data-error-for="email"></p>
          </div>

          <div>
            <label class="mf-label" for="mfPhone">Số điện thoại</label>
            <input class="mf-input" id="mfPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="0987654321" />
            <p class="mf-error" data-error-for="phone"></p>
          </div>

          <div>
            <label class="mf-label" for="mfBirthday">Ngày sinh</label>
            <input class="mf-input" id="mfBirthday" name="birthday" type="date" />
            <p class="mf-error" data-error-for="birthday"></p>
          </div>

          <fieldset style="border:none;margin:0;padding:0;min-width:0">
            <legend class="mf-label">Giới tính</legend>
            <div class="mf-tabs" style="gap:6px" data-gender-group>
              ${GENDERS.map(
                (gender, index) => `
                <label class="mf-tab" style="flex:1;cursor:pointer;gap:7px" data-gender-option>
                  <input type="radio" name="gender" value="${gender.value}" ${index === 0 ? "checked" : ""} style="accent-color:#ff2028;width:15px;height:15px" />
                  <span>${gender.label}</span>
                </label>`,
              ).join("")}
            </div>
            <p class="mf-error" data-error-for="gender"></p>
          </fieldset>

          <div style="grid-column:1/-1">
            <label class="mf-label" for="mfBio">Giới thiệu</label>
            <textarea class="mf-textarea" id="mfBio" name="bio" maxlength="160" placeholder="Vài dòng về bạn…"></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px">
              <p class="mf-error" style="margin:0" data-error-for="bio"></p>
              <span class="mf-muted" style="margin-left:auto;font-size:11.5px" data-bio-count>0/160</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding:16px 22px 22px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.07)">
        <button type="button" class="mf-btn mf-btn-soft" data-modal-close>Huỷ</button>
        <button type="submit" class="mf-btn mf-btn-primary" data-submit>
          ${icon("check", "text-[17px]")} Lưu thay đổi
        </button>
      </div>
    </form>
  </div>
</div>`;

/** Render modal (1 lần) vào body rồi trả về các phần tử cần dùng. */
export function mountEditProfileModal() {
  if (document.getElementById("mfEditProfile")) {
    return refs(document.getElementById("mfEditProfile"));
  }

  const holder = document.createElement("div");
  holder.innerHTML = MARKUP;
  const modal = holder.firstElementChild;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) closeModal(modal);
  });

  const form = $("#mfEditForm", modal);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    refs(modal).submit();
  });

  // Bỏ viền đỏ ngay khi người dùng sửa lại.
  form.addEventListener("input", (event) => {
    const field = event.target.name;
    if (!field) return;
    setError(form, field, "");
  });

  // Form 1 cột trên mobile, 2 cột từ 640px.
  const grid = $("[data-form-grid]", modal);
  const wide = window.matchMedia("(min-width: 640px)");
  const applyGrid = () => {
    grid.style.gridTemplateColumns = wide.matches ? "repeat(2,minmax(0,1fr))" : "1fr";
  };
  applyGrid();
  wide.addEventListener("change", applyGrid);

  return refs(modal);
}

const refsCache = new WeakMap();

const refs = (modal) => {
  if (refsCache.has(modal)) return refsCache.get(modal);

  const form = $("#mfEditForm", modal);
  const preview = $("[data-preview]", modal);
  const counter = $("[data-bio-count]", modal);
  const submitBtn = $("[data-submit]", modal);
  const fileInput = $("[data-file]", modal);
  let avatarOverride = null;

  const setPreview = (value) => {
    preview.src = value || AVATAR_FALLBACK;
  };

  const updateCounter = () => {
    counter.textContent = `${$("#mfBio", modal).value.length}/160`;
  };

  $("[data-clear-avatar]", modal).addEventListener("click", () => {
    avatarOverride = "";
    setPreview(AVATAR_FALLBACK);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast("Ảnh vượt quá 1.5 MB, vui lòng chọn ảnh nhỏ hơn.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      avatarOverride = String(reader.result);
      setPreview(avatarOverride);
    };
    reader.readAsDataURL(file);
  });

  $("#mfBio", modal).addEventListener("input", updateCounter);

  const api = {
    modal,
    form,

    /** Mở modal và điền dữ liệu hiện tại. */
    open(profile, onSaved) {
      avatarOverride = null;
      clearErrors(form);
      form.reset();

      $("#mfFullName", modal).value = profile.fullName || "";
      $("#mfUsername", modal).value = profile.username || "";
      $("#mfEmail", modal).value = profile.email || "";
      $("#mfPhone", modal).value = profile.phone || "";
      $("#mfBirthday", modal).value = (profile.birthday || "").slice(0, 10);
      $("#mfBio", modal).value = profile.bio || "";

      const gender = form.querySelector(`input[name="gender"][value="${profile.gender}"]`);
      if (gender) gender.checked = true;

      setPreview(profile.avatar);
      updateCounter();
      openModal(modal);
      modal.__onSaved = onSaved;
    },

    async submit() {
      const values = Object.fromEntries(new FormData(form).entries());
      const errors = validate(values);

      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([field, message]) => setError(form, field, message));
        const firstField = Object.keys(errors)[0];
        form.querySelector(`[name="${firstField}"]`)?.focus();
        toast("Vui lòng kiểm tra lại các trường được đánh dấu đỏ.", "error");
        return;
      }

      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="mf-spinner" style="display:inline-flex">${icon("refresh", "text-[17px]")}</span> Đang lưu…`;

      try {
        const patch = {
          fullname: values.fullname.trim(),
          username: values.username.trim().replace(/^@/, ""),
          email: values.email.trim(),
          phone: values.phone.trim(),
          dob: values.birthday || "",
          birthday: values.birthday || "",
          gender: values.gender,
          bio: values.bio.trim(),
        };
        if (avatarOverride !== null) patch.avatar = avatarOverride;

        const saved = await saveProfile(patch);
        closeModal(modal);
        toast("Đã cập nhật hồ sơ của bạn.", "success");
        modal.__onSaved?.(saved);
      } catch (error) {
        console.error("[profile] Lỗi lưu hồ sơ:", error);
        toast("Không lưu được hồ sơ. Vui lòng thử lại.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    },
  };

  refsCache.set(modal, api);
  return api;
};

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function validate(values) {
  const errors = {};

  const name = String(values.fullname || "").trim();
  if (!name) errors.fullname = "Vui lòng nhập họ và tên.";
  else if (name.length < 2) errors.fullname = "Họ và tên phải có ít nhất 2 ký tự.";
  else if (name.length > 60) errors.fullname = "Họ và tên không được vượt quá 60 ký tự.";

  const username = String(values.username || "").trim().replace(/^@/, "");
  if (!username) errors.username = "Vui lòng nhập tên tài khoản.";
  else if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
    errors.username = "Tên tài khoản 3–20 ký tự, chỉ gồm chữ, số và dấu _.";
  }

  const email = String(values.email || "").trim();
  if (!email) errors.email = "Vui lòng nhập email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Email không đúng định dạng.";

  const phone = String(values.phone || "").replace(/\s/g, "");
  if (phone && !/^0\d{9}$/.test(phone)) {
    errors.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
  }

  if (values.birthday) {
    const dob = new Date(values.birthday);
    if (Number.isNaN(dob.getTime())) errors.birthday = "Ngày sinh không hợp lệ.";
    else if (dob.getTime() > Date.now()) errors.birthday = "Ngày sinh không được ở tương lai.";
    else {
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 13) errors.birthday = "Bạn phải đủ 13 tuổi để dùng MovieF.";
    }
  }

  const bio = String(values.bio || "");
  if (bio.length > 160) errors.bio = "Giới thiệu không được vượt quá 160 ký tự.";

  return errors;
}

function setError(form, field, message) {
  const holder = form.querySelector(`[data-error-for="${field}"]`);
  if (holder) {
    holder.textContent = message;
    holder.classList.toggle("is-visible", Boolean(message));
  }
  form.querySelectorAll(`[name="${field}"]`).forEach((input) => {
    input.classList.toggle("is-error", Boolean(message));
  });
}

function clearErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = "";
    node.classList.remove("is-visible");
  });
  form.querySelectorAll(".is-error").forEach((node) => node.classList.remove("is-error"));
}

export { setError, clearErrors, validate as validateProfileForm };
