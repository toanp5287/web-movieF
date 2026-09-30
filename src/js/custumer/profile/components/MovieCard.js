/**
 * MovieCard.js — Thẻ phim dùng chung cho lưới "Yêu thích" và "Xem sau".
 * Hover: phóng to nhẹ, overlay tối, nút Play + thông tin phim.
 */

import { escapeHtml } from "../utils.js";
import { icon, iconFilled } from "../icons.js";

/**
 * @param {object} movie  view-model
 * @param {{index?:number, collection?:'favorites'|'watchLater'}} options
 */
export function movieCard(movie, { index = 0, collection = "favorites" } = {}) {
  const meta = [movie.year, movie.durationLabel].filter(Boolean).join(" · ");

  return `
  <article
    class="mf-poster-group mf-enter"
    style="display:flex;flex-direction:column;gap:11px;animation-delay:${Math.min(index * 40, 320)}ms"
  >
    <div class="mf-poster">
      <img src="${movie.poster}" alt="Poster ${escapeHtml(movie.title)}" loading="lazy" data-fallback="/images/movies/dune-2.jpg" />

      <div class="mf-poster-shade"></div>

      <div style="position:absolute;top:9px;left:9px;right:9px;display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
        <div style="display:flex;gap:5px;flex-wrap:wrap;min-width:0">
          <span class="mf-chip mf-chip-glass mf-chip-brand">${escapeHtml(movie.quality)}</span>
          ${
            movie.type === "series"
              ? `<span class="mf-chip mf-chip-glass">${escapeHtml(movie.totalEpisodes)} tập</span>`
              : ""
          }
        </div>
        <button
          type="button"
          class="mf-fav-btn ${collection === "favorites" ? "is-on" : ""}"
          data-action="toggle-favorite"
          data-movie-id="${escapeHtml(movie.movieId)}"
          data-collection="${collection}"
          aria-pressed="${collection === "favorites" ? "true" : "false"}"
          aria-label="${collection === "favorites" ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"} — ${escapeHtml(movie.title)}"
          title="${collection === "favorites" ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}"
        >${iconFilled("heart", "text-[18px]")}</button>
      </div>

      <div class="mf-poster-hover">
        <a class="mf-play-btn" href="${movie.href}" aria-label="Xem ${escapeHtml(movie.title)}">${icon("play", "text-[24px]", { fill: true })}</a>
        <a
          class="mf-btn mf-btn-sm"
          href="${movie.detailHref}"
          style="background:rgba(255,255,255,.14);backdrop-filter:blur(8px);color:#fff;border:1px solid rgba(255,255,255,.18);height:34px"
        >${icon("info", "text-[15px]")} Chi tiết</a>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
      <h3 class="mf-truncate" style="margin:0;font-size:14.5px;font-weight:600;letter-spacing:-.01em" title="${escapeHtml(movie.title)}">
        ${escapeHtml(movie.title)}
      </h3>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#9ca0aa">
        <span>${escapeHtml(String(movie.year))}</span>
        <span style="opacity:.5">•</span>
        <span style="display:inline-flex;align-items:center;gap:3px;color:#f5c451;font-weight:700">
          ${iconFilled("star", "text-[14px]")} ${escapeHtml(movie.score)}
        </span>
        ${
          collection === "watchLater"
            ? `<button
                type="button"
                class="mf-link"
                style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:0"
                data-action="toggle-watch-later"
                data-movie-id="${escapeHtml(movie.movieId)}"
                title="Bỏ khỏi xem sau"
              >${icon("bookmark", "text-[15px]")} Xem sau</button>`
            : ""
        }
      </div>
    </div>
  </article>`;
}
