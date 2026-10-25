import { escapeHtml } from "./movie-data.js";
import { attachSearchSuggest } from "./search-suggest.js";

export const NAV_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Phim", href: "/movies" },
  { label: "Thể loại", href: "/genres" },
  { label: "Top phim", href: "/topMovies" },
  { label: "Hội viên", href: "/membership" },
];

const PAYMENT_API = "http://localhost:3002";

function safeUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

async function membershipLabel(user) {
  let access = {};
  try {
    access = JSON.parse(localStorage.getItem("moviefOrderAccess") || "{}");
  } catch {
    localStorage.removeItem("moviefOrderAccess");
  }

  const token = access[String(user.id)];
  if (!token) return '<span class="text-xs text-on-surface-variant">Free</span>';

  try {
    const response = await fetch(
      `${PAYMENT_API}/api/membership/status?userId=${encodeURIComponent(String(user.id))}`,
      { headers: { "x-order-access-token": token } },
    );
    const result = await response.json();
    if (response.ok && result.success && result.data.active) {
      return '<span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-300"><span class="material-symbols-outlined text-base">diamond</span>Premium</span>';
    }
  } catch (error) {
    console.warn("Không tải được trạng thái hội viên:", error);
  }

  return '<span class="text-xs text-on-surface-variant">Free</span>';
}

function userMarkup(user, membership) {
  if (!user) {
    return `
      <div class="flex items-center gap-2">
        <a href="/login" class="px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5">Đăng nhập</a>
        <a href="/register" class="px-3 py-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold">Đăng ký</a>
      </div>`;
  }

  const name = escapeHtml(user.fullname || user.username || "Tài khoản");
  const avatar = escapeHtml(user.avatar || "/images/avatar/default.svg");
  const roleLink = Number(user.roleId) === 1 || Number(user.roleId) === 2
    ? `<a href="/admin" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5"><span class="material-symbols-outlined text-lg">admin_panel_settings</span>Quản trị</a>`
    : "";

  return `
    <div class="relative flex items-center gap-2">
      <div class="hidden sm:block text-right">${membership}</div>
      <button id="userButton" type="button" class="flex items-center gap-2 p-1 rounded-full hover:bg-surface-container-high" aria-expanded="false" aria-haspopup="true">
        <img src="${avatar}" alt="Ảnh đại diện" class="w-8 h-8 rounded-full object-cover" />
        <span class="material-symbols-outlined text-on-surface-variant text-base">expand_more</span>
      </button>
      <div id="userMenu" class="hidden absolute right-0 top-12 w-56 bg-surface-container-high border border-white/10 rounded-xl shadow-xl p-2 z-50">
        <div class="px-3 py-2 border-b border-white/10 mb-1">
          <p class="text-sm font-semibold text-on-surface truncate">${name}</p>
          <p class="text-xs text-on-surface-variant truncate">${escapeHtml(user.email || "")}</p>
          <div class="mt-1 sm:hidden">${membership}</div>
        </div>
        ${roleLink}
        <a href="/profile" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5"><span class="material-symbols-outlined text-lg">person</span>Hồ sơ</a>
        <a href="/profile?tab=favorites" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5"><span class="material-symbols-outlined text-lg">favorite</span>Yêu thích</a>
        <a href="/profile?tab=history" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5"><span class="material-symbols-outlined text-lg">history</span>Lịch sử xem</a>
        <button id="logoutBtn" type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10"><span class="material-symbols-outlined text-lg">logout</span>Đăng xuất</button>
      </div>
    </div>`;
}

