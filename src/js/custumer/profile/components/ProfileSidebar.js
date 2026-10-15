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
export function renderSidebar(root, { activeTab, counts = {} }, { onSelectTab, onLogout } = {}) {
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
            count > 0 ? `<span style="position:absolute;top:2px;right:22%;min-width:16px;height:16px;border-radius:999px;background:#ff2028;color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px">${count > 99 ? "99+" : count}</span>` : "";

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
