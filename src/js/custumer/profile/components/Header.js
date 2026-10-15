/**
 * Header.js — Thanh header MovieF (logo, tìm kiếm, menu, thông báo, menu tài khoản).
 * Dùng chung cho trang Cá nhân và trang Cài đặt.
 */

import { escapeHtml, mediaUrl, AVATAR_FALLBACK, render } from "../utils.js";
import { icon } from "../icons.js";
import { bindDropdown, confirmDialog, toast } from "../ui.js";
import { getSessionUser, isSignedIn, signOut } from "../service.js";

export const NAV_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Phim mới", href: "/movies" },
  { label: "Thể loại", href: "/genres" },
  { label: "Quốc gia", href: "/movies?country=usa" },
  { label: "Phim bộ", href: "/movies?type=series" },
  { label: "Phim lẻ", href: "/movies?type=movie" },
];

const ACCOUNT_ITEMS = [
  { label: "Trang cá nhân", href: "/profile", value: "profile", icon: "user" },
  { label: "Danh sách yêu thích", href: "/profile?tab=favorites", value: "favorites", icon: "heart" },
  { label: "Lịch sử xem", href: "/profile?tab=history", value: "history", icon: "history" },
  { label: "Cài đặt", href: "/settings", value: "settings", icon: "settings" },
];

const logo = () => `
  <a href="/" class="mf-link" style="display:flex;align-items:center;gap:10px;color:#fff" aria-label="MovieF - Trang chủ">
    <span style="width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#ff2028,#a50f16);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 10px 24px -14px rgba(255,32,40,.9)">
      ${icon("clapper", "text-[20px]")}
    </span>
    <span style="font-weight:800;font-size:20px;letter-spacing:-.03em;line-height:1">Movie<span style="color:#ff2028">F</span></span>
  </a>
`;

const accountMenu = (user) => `
  <div class="mf-menu" id="mfAccountMenu" hidden>
    <div style="padding:10px 12px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;gap:10px;align-items:center">
      <img
        src="${mediaUrl(user?.avatar, AVATAR_FALLBACK)}"
        alt="Ảnh đại diện"
        data-fallback="${AVATAR_FALLBACK}"
        style="width:38px;height:38px;border-radius:999px;object-fit:cover;flex:none"
      />
      <div style="min-width:0">
        <p class="mf-truncate" style="margin:0;font-size:14px;font-weight:600;color:#fff">${escapeHtml(user?.fullname || user?.username || "Người dùng")}</p>
        <p class="mf-truncate mf-muted" style="margin:2px 0 0;font-size:12px">${escapeHtml(user?.email || "")}</p>
      </div>
    </div>
    <div style="padding:6px 0 0;display:flex;flex-direction:column;gap:2px">
      ${ACCOUNT_ITEMS.map(
        (item) => `
        <a class="mf-menu-item" data-menu-value="${item.value}" href="${item.href}">
          ${icon(item.icon, "text-[18px]")}<span>${item.label}</span>
        </a>`,
      ).join("")}
      <button type="button" class="mf-menu-item is-danger" data-menu-value="logout">
        ${icon("logout", "text-[18px]")}<span>Đăng xuất</span>
      </button>
    </div>
  </div>
`;

const signInBlock = () => `
  <div style="display:flex;align-items:center;gap:8px">
    <a class="mf-btn mf-btn-soft mf-btn-sm" href="/login">Đăng nhập</a>
    <a class="mf-btn mf-btn-primary mf-btn-sm" href="/register">Đăng ký</a>
  </div>
`;

/**
 * Render header vào `root`.
 * @param {string|HTMLElement} root
 * @param {{activePath?:string}} [options]
 */