function headerContents(activePath) {
  return `
    <div class="h-20 w-full px-gutter-mobile md:px-margin flex items-center justify-between gap-space-md">
      <div class="flex items-center gap-space-lg lg:gap-space-xl min-w-0">
        <a href="/" class="flex items-center gap-space-sm shrink-0">
          <img alt="MovieF" class="h-8 w-auto object-contain" src="/images/logo/logo.svg" />
          <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-extrabold hidden sm:inline-block">Movie<span class="text-primary-container">F</span></span>
        </a>
        <nav class="hidden xl:flex items-center gap-space-md lg:gap-space-lg">
          ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="font-title-sm text-title-sm ${activePath === item.href ? "text-on-surface font-semibold" : "text-on-surface-variant hover:text-on-surface"} transition-colors py-space-xs">${item.label}</a>`).join("")}
        </nav>
      </div>
      <div class="flex items-center gap-space-sm sm:gap-space-md shrink-0">
        <div class="relative hidden xl:flex items-center">
          <span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">search</span>
          <input class="w-64 xl:w-72 pl-9 pr-space-md py-space-xs bg-surface-container-low text-on-surface placeholder-on-surface-variant font-body-sm text-body-sm rounded-lg border border-white/10 focus:outline-none focus:border-outline focus:ring-1 focus:ring-outline" placeholder="Tìm kiếm phim, diễn viên..." type="search" />
        </div>
        <button class="xl:hidden flex items-center justify-center p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high" type="button" aria-label="Tìm kiếm">
          <span class="material-symbols-outlined text-xl">search</span>
        </button>
        <button class="relative hidden lg:flex items-center justify-center p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high" type="button" aria-label="Thông báo">
          <span class="material-symbols-outlined text-2xl">notifications</span>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-container rounded-full ring-2 ring-surface-container-lowest"></span>
        </button>
        <div id="user" class="flex items-center gap-space-xs pl-space-xs"></div>
        <button id="siteMenuToggle" class="xl:hidden flex items-center justify-center p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high" type="button" aria-label="Mở điều hướng">
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
      </div>
    </div>`;
}

function bindHeader(header) {
  if (header.dataset.eventsBound === "1") return;
  header.dataset.eventsBound = "1";

  header.addEventListener("click", (event) => {
    const userButton = event.target.closest("#userButton");
    if (userButton) {
      const menu = header.querySelector("#userMenu");
      const open = menu?.classList.toggle("hidden") === false;
      userButton.setAttribute("aria-expanded", String(open));
      return;
    }

    if (event.target.closest("#loginBtn")) {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
      return;
    }

    if (event.target.closest('a[href="/login"]')) {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
      return;
    }

    if (event.target.closest("#logoutBtn")) {
      localStorage.removeItem("currentUser");
      window.dispatchEvent(new CustomEvent("movief:account-changed"));
      window.location.href = "/login";
    }
  });

  document.addEventListener("click", (event) => {
    const menu = header.querySelector("#userMenu");
    const button = header.querySelector("#userButton");
    if (!menu || menu.classList.contains("hidden")) return;
    if (menu.contains(event.target) || button?.contains(event.target)) return;
    menu.classList.add("hidden");
    button?.setAttribute("aria-expanded", "false");
  });
}

export async function renderSiteHeader(root, options = {}) {
  if (!root) return;

  const activePath = options.activePath || window.location.pathname;
  let mount = root;
  if (root.tagName === "HEADER") {
    const wrapper = document.createElement("div");
    wrapper.id = root.id || "header";
    root.replaceWith(wrapper);
    mount = wrapper;
  }

  let header = mount.querySelector(":scope > #siteHeader");
  if (!header) {
    header = document.createElement("header");
    header.id = "siteHeader";
    header.className = "fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-white/5";
    header.innerHTML = headerContents(activePath);

    const oldHeader = mount.querySelector("header");
    const previousHeaderHeight = oldHeader?.getBoundingClientRect().height || 80;
    mount.replaceChildren(header);

    document.querySelectorAll("main").forEach((main) => {
      const currentPadding = Number.parseFloat(getComputedStyle(main).paddingTop) || 0;
      main.style.paddingTop = `${Math.max(currentPadding, previousHeaderHeight)}px`;
    });
  }

  let drawer = document.getElementById("siteNavDrawer");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = "siteNavDrawer";
    drawer.className = "hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm xl:hidden";
    drawer.innerHTML = `
    <div class="absolute right-0 top-0 h-full w-[min(86vw,360px)] overflow-y-auto border-l border-white/10 bg-surface-container-lowest p-space-md shadow-2xl">
      <div class="mb-space-md flex items-center justify-between">
        <a href="/" class="flex items-center gap-space-sm"><img src="/images/logo/logo.svg" alt="MovieF" class="h-8 w-auto" /><span class="font-headline-sm text-on-surface font-bold">Movie<span class="text-primary-container">F</span></span></a>
        <button type="button" data-site-menu-close class="p-2 text-on-surface-variant" aria-label="Đóng điều hướng"><span class="material-symbols-outlined">close</span></button>
      </div>
      <nav class="flex flex-col gap-1 border-b border-white/10 pb-space-md">
        ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="rounded-lg px-3 py-3 text-on-surface hover:bg-white/5">${item.label}</a>`).join("")}
      </nav>
      <nav class="flex flex-col gap-1 pt-space-md">
        <a href="/profile" class="rounded-lg px-3 py-3 text-on-surface hover:bg-white/5">Hồ sơ</a>
        <a href="/profile?tab=favorites" class="rounded-lg px-3 py-3 text-on-surface hover:bg-white/5">Yêu thích</a>
        <a href="/profile?tab=history" class="rounded-lg px-3 py-3 text-on-surface hover:bg-white/5">Lịch sử xem</a>
        <a href="/settings" class="rounded-lg px-3 py-3 text-on-surface hover:bg-white/5">Cài đặt</a>
      </nav>
    </div>`;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer || event.target.closest("[data-site-menu-close]")) {
        drawer.classList.add("hidden");
        document.body.style.overflow = "";
      }
    });
  }

  const userSlot = header.querySelector("#user");
  const renderAccount = async () => {
    const user = safeUser();
    userSlot.innerHTML = user
      ? userMarkup(user, await membershipLabel(user))
      : userMarkup(null, "");
    bindHeader(header);
  };

  await renderAccount();

  const searchInput = header.querySelector(
    'input[placeholder="Tìm kiếm phim, diễn viên..."]',
  );
  const searchWrap = searchInput?.closest(".relative");
  const searchToggle = searchWrap?.nextElementSibling;
  if (searchInput) attachSearchSuggest(searchInput);
  if (searchToggle && searchToggle.dataset.bound !== "1") {
    searchToggle.dataset.bound = "1";
    searchToggle.addEventListener("click", () => {
      if (!searchWrap) return;
      const isHidden = searchWrap.classList.toggle("hidden");
      searchWrap.classList.toggle("flex", !isHidden);
      if (!isHidden) searchInput?.focus();
    });
  }

  const menuToggle = header.querySelector("#siteMenuToggle");
  if (menuToggle && menuToggle.dataset.bound !== "1") {
    menuToggle.dataset.bound = "1";
    menuToggle.addEventListener("click", () => {
      drawer.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  }

  if (drawer.dataset.escapeBound !== "1") {
    drawer.dataset.escapeBound = "1";
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      drawer.classList.add("hidden");
      document.body.style.overflow = "";
    });
  }

  if (header.dataset.accountListenersBound !== "1") {
    header.dataset.accountListenersBound = "1";
    window.addEventListener("movief:membership-updated", renderAccount);
    window.addEventListener("movief:account-changed", renderAccount);
    window.addEventListener("focus", renderAccount);
    window.addEventListener("pageshow", renderAccount);
    window.addEventListener("storage", (event) => {
      if (event.key === "currentUser" || event.key === "moviefOrderAccess") {
        renderAccount();
      }
    });
  }
}
