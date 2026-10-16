/**
 * episode-list.js
 * Chức năng 2 — Danh sách tập (Episode List) và Bộ chọn mùa (Season Selector)
 * trên trang chi tiết phim /movie-detail?id=...
 *
 * Chỉ chạy cho phim bộ (movies.type = "series"); phim lẻ giữ nguyên hiện tại.
 * Dùng lại model phim bộ ở series-data.js — không tự đọc db.json, không tự tạo
 * mùa/tập giả. Chưa phát video, chưa nút trước/sau, chưa tự chuyển tập.
 */

import { POSTER_FALLBACK, escapeHtml, formatDuration, watchUrl } from "./movie-data.js";
import {
  episodesOfSeason,
  isActive,
  isSeriesMovie,
  loadSeriesData,
  seasonsOfMovie,
} from "./series-data.js";

const bind = (name, root = document) => root.querySelector(`[data-bind="${name}"]`);

/** "2016-07-15" -> "15/07/2016" */
function formatDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Nhãn mùa: ưu tiên title, không có thì "Mùa N". */
function seasonLabel(season) {
  const title = String(season.title ?? "").trim();
  if (title) return title;
  return season.seasonNumber ? `Mùa ${season.seasonNumber}` : "Mùa đặc biệt";
}

/** Dòng meta của tập (thời lượng • ngày phát) — chỉ lấy dữ liệu đã có. */
function episodeMeta(episode) {
  const parts = [];
  const duration = formatDuration(episode.duration);
  if (duration) parts.push(duration);
  const date = formatDate(episode.releaseDate);
  if (date) parts.push(`Ngày ${date}`);
  return parts.join(" · ");
}

/** Số tập đang hoạt động của một mùa. */
function activeEpisodeCount(episodes, seasonId) {
  return episodesOfSeason(episodes, seasonId).filter((e) => isActive(e.status)).length;
}

/** URL xem một tập: /watch?id=<movieId>&episode=<episodeId>. */
function episodeWatchUrl(movieId, episodeId) {
  return `${watchUrl(movieId)}&episode=${encodeURIComponent(String(episodeId))}`;
}

/**
 * Thẻ một tập — bấm vào để mở trang xem đúng tập đó.
 * Cả thẻ là một liên kết (link phủ toàn thẻ) nên bấm ở đâu cũng mở được, và
 * vẫn giữ được hành vi mở tab mới / sao chép liên kết của trình duyệt.
 */
function episodeCard(episode, movieId) {
  const number = episode.episodeNumber ?? "";
  const title = episode.title || `Tập ${number}`;
  const media = episode.thumbnail
    ? `<img alt="Ảnh tập ${escapeHtml(String(number))}" class="w-full h-full object-cover" data-fallback="${escapeHtml(
        POSTER_FALLBACK,
      )}" decoding="async" loading="lazy" src="${escapeHtml(episode.thumbnail)}" />`
    : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container">
         <span class="material-symbols-outlined text-4xl text-on-surface-variant/60">play_arrow</span>
       </div>`;
  const meta = episodeMeta(episode);

  return `
    <article class="group relative flex gap-4 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
      <div class="relative w-32 sm:w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-surface-container">
        ${media}
        <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/90 text-on-surface font-label-caps text-label-caps uppercase backdrop-blur-md">T${escapeHtml(
          String(number),
        )}</span>
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <h3 class="font-title-sm text-title-sm text-on-surface truncate">${escapeHtml(title)}</h3>
        ${
          meta
            ? `<p class="font-label-md text-label-md text-on-surface-variant mt-0.5">${escapeHtml(meta)}</p>`
            : ""
        }
        ${
          episode.description
            ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">${escapeHtml(
                episode.description,
              )}</p>`
            : ""
        }
      </div>
      <a
        href="${escapeHtml(episodeWatchUrl(movieId, episode.id))}"
        data-episode-link="${escapeHtml(String(episode.id))}"
        aria-label="Xem ${escapeHtml(title)}"
        class="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
      >
        <span class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
          <span class="material-symbols-outlined rounded-full bg-surface-container-lowest/85 p-2 text-3xl text-on-surface shadow-lg">play_arrow</span>
        </span>
      </a>
    </article>`;
}