export function renderHeader(root, options = {}) {
  const user = getSessionUser();
  const signedIn = isSignedIn();
  const activePath = options.activePath || window.location.pathname;

  render(
    root,
    `
    <header
      style="position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(11,13,18,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07)"
    >
      <div class="mf-container" style="height:72px;display:flex;align-items:center;gap:18px">
        ${logo()}

        <nav class="mf-scroll-x" style="display:none;align-items:center;gap:4px" data-desktop-nav>
          ${NAV_ITEMS.map(
            (item) => `
            <a
              class="mf-link"
              href="${item.href}"
              style="padding:8px 12px;border-radius:9px;white-space:nowrap;font-weight:500;${
                activePath === item.href
                  ? "background:rgba(255,32,40,.14);color:#fff"
                  : ""
              }"
            >${item.label}</a>`,
          ).join("")}
        </nav>

        <form
          role="search"
          style="display:none;flex:1;max-width:340px;margin-left:auto;position:relative;align-items:center"
          data-search
        >
          <span style="position:absolute;left:12px;display:inline-flex;color:#9ca0aa;pointer-events:none">${icon("search", "text-[18px]")}</span>
          <input
            type="search"
            aria-label="Tìm kiếm phim"
            placeholder="Tìm kiếm phim, diễn viên..."
            class="mf-input"
            style="padding-left:40px;height:42px"
          />
        </form>

        <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
          <button
            type="button"
            class="mf-icon-btn"
            style="display:none"
            data-open-search
            aria-label="Tìm kiếm"
          >${icon("search", "text-[22px]")}</button>

          <button type="button" class="mf-icon-btn" aria-label="Thông báo" data-notifications style="position:relative">
            ${icon("bell", "text-[22px]")}
            <span class="mf-dot" style="position:absolute;top:7px;right:7px;box-shadow:0 0 0 2px #0b0d12"></span>
          </button>

          ${
            signedIn
              ? `<div style="position:relative">
                  <button
                    type="button"
                    id="mfAccountTrigger"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    aria-controls="mfAccountMenu"
                    style="display:flex;align-items:center;gap:8px;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);cursor:pointer;max-width:190px"
                  >
                    <img
                      src="${mediaUrl(user.avatar, AVATAR_FALLBACK)}"
                      alt="Ảnh đại diện"
                      data-fallback="${AVATAR_FALLBACK}"
                      style="width:32px;height:32px;border-radius:999px;object-fit:cover;flex:none"
                    />
                    <span class="mf-truncate" style="font-size:13.5px;font-weight:600;color:#fff">${escapeHtml(user.fullname || user.username || "Tài khoản")}</span>
                    ${icon("chevronDown", "text-[18px]")}
                  </button>
                  ${accountMenu(user)}
                </div>`
              : signInBlock()
          }

          <button type="button" class="mf-icon-btn" data-open-drawer aria-label="Mở menu" style="display:none">
            ${icon("menu", "text-[24px]")}
          </button>
        </div>
      </div>

      <div class="mf-container" style="padding-bottom:12px;display:none" data-search-row>
        <form role="search" style="position:relative;align-items:center;display:flex" data-search-form>
          <span style="position:absolute;left:12px;display:inline-flex;color:#9ca0aa;pointer-events:none">${icon("search", "text-[18px]")}</span>
          <input
            type="search"
            aria-label="Tìm kiếm phim"
            placeholder="Tìm kiếm phim, diễn viên..."
            class="mf-input"
            style="padding-left:40px;height:42px"
          />
        </form>
      </div>
    </header>

    <div class="mf-drawer" id="mfDrawer" aria-hidden="true">
      <div class="mf-drawer-backdrop" data-close-drawer></div>
      <div class="mf-drawer-panel" role="dialog" aria-label="Menu">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px">
          ${logo()}
          <button type="button" class="mf-icon-btn" data-close-drawer aria-label="Đóng menu">${icon("close", "text-[22px]")}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.08)">
          ${NAV_ITEMS.map(
            (item) => `
            <a class="mf-menu-item" href="${item.href}" style="height:44px">${icon("chevronRight", "text-[16px]")}<span>${item.label}</span></a>`,
          ).join("")}
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;padding-top:16px">
          ${
            signedIn
              ? `${ACCOUNT_ITEMS.map(
                  (item) => `
                <a class="mf-menu-item" href="${item.href}" style="height:44px">${icon(item.icon, "text-[18px]")}<span>${item.label}</span></a>`,
                ).join("")}
                <button type="button" class="mf-menu-item is-danger" data-logout style="height:44px">${icon("logout", "text-[18px]")}<span>Đăng xuất</span></button>`
              : `<a class="mf-btn mf-btn-primary" href="/login" style="width:100%">Đăng nhập</a>
                 <a class="mf-btn mf-btn-soft" href="/register" style="width:100%;margin-top:8px">Tạo tài khoản</a>`
          }
        </div>
      </div>
    </div>
  `,
  );
  bindHeaderEvents();
}

