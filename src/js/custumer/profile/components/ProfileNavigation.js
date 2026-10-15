/**
 * ProfileNavigation.js — Dải tab chuyển khu vực (Tổng quan / Lịch sử / Yêu thích / ...).
 */

import { render } from "../utils.js";
import { icon } from "../icons.js";
import { TABS } from "../store.js";

/**
 * @param {string|HTMLElement} root
 * @param {{activeTab:string, counts:object}} options
 * @param {(tabId:string)=>void} onChange
 */
export function renderNavigation(root, { activeTab, counts = {} }, onChange) {
  render(
    root,
    `
    <div class="mf-scroll-x" role="tablist" aria-label="Khu vực trang cá nhân" data-tabs>
      ${TABS.map(
        (tab) => `
        <button
          type="button"
          role="tab"
          id="tab-${tab.id}"
          class="mf-tab ${tab.id === activeTab ? "is-active" : ""}"
          data-tab="${tab.id}"
          aria-selected="${tab.id === activeTab}"
          aria-controls="panel-${tab.id}"
        >
          ${icon(tab.icon, "text-[17px]")}
          <span>${tab.label}</span>
          ${
            tab.countKey && counts[tab.countKey]
              ? `<span class="mf-tab-count">${counts[tab.countKey]}</span>`
              : ""
          }
        </button>`,
      ).join("")}
    </div>
  `,
  );

  root.querySelector("[data-tabs]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (button) onChange(button.dataset.tab);
  });

  // Hỗ trợ điều hướng bằng phím mũi tên trên desktop.
  root.querySelector("[data-tabs]")?.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft"];
    if (!keys.includes(event.key)) return;
    const list = [...root.querySelectorAll("[data-tab]")];
    const index = list.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
    list[next].focus();
    onChange(list[next].dataset.tab);
  });
}
