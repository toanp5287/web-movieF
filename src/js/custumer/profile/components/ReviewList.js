/**
 * ReviewList.js — Danh sách phim đã đánh giá (số sao + nhận xét).
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { emptyState } from "../ui.js";

const stars = (rating) =>
  Array.from({ length: 5 })
    .map((_, index) =>
      icon("star", "text-[15px]", {
        fill: index < Math.round(rating),
        color: index < Math.round(rating) ? "#f5c451" : "#3a3e47",
      }),
    )
    .join("");

const cardMarkup = (item) => `
  <article
    class="mf-card mf-card-hover"
    style="display:flex;gap:14px;padding:14px;min-width:0"
  >
    <a href="${item.detailHref}" class="mf-poster" style="width:66px;flex:none" aria-label="Chi tiết ${escapeHtml(item.title)}">
      <img src="${item.poster}" alt="Poster ${escapeHtml(item.title)}" loading="lazy" data-fallback="/images/movies/dune-2.jpg" />
    </a>

    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="min-width:0">
          <h3 class="mf-truncate" style="margin:0;font-size:14.5px;font-weight:600" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px" aria-label="Bạn đánh giá ${item.rating} trên 5 sao">
            ${stars(item.rating)}
            <span class="mf-muted" style="font-size:11.5px">${item.rating}/5</span>
          </div>
        </div>
        <span class="mf-muted" style="font-size:11.5px;flex:none">${escapeHtml(item.createdLabel)}</span>
      </div>

      ${
        item.comment
          ? `<p class="mf-muted" style="margin:0;font-size:13px;line-height:1.65;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(item.comment)}</p>`
          : `<p class="mf-muted" style="margin:0;font-size:13px;font-style:italic">Bạn chưa viết nhận xét cho phim này.</p>`
      }

      <div style="display:flex;align-items:center;gap:8px">
        <a class="mf-btn mf-btn-soft mf-btn-sm" href="${item.href}">${icon("play", "text-[15px]", { fill: true })}<span class="mf-hide-sm">Xem lại</span></a>
        <button
          type="button"
          class="mf-icon-btn"
          data-action="remove-review"
          data-id="${escapeHtml(item.id)}"
          data-title="${escapeHtml(item.title)}"
          aria-label="Xoá đánh giá của ${escapeHtml(item.title)}"
          title="Xoá đánh giá"
        >${icon("trash", "text-[19px]")}</button>
      </div>
    </div>
  </article>`;

export function renderReviewList(root, items = []) {
  if (!items.length) {
    render(
      root,
      emptyState({
        icon: "star",
        title: "Bạn chưa đánh giá phim nào.",
        description: "Xem phim và gửi đánh giá của bạn để giúp cộng đồng chọn phim hay hơn.",
        actionLabel: "Khám phá phim",
        actionHref: "/movies",
      }),
    );
    return;
  }

  render(
    root,
    `<div style="display:grid;gap:12px" data-review-list>${items.map(cardMarkup).join("")}</div>`,
  );

  const grid = root.querySelector("[data-review-list]");
  const wide = window.matchMedia("(min-width: 900px)");
  const apply = () => {
    grid.style.gridTemplateColumns = wide.matches ? "repeat(2,minmax(0,1fr))" : "1fr";
  };
  apply();
  wide.addEventListener("change", apply);
}
