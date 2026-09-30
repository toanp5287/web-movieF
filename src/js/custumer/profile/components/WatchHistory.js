/**
 * WatchHistory.js — Danh sách lịch sử xem: poster | tên | tập | thời gian xem
 * | tiến trình | nút xem tiếp. Có xoá từng phim và xoá toàn bộ.
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { emptyState } from "../ui.js";

function rowMarkup(item) {
  return `
  <article class="mf-row-hover" style="display:flex;gap:14px;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:14px;align-items:center">
    <a href="${item.detailHref}" class="mf-poster" style="width:66px;flex:none" aria-label="Chi tiết ${escapeHtml(item.title)}">
      <img src="${item.poster}" alt="Poster ${escapeHtml(item.title)}" loading="lazy" data-fallback="/images/movies/dune-2.jpg" />
    </a>

    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">
      <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
        <h3 class="mf-truncate" style="margin:0;font-size:14.5px;font-weight:600;flex:1 1 auto" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <span class="mf-muted" style="font-size:11.5px;flex:none;white-space:nowrap">${escapeHtml(item.watchedAtLabel)}</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#9ca0aa">
        <span class="mf-chip" style="height:20px;font-size:10.5px">${escapeHtml(item.episodeLabel)}</span>
        <span>${escapeHtml(String(item.year))}</span>
        <span style="opacity:.5">•</span>
        <span>${escapeHtml(item.quality)}</span>
        <span style="opacity:.5">•</span>
        <span>${escapeHtml(item.remainingLabel)}</span>
      </div>

      <div style="display:flex;align-items:center;gap:10px">
        <div class="mf-progress" style="height:5px" role="progressbar" aria-valuenow="${item.progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến trình ${escapeHtml(item.title)}">
          <span class="mf-progress-bar" style="width:${item.progressPercent}%"></span>
        </div>
        <span class="mf-muted" style="font-size:11px;flex:none;font-weight:700">${item.progressPercent}%</span>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:8px;flex:none">
      <a class="mf-btn mf-btn-soft mf-btn-sm" href="${item.href}">
        ${icon("play", "text-[15px]", { fill: true })}<span class="mf-hide-sm">Xem tiếp</span>
      </a>
      <button
        type="button"
        class="mf-icon-btn"
        data-action="remove-history"
        data-id="${escapeHtml(item.id)}"
        data-title="${escapeHtml(item.title)}"
        aria-label="Xoá ${escapeHtml(item.title)} khỏi lịch sử"
        title="Xoá khỏi lịch sử"
      >${icon("trash", "text-[19px]")}</button>
    </div>
  </article>`;
}

/**
 * @param {string|HTMLElement} root
 * @param {{items:Array, limit:number, total:number, canClear:boolean}} options
 */
export function renderWatchHistory(root, { items = [], limit = 8, total = 0, canClear = true } = {}) {
  const visible = items.slice(0, limit);

  if (!items.length) {
    render(
      root,
      emptyState({
        icon: "history",
        title: "Lịch sử xem đang trống.",
        description: "Những phim bạn xem sẽ được lưu lại tại đây để bạn tiếp tục bất cứ lúc nào.",
        actionLabel: "Khám phá phim",
        actionHref: "/movies",
      }),
    );
    return;
  }

  render(
    root,
    `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <p class="mf-muted" style="margin:0;font-size:12.5px">
        Đang hiện <strong style="color:#fff">${visible.length}</strong> / ${total} phim
      </p>
      <div style="display:flex;align-items:center;gap:8px">
        ${
          canClear
            ? `<button type="button" class="mf-btn mf-btn-danger mf-btn-sm" data-action="clear-history">
                ${icon("trash2", "text-[15px]")} Xoá lịch sử
              </button>`
            : ""
        }
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px" data-history-list>
      ${visible.map(rowMarkup).join("")}
    </div>

    ${
      total > limit
        ? `<button type="button" class="mf-btn mf-btn-outline mf-btn-sm" data-action="load-more" style="margin-top:16px;width:100%">
            ${icon("list", "text-[16px]")} Xem thêm ${Math.min(20, total - limit)} phim
          </button>`
        : ""
    }
  `,
  );
}
