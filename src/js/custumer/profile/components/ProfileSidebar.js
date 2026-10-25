/**
 * ProfileSidebar.js — Menu tài khoản (desktop: cột trái cố định,
 * mobile: bottom navigation + drawer trong Header).
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { TABS } from "../store.js";

const EXTRA_ITEMS = [
  { id: "settings", label: "Cài đặt", icon: "settings", href: "/settings" },
  { id: "logout", label: "Đăng xuất", icon: "logout", danger: true },
];

/** Menu dọc dùng cho desktop. */
export function renderSidebar(
  root,
  { activeTab, counts = {} },
  { onSelectTab, onLogout } = {},
) {
  render(
    root,
    `
    <nav class="mf-card" data-side-nav style="padding:14px;display:flex;flex-direction:column;gap:4px" aria-label="Menu tài khoản">
      <p style="margin:6px 8px 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b7078;font-weight:700">
        Tài khoản của tôi
      </p>

      ${TABS.map(
        (tab) => `
        <button
          type="button"
          class="mf-side-link ${tab.id === activeTab ? "is-active" : ""}"
          data-side-tab="${tab.id}"
          aria-current="${tab.id === activeTab ? "page" : "false"}"
        >
          ${icon(tab.icon, "text-[19px]")}
          <span>${tab.label}</span>
          ${
            tab.countKey && counts[tab.countKey]
              ? `<span class="mf-tab-count" style="margin-left:auto">${counts[tab.countKey]}</span>`
              : ""
          }
        </button>`,
      ).join("")}

      <div class="mf-divider" style="margin:10px 2px"></div>

      ${EXTRA_ITEMS.map(
        (item) => `
        ${
          item.href
            ? `<a class="mf-side-link" href="${item.href}">${icon(item.icon, "text-[19px]")}<span>${item.label}</span></a>`
            : `<button type="button" class="mf-side-link is-danger" data-side-tab="logout">${icon(item.icon, "text-[19px]")}<span>${item.label}</span></button>`
        }`,
      ).join("")}
    </nav>


    <div class="mf-card" style="margin-top:14px;padding:16px;display:flex;flex-direction:column;gap:12px">
  <span class="mf-chip" style="align-self:flex-start;background:rgba(34,158,217,.12);color:#229ED9">
    ${icon("send", "text-[13px]")} Telegram
  </span>

  <p class="mf-muted" style="margin:0;font-size:12.5px;line-height:1.6">
    Liên kết Telegram để nhận mã OTP khi quên mật khẩu và khôi phục tài khoản MovieF.
  </p>

  <button
    type="button"
    id="linkTelegram"
    class="mf-btn mf-btn-outline mf-btn-sm"
    style="width:100%;border-color:#229ED9;color:#229ED9"
  >
    ${icon("send", "text-[14px]")} Liên kết Telegram
  </button>
</div>
    <div class="mf-card" style="margin-top:14px;padding:16px;display:flex;flex-direction:column;gap:12px">
      <span class="mf-chip mf-chip-gold" style="align-self:flex-start">${icon("award", "text-[13px]")} Thành viên bạc</span>
      <p class="mf-muted" style="margin:0;font-size:12.5px;line-height:1.6">
        Xem thêm <strong style="color:#fff">7 phim</strong> để lên hạng vàng và mở kho phim độc quyền.
      </p>
      <a class="mf-btn mf-btn-outline mf-btn-sm" href="/movies" style="width:100%">Nâng cấp</a>
    </div>
  `,
  );

  root.querySelector("[data-side-nav]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-side-tab]");
    if (!button) return;
    if (button.dataset.sideTab === "logout") onLogout?.();
    else onSelectTab?.(button.dataset.sideTab);
  });
  // Xử lý nút liên kết Telegram trong sidebar.
  root.querySelector("#linkTelegram")?.addEventListener("click", (event) => {
    event.preventDefault();
    handleLinkTelegram();
  });
}