/** Một nút mùa trên thanh chọn. */
function seasonTab(season, count, active) {
  return `
    <button type="button" role="tab" aria-selected="${active}" data-season-tab="${escapeHtml(
      String(season.id),
    )}" class="shrink-0 px-4 py-2 rounded-lg font-title-sm text-title-sm whitespace-nowrap transition-colors ${
      active
        ? "bg-primary-container text-on-primary-container"
        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
    }">
      ${escapeHtml(seasonLabel(season))}
      <span class="ml-1 font-label-md text-label-md ${
        active ? "text-on-primary-container/70" : "text-on-surface-variant/70"
      }">${count} tập</span>
    </button>`;
}

/** Mùa đang chọn, giữ lại giữa các lần bấm chọn trên cùng một trang. */
let activeSeasonId = null;

/**
 * Render khu vực mùa + danh sách tập cho một phim.
 * Với phim lẻ hoặc lỗi dữ liệu: ẩn khối, không làm trang crash.
 */
export async function initEpisodeList(movie) {
  const block = bind("series-block");
  if (!block) return;

  if (!movie || !isSeriesMovie(movie)) {
    block.hidden = true;
    return;
  }

  let data;
  try {
    data = await loadSeriesData();
  } catch (error) {
    console.warn("[episode-list] Không tải được mùa/tập:", error?.message);
    block.hidden = true;
    return;
  }

  const seasons = seasonsOfMovie(data.seasons, movie.id).filter((s) => isActive(s.status));
  block.hidden = false;

  const sub = bind("series-sub");
  if (sub) {
    sub.textContent = seasons.length
      ? `${seasons.length} mùa · Chọn mùa để xem danh sách tập`
      : "Phim bộ";
  }

  const selector = bind("season-selector");
  const info = bind("season-info");
  const list = bind("episodes");
  const empty = bind("episodes-empty");

  const showEmpty = (title, note) => {
    const t = bind("episodes-empty-title");
    const n = bind("episodes-empty-note");
    if (t) t.textContent = title;
    if (n) n.textContent = note;
    if (empty) empty.hidden = false;
  };
  const hideEmpty = () => {
    if (empty) empty.hidden = true;
  };

  if (!seasons.length) {
    if (selector) selector.innerHTML = "";
    if (info) info.hidden = true;
    if (list) list.innerHTML = "";
    showEmpty("Chưa có thông tin mùa phim", "Bộ phim này chưa có mùa nào trong dữ liệu.");
    return;
  }

  activeSeasonId = seasons.some((s) => String(s.id) === String(activeSeasonId))
    ? activeSeasonId
    : seasons[0].id;

  const renderSelector = () => {
    if (!selector) return;
    selector.innerHTML = seasons
      .map((s) =>
        seasonTab(s, activeEpisodeCount(data.episodes, s.id), String(s.id) === String(activeSeasonId)),
      )
      .join("");
  };

  const renderSeason = () => {
    const season = seasons.find((s) => String(s.id) === String(activeSeasonId));
    if (!season) return;

    if (info) {
      const bits = [];
      if (season.seasonNumber) bits.push(`Mùa ${season.seasonNumber}`);
      if (season.releaseYear) bits.push(String(season.releaseYear));
      const meta = bits.join(" · ");
      info.innerHTML = `
        <div class="flex-1 min-w-0">
          ${
            meta
              ? `<p class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">${escapeHtml(meta)}</p>`
              : ""
          }
          <p class="font-title-md text-title-md text-on-surface mt-0.5 truncate">${escapeHtml(
            seasonLabel(season),
          )}</p>
          ${
            season.description
              ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">${escapeHtml(
                  season.description,
                )}</p>`
              : ""
          }
        </div>`;
      info.hidden = false;
    }

    const episodes = episodesOfSeason(data.episodes, season.id).filter((e) => isActive(e.status));

    if (!episodes.length) {
      if (list) list.innerHTML = "";
      showEmpty("Mùa này chưa có tập", "Không có tập nào thuộc mùa này trong dữ liệu.");
      return;
    }

    hideEmpty();
    if (list) list.innerHTML = episodes.map((episode) => episodeCard(episode, movie.id)).join("");
  };

  if (selector) {
    selector.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-season-tab]");
      if (!btn) return;
      const id = btn.getAttribute("data-season-tab");
      if (String(id) === String(activeSeasonId)) return;
      activeSeasonId = id;
      renderSelector();
      renderSeason();
    });
  }

  renderSelector();
  renderSeason();
}
