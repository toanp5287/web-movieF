/**
 * ProfileStats.js — 4 thẻ thống kê tài khoản.
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { TABS } from "../store.js";

/** Ánh xạ key thống kê → tab tương ứng để bấm vào thẻ là chuyển tab. */
const TAB_FOR_KEY = {
  watched: "history",
  favorites: "favorites",
  watchLater: "watchLater",
};

export function renderStats(root, stats, { onSelectTab } = {}) {
  const cards = stats || [];

  render(
    root,
    `
    <section
      class="mf-enter"
      style="display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))"
      data-stats-grid
      aria-label="Thống kê tài khoản"
    >
      ${cards
        .map(
          (card) => `
        <button
          type="button"
          class="mf-card mf-card-hover"
          data-stat="${escapeHtml(card.key)}"
          style="padding:16px 16px 18px;display:flex;flex-direction:column;gap:14px;text-align:left;cursor:${TAB_FOR_KEY[card.key] ? "pointer" : "default"}"
        >
          <span style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
            <span class="mf-muted" style="font-size:12.5px;font-weight:600;letter-spacing:.01em;line-height:1.4">${escapeHtml(card.label)}</span>
            <span class="mf-stat-ico">${icon(card.icon, "text-[20px]", { fill: card.fill })}</span>
          </span>
          <span>
            <span class="mf-stat-value" style="display:block">${escapeHtml(card.value)}</span>
            <span class="mf-muted" style="display:block;margin-top:2px;font-size:12px">${escapeHtml(card.hint || "")}</span>
          </span>
        </button>`,
        )
        .join("")}
    </section>
  `,
  );

  // 4 cột từ 1100px, 2 cột trên mobile.
  const grid = root.querySelector("[data-stats-grid]");
  const wide = window.matchMedia("(min-width: 1100px)");
  const apply = () => {
    if (grid) grid.style.gridTemplateColumns = wide.matches ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))";
  };
  apply();
  wide.addEventListener("change", apply);

  if (!onSelectTab) return;
  cards.forEach((card) => {
    const tab = TAB_FOR_KEY[card.key];
    if (!tab) return;
    root
      .querySelector(`[data-stat="${card.key}"]`)
      ?.addEventListener("click", () => onSelectTab(tab));
  });
}

/** Danh sách tab được dùng chung để giữ tên & icon đồng nhất. */
export const TAB_BY_ID = Object.fromEntries(TABS.map((tab) => [tab.id, tab]));
