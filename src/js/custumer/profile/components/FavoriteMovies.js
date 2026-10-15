/**
 * FavoriteMovies.js — Lưới phim yêu thích (dùng chung cho "Xem sau").
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { emptyState } from "../ui.js";
import { movieCard } from "./MovieCard.js";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "series", label: "Phim bộ" },
  { id: "movie", label: "Phim lẻ" },
  { id: "4K", label: "4K" },
];

function gridMarkup(movies, collection) {
  return `
    <div
      style="display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr))"
      data-movie-grid
    >
      ${movies.map((movie, index) => movieCard(movie, { index, collection })).join("")}
    </div>`;
}

function bindGridScope(root) {
  const grid = root.querySelector("[data-movie-grid]");
  if (!grid) return;

  const wide = window.matchMedia("(min-width: 640px)");
  const xLarge = window.matchMedia("(min-width: 1180px)");
  const apply = () => {
    const columns = xLarge.matches ? 5 : wide.matches ? 4 : 2;
    grid.style.gridTemplateColumns = `repeat(${columns},minmax(0,1fr))`;
  };
  apply();
  wide.addEventListener("change", apply);
  xLarge.addEventListener("change", apply);
}

/**
 * @param {string|HTMLElement} root
 * @param {{movies:Array, collection?:'favorites'|'watchLater', filter?:string}} options
 * @param {{onFilter?:Function, onRemoveAll?:Function, busy?:boolean}} handlers
 */
export function renderFavoriteMovies(
  root,
  { movies = [], collection = "favorites", filter = "all" } = {},
  handlers = {},
) {
  if (!movies.length) {
    render(
      root,
      emptyState({
        icon: collection === "favorites" ? "heart" : "bookmark",
        title:
          collection === "favorites"
            ? "Bạn chưa lưu phim yêu thích nào."
            : "Danh sách xem sau đang trống.",
        description:
          collection === "favorites"
            ? "Bấm biểu tượng trái tim trên poster phim để lưu lại những tác phẩm bạn muốn xem lại."
            : "Thêm phim vào danh sách xem sau để xem chúng bất cứ lúc nào.",
        actionLabel: "Khám phá phim",
        actionHref: "/movies",
      }),
    );
    return;
  }

  const visible =
    filter === "all"
      ? movies
      : filter === "4K"
        ? movies.filter((movie) => movie.quality === "4K")
        : movies.filter((movie) => movie.type === filter);

  render(
    root,
    `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">
      <div class="mf-tabs" role="group" aria-label="Lọc danh sách" style="padding:3px">
        ${FILTERS.map(
          (item) => `
          <button
            type="button"
            class="mf-tab"
            style="height:34px;padding-inline:12px;font-size:13px;${item.id === filter ? "background:rgba(255,255,255,.08);color:#fff" : ""}"
            data-filter="${item.id}"
            aria-pressed="${item.id === filter}"
          >${escapeHtml(item.label)}</button>`,
        ).join("")}
      </div>

      <div style="display:flex;align-items:center;gap:12px">
        <span class="mf-muted" style="font-size:12.5px">
          ${escapeHtml(String(visible.length))}/${escapeHtml(String(movies.length))} phim
        </span>
        ${
          handlers.onRemoveAll
            ? `<button type="button" class="mf-btn mf-btn-danger mf-btn-sm" data-action="clear-collection">
                ${icon("trash2", "text-[15px]")} Xoá danh sách
              </button>`
            : ""
        }
      </div>
    </div>

    ${
      visible.length
        ? gridMarkup(visible, collection)
        : `<p class="mf-muted" style="padding:26px 0;text-align:center;font-size:13.5px">Không có phim nào khớp bộ lọc này.</p>`
    }
  `,
  );

  bindGridScope(root);

  root.querySelector("[data-filter]")?.closest("div")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) handlers.onFilter?.(button.dataset.filter);
  });

  root.querySelector('[data-action="clear-collection"]')?.addEventListener("click", () => {
    handlers.onRemoveAll?.();
  });
}

export { bindGridScope };