/* ------------------------------------------------------------------ *
 * Hành vi
 * ------------------------------------------------------------------ */

/** Bề rộng cột: desktop bật nav + search; mobile chỉ logo + icon. */
function syncBreakpoints() {
  const wide = window.matchMedia("(min-width: 1120px)");
  const mid = window.matchMedia("(min-width: 768px)");

  const apply = () => {
    const nav = document.querySelector("[data-desktop-nav]");
    const search = document.querySelector("[data-search]");
    const searchIcon = document.querySelector("[data-open-search]");
    const burger = document.querySelector("[data-open-drawer]");

    if (nav) nav.style.display = wide.matches ? "flex" : "none";
    if (search) search.style.display = wide.matches ? "flex" : "none";
    if (searchIcon) searchIcon.style.display = mid.matches && !wide.matches ? "inline-flex" : "none";
    if (burger) burger.style.display = wide.matches ? "none" : "inline-flex";
  };

  apply();
  wide.addEventListener("change", apply);
  mid.addEventListener("change", apply);
}

async function handleLogout() {
  const ok = await confirmDialog({
    title: "Đăng xuất?",
    text: "Bạn sẽ cần đăng nhập lại để xem trang cá nhân và lịch sử xem.",
    okText: "Đăng xuất",
  });
  if (!ok) return;

  signOut();
  toast("Đã đăng xuất khỏi MovieF.", "success");
  setTimeout(() => {
    window.location.href = "/login";
  }, 700);
}

function openDrawer() {
  const drawer = document.getElementById("mfDrawer");
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  drawer.querySelector("[data-close-drawer]:not(.mf-drawer-backdrop)")?.focus();
}

function closeDrawer() {
  const drawer = document.getElementById("mfDrawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function bindHeaderEvents() {
  syncBreakpoints();

  const trigger = document.getElementById("mfAccountTrigger");
  const menu = document.getElementById("mfAccountMenu");
  if (trigger && menu) {
    bindDropdown({
      trigger,
      menu,
      onSelect: (value) => {
        if (value === "logout") handleLogout();
      },
    });
  }

  // Hai ô tìm kiếm chỉ để hiển thị, chưa nối API tìm kiếm.
  document.querySelectorAll("[data-search], [data-search-form]").forEach((form) => {
    form.addEventListener("submit", (event) => event.preventDefault());
  });

  document.querySelector("[data-open-drawer]")?.addEventListener("click", openDrawer);
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-drawer]")) closeDrawer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
  document.querySelector("[data-logout]")?.addEventListener("click", handleLogout);

  // Thanh tìm kiếm thu gọn trên tablet.
  const searchIcon = document.querySelector("[data-open-search]");
  const searchRow = document.querySelector("[data-search-row]");
  searchIcon?.addEventListener("click", () => {
    if (!searchRow) return;
    const opening = searchRow.style.display === "none" || !searchRow.style.display;
    searchRow.style.display = opening ? "block" : "none";
    if (opening) searchRow.querySelector("input")?.focus();
  });

  document.querySelector("[data-notifications]")?.addEventListener("click", () => {
    toast("Bạn không có thông báo mới.", "info");
  });
}