/** Bottom navigation cho mobile. */
export function renderBottomNav(root, { activeTab, counts = {} }, onSelectTab) {
  const items = TABS.slice(0, 4).concat([EXTRA_ITEMS[0]]);

  render(
    root,
    `
    <nav class="mf-bottomnav" aria-label="Menu nhanh">
      ${items
        .map((item) => {
          const isTab = Boolean(TABS.some((tab) => tab.id === item.id));
          const count = item.countKey ? counts[item.countKey] : 0;
          const badge =
            count > 0
              ? `<span style="position:absolute;top:2px;right:22%;min-width:16px;height:16px;border-radius:999px;background:#e50914;color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px">${count > 99 ? "99+" : count}</span>`
              : "";

          if (!isTab) {
            return `
            <a class="mf-bottomnav-item" href="${item.href}">
              <span class="mf-bn-ico" style="position:relative;display:inline-flex">${badge}${icon(item.icon, "text-[21px]")}</span>
              <span>${escapeHtml(item.label)}</span>
            </a>`;
          }
          return `
          <button
            type="button"
            class="mf-bottomnav-item ${item.id === activeTab ? "is-active" : ""}"
            data-bottom-tab="${item.id}"
            aria-current="${item.id === activeTab ? "page" : "false"}"
          >
            <span class="mf-bn-ico" style="position:relative;display:inline-flex">${badge}${icon(item.icon, "text-[21px]")}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>`;
        })
        .join("")}
    </nav>
  `,
  );

  root.querySelector(".mf-bottomnav")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bottom-tab]");
    if (button) onSelectTab(button.dataset.bottomTab);
  });
}

// sử lý tele liên kết

async function handleLinkTelegram() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  if (!currentUser?.email) {
    await Swal.fire({
      icon: "warning",
      title: "Chưa đăng nhập",
      text: "Vui lòng đăng nhập MovieF trước khi liên kết Telegram.",
      background: "#141414",
      color: "#ffffff",
    });
    return;
  }

  const result = await Swal.fire({
    title: "Xác nhận tài khoản MovieF",
    text: `Nhập mật khẩu của ${currentUser.email} để tạo liên kết Telegram.`,
    input: "password",
    inputLabel: "Mật khẩu MovieF",
    inputPlaceholder: "Nhập mật khẩu",
    inputAttributes: {
      autocomplete: "current-password",
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Tiếp tục",
    cancelButtonText: "Hủy",
    confirmButtonColor: "#229ED9",
    background: "#141414",
    color: "#ffffff",
    inputValidator: (value) => {
      if (!value) return "Vui lòng nhập mật khẩu.";
    },
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch(
      "http://localhost:3002/api/auth/telegram/link",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentUser.email,
          password: result.value,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      await Swal.fire({
        icon: "error",
        title: "Không thể liên kết",
        text: data.message || "Không tạo được mã liên kết Telegram.",
        background: "#141414",
        color: "#ffffff",
      });
      return;
    }

    const choice = await Swal.fire({
      icon: "success",
      title: "Đã tạo mã liên kết",
      text: "Mã có hiệu lực trong 5 phút. Nhấn tiếp tục để mở Telegram.",
      showCancelButton: true,
      confirmButtonText: "Mở Telegram",
      cancelButtonText: "Để sau",
      confirmButtonColor: "#229ED9",
      background: "#141414",
      color: "#ffffff",
    });

    if (choice.isConfirmed && data.telegramUrl) {
      window.location.href = data.telegramUrl;
    }
  } catch (error) {
    console.error("Lỗi liên kết Telegram:", error);

    await Swal.fire({
      icon: "error",
      title: "Không kết nối được backend",
      text: "Kiểm tra JSON Server cổng 3000, backend Telegram cổng 3002 và kết nối mạng.",
      background: "#141414",
      color: "#ffffff",
    });
  }
}
