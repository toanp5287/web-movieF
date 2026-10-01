/**
 * header.js — Khối tài khoản trên Header của các trang khách MovieF.
 *
 * Trước khi đăng nhập: [Đăng nhập] [Đăng ký]
 * Sau khi đăng nhập:   [Avatar] Nguyễn Văn A ▼
 *   └── Menu: Trang cá nhân · Phim yêu thích · Lịch sử xem · Đổi mật khẩu · Đăng xuất
 *
 * Phiên đọc/ghi qua `auth-session.js` (khoá localStorage `currentUser` — cùng cơ chế
 * cũ nên không ảnh hưởng các trang khác).
 */

import api from "../api.js";
import {
  clearSession,
  getSessionUser,
  REDIRECT_KEY,
} from "./auth-session.js";

const AVATAR_FALLBACK = "/images/avatar/default.svg";
const SIGN_IN_PATH = "/login";

const header = document.querySelector("#user");
if (header) {
  const avatarOf = (user) => user?.avatar?.trim() || AVATAR_FALLBACK;

  const accountMenu = (user, roleName) => `
    <div
      id="userMenu"
      class="hidden absolute right-0 top-12 w-60 bg-surface-container-high border border-white/10 rounded-xl shadow-xl p-2 z-50"
      role="menu"
    >
      <div class="px-3 py-2 border-b border-white/10 mb-1">
        <p class="text-sm font-semibold text-on-surface truncate">
          ${user.fullname || user.username}
        </p>
        <p class="text-xs text-on-surface-variant truncate">${user.email || ""}</p>
      </div>

      ${
        roleName?.toLowerCase() === "admin" || roleName?.toLowerCase() === "staff"
          ? `
            <a
              href="/admin"
              role="menuitem"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
            >
              <span class="material-symbols-outlined text-lg">admin_panel_settings</span>
              Quản trị
            </a>
          `
          : ""
      }

      <a
        href="/profile"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">person</span>
        Trang cá nhân
      </a>

      <a
        href="/favorite"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">favorite</span>
        Phim yêu thích
      </a>

      <a
        href="/profile?tab=history"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">history</span>
        Lịch sử xem
      </a>

      <a
        href="/settings#security"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">lock</span>
        Đổi mật khẩu
      </a>

      <div class="my-1 h-px bg-white/10"></div>

      <button
        id="logoutBtn"
        type="button"
        role="menuitem"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">logout</span>
        Đăng xuất
      </button>
    </div>
  `;

  async function roleNameOf(user) {
    if (user?.roleId === undefined) return "";
    try {
      const role = await api.get(`/roles/${user.roleId}`);
      return role?.name || "";
    } catch {
      return "";
    }
  }

  async function renderUser() {
    const user = getSessionUser();

    if (!user) {
      header.innerHTML = `
        <div class="flex items-center gap-3">
          <a
            href="${SIGN_IN_PATH}"
            class="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            data-sign-in
          >
            Đăng nhập
          </a>
          <a
            href="/register"
            class="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-tertiary-container hover:shadow-lg hover:shadow-primary-container/30 active:scale-[0.99] transition-all"
          >
            Đăng ký
          </a>
        </div>
      `;
      return;
    }

    header.innerHTML = `
      <div class="relative">
        <button
          id="userButton"
          type="button"
          aria-haspopup="menu"
          aria-expanded="false"
          class="flex items-center gap-space-xs p-space-xs rounded-full hover:bg-surface-container-high transition-colors group"
        >
          <img
            alt="Ảnh đại diện"
            class="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary-container transition-all"
            src="${avatarOf(user)}"
            onerror="this.onerror=null;this.src='${AVATAR_FALLBACK}'"
          />

          <span
            class="hidden sm:inline-block max-w-[140px] truncate text-sm text-on-surface group-hover:text-on-surface transition-colors"
          >
            ${user.fullname || user.username}
          </span>

          <span class="material-symbols-outlined text-on-surface-variant text-base hidden sm:inline-block">
            expand_more
          </span>
        </button>

        ${accountMenu(user, await roleNameOf(user))}
      </div>
    `;

    const userButton = document.querySelector("#userButton");
    const userMenu = document.querySelector("#userMenu");

    const closeMenu = () => {
      if (!userMenu || !userButton) return;
      userMenu.classList.add("hidden");
      userButton.setAttribute("aria-expanded", "false");
    };

    userButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!userMenu) return;
      const opening = userMenu.classList.contains("hidden");
      userMenu.classList.toggle("hidden");
      userButton.setAttribute("aria-expanded", String(opening));
    });

    // Đóng menu khi bấm ra ngoài hoặc nhấn ESC.
    document.addEventListener("click", (event) => {
      if (!userMenu?.classList.contains("hidden") && !header.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.querySelector("#logoutBtn")?.addEventListener("click", () => {
      // Xoá trạng thái đăng nhập + session, cập nhật Header, về Trang chủ.
      clearSession();
      renderUser();

      if (typeof Swal !== "undefined") {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Đã đăng xuất",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,

          customClass: {
            popup:
              "bg-[#111111]! border! border-white/10! rounded-xl! shadow-2xl! w-[300px]!",
            title: "text-white! text-sm! font-semibold!",
            timerProgressBar: "bg-red-600!",
          },
        });
      }

      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    });
  }

  renderUser();

  // Nút "Đăng nhập" nhớ lại trang đang xem để quay lại sau khi đăng nhập.
  header.addEventListener("click", (event) => {
    if (!event.target.closest("[data-sign-in]")) return;
    try {
      sessionStorage.setItem(REDIRECT_KEY, window.location.href);
    } catch {
      /* bỏ qua */
    }
  });
}
