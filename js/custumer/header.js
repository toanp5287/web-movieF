import api from "../api.js";

const header = document.querySelector("#user");

const userData = localStorage.getItem("currentUser");
const user = userData ? JSON.parse(userData) : null;

async function renderUser() {
  const userData = localStorage.getItem("currentUser");
  const user = userData ? JSON.parse(userData) : null;

  if (user) {
    const idRole = String(user.roleId);
    const role = await api.get(`/roles/${idRole}`);
    const roleNameUser = role.name;

    header.innerHTML = `
  <div class="relative">

    <button
      id="userButton"
      class="flex items-center gap-space-xs p-space-xs rounded-full hover:bg-surface-container-high transition-colors group"
      type="button"
    >
      <img
        alt="Profile"
        class="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-primary-container transition-all"
        src="${user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDeWGYl7ORt_8nQC2EZl_68RLR-gud9pN1IVzOHlQ-Y4TmYpcZmK0PcyyfziT_ZPmTWcGs69_soKBKJCPu__ykZ_ryFDNUeJy12Y8yThOAKsT3Q7n4EVR3-7_kNryrAbqNl3Obma1EcjlSPVqLlA3briFLLgOtMgn4FrZPPj8LS2LT1oW4FIJpWuiCxfFvFOMqK4mhcayNzjeb4iipNQWmCxaXkerE21EEqPBFIUB2ajy2MgDtsLidx"}"
      />
      
      <span
        class="material-symbols-outlined text-on-surface-variant text-base hidden sm:inline-block group-hover:text-on-surface transition-colors"
      >
        expand_more
      </span>
    </button>

    <div
      id="userMenu"
      class="hidden absolute right-0 top-12 w-48 bg-surface-container-high border border-white/10 rounded-xl shadow-xl p-2 z-50"
    >

      <div class="px-3 py-2 border-b border-white/10 mb-1">
        <p class="text-sm font-semibold text-on-surface">
          ${user.fullname || user.username}
        </p>

        <p class="text-xs text-on-surface-variant truncate">
          ${user.email}
        </p>
      </div>

      ${
        roleNameUser?.toLowerCase() === "admin"
          ? `
            <a
              href="/admin/index.html"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
            >
              <span class="material-symbols-outlined text-lg">
                admin_panel_settings
              </span>
              Quản trị
            </a>
          `
          : ""
      }

      <a
        href="/pages/profile.html"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          person
        </span>
        Hồ sơ
      </a>

      <a
        href="/pages/favorites.html"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          favorite
        </span>
        Yêu thích
      </a>

      <button
        id="logoutBtn"
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <span class="material-symbols-outlined text-lg">
          logout
        </span>
        Đăng xuất
      </button>

    </div>
  </div>
`;
  } else {
    header.innerHTML = `
      <div class="flex items-center gap-3">

        <button
        id="loginBtn"
          type="button"
          class="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          Đăng nhập
        </button>

        <a
          href="/pages/register.html"
          class="px-4 py-2 rounded-lg bg-primary-container text-on-primary"
        >
          Đăng ký
        </a>

      </div>
    `;
  }

  const userButton = document.querySelector("#userButton");
  const userMenu = document.querySelector("#userMenu");

  if (userButton && userMenu) {
    userButton.addEventListener("click", () => {
      userMenu.classList.toggle("hidden");
    });
  }

  const logoutBtn = document.querySelector("#logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");

      renderUser();

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
    });
  }
}

renderUser();

const loginUrl = document.querySelector("#loginBtn");
if (loginUrl) {
  loginUrl.addEventListener("click", () => {
    sessionStorage.setItem("redirectAfterLogin", window.location.href);

    window.location.href = "/pages/login.html";
  });
}
