/**
 * ContinueWatching.js — Khu vực "Tiếp tục xem": poster, tập, tiến trình,
 * thời gian còn lại và nút tiếp tục xem.
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { emptyState } from "../ui.js";

function itemMarkup(item) {
  return `
  <article
    class="mf-card mf-card-hover"
    style="display:flex;gap:13px;padding:11px;min-width:0"
  >
    <a
      href="${item.detailHref}"
      class="mf-poster"
      style="width:86px;flex:none"
      aria-label="Chi tiết ${escapeHtml(item.title)}"
    >
      <img src="${item.poster}" alt="Poster ${escapeHtml(item.title)}" loading="lazy" data-fallback="/images/movies/dune-2.jpg" />
      <div class="mf-poster-shade" style="opacity:1"></div>
      <span class="mf-chip mf-chip-glass mf-chip-brand" style="position:absolute;top:6px;left:6px">${escapeHtml(item.quality)}</span>
    </a>

    <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:2px 2px 2px 0">
      <div style="min-width:0">
        <div style="display:flex;align-items:center;gap:7px;min-width:0">
          <h3 class="mf-truncate" style="margin:0;font-size:14.5px;font-weight:600" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        </div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px;font-size:12px;color:#9ca0aa">
          <span class="mf-chip" style="height:20px;font-size:10.5px">${icon("clapper", "text-[12px]")} ${escapeHtml(item.episodeLabel)}</span>
          <span>${escapeHtml(item.watchedLabel)}</span>
          <span style="opacity:.5">•</span>
          <span>${escapeHtml(item.remainingLabel)}</span>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:10px">
        <div class="mf-progress" role="progressbar" aria-valuenow="${item.progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến trình ${escapeHtml(item.title)}">
          <span class="mf-progress-bar" style="width:${item.progressPercent}%"></span>
        </div>
        <span class="mf-muted" style="font-size:11.5px;font-weight:700;flex:none">${item.progressPercent}%</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <a class="mf-btn mf-btn-primary mf-btn-sm" href="${item.href}">
          ${icon("play", "text-[15px]", { fill: true })} Tiếp tục xem
        </a>
        <span class="mf-muted" style="font-size:11.5px">${escapeHtml(item.updatedLabel)}</span>
      </div>
    </div>
  </article>`;
}

/** @param {string|HTMLElement} root */
export function renderContinueWatching(root, items = []) {
  if (!items.length) {
    render(
      root,
      emptyState({
        icon: "play",
        title: "Bạn chưa có phim nào đang xem dở.",
        description: "Mở một bộ phim bất kỳ, MovieF sẽ tự lưu tiến trình để bạn xem tiếp ngay tại đây.",
        actionLabel: "Khám phá phim",
        actionHref: "/movies",
      }),
    );
    return;
  }

  render(
    root,
    `
    <div style="display:grid;gap:14px" data-continue-grid>
      ${items.map(itemMarkup).join("")}
    </div>
  `,
  );

  // 1 cột trên mobile, 2 cột từ 720px, 3 cột từ 1500px.
  const grid = root.querySelector("[data-continue-grid]");
  const wide = window.matchMedia("(min-width: 720px)");
  const xLarge = window.matchMedia("(min-width: 1500px)");
  const apply = () => {
    const columns = xLarge.matches ? 3 : wide.matches ? 2 : 1;
    grid.style.gridTemplateColumns = `repeat(${columns},minmax(0,1fr))`;
  };
  apply();
  wide.addEventListener("change", apply);
  xLarge.addEventListener("change", apply);
}
