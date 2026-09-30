/**
 * movie-card.js
 * Thẻ phim dùng chung cho /movies và các mục trên trang chủ.
 * Giữ đúng phong cách tối + đỏ của giao diện, nhưng dữ liệu (tên, poster,
 * năm, thể loại, thời lượng, điểm) đều lấy từ data/db.json.
 */

import {
  POSTER_FALLBACK,
  averageRating,
  detailUrl,
  escapeHtml,
  formatDuration,
  genreNames,
  qualityLabel,
} from "./movie-data.js";

/**
 * Nhãn chất lượng.
 *
 * db.json chỉ có quality cho một phần phim, nên phim còn lại không hiện badge
 * thay vì đoán 4K/HD từ năm phát hành.
 *
 * LƯU Ý: hàm này trả về HTML hoàn chỉnh và KHÔNG được đưa qua escapeHtml()
 * ở chỗ dùng, nếu không trình duyệt sẽ hiện nguyên chuỗi "<div ...>" như chữ.
 * Chỉ riêng nhãn bên trong mới cần escape.
 */
function qualityBadge(movie) {
  const label = qualityLabel(movie);
  if (!label) return "";
  return `
                <div class="absolute top-2.5 left-2.5 z-10 flex items-center px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-md text-on-surface-variant border border-white/10">
                  <span class="font-label-caps text-label-caps font-bold">${escapeHtml(label)}</span>
                </div>`;
}

/** Điểm hiển thị: lấy từ bảng reviews, chưa có thì ẩn hẳn badge điểm. */
function ratingBadge(movie, reviews) {
  const avg = averageRating(movie, reviews);
  if (avg === null) return "";
  // reviews dùng thang 1-5, hiển thị ra thang 10 cho khớp giao diện.
  const score = (avg * 2).toFixed(1);
  return `
                <div class="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-surface-container-lowest/80 backdrop-blur-md px-2 py-0.5 rounded text-secondary border border-secondary/20">
                  <span class="material-symbols-outlined text-xs" style="font-variation-settings: &quot;FILL&quot; 1">star</span>
                  <span class="font-label-caps text-label-caps font-bold">${escapeHtml(score)}</span>
                </div>`;
}

/**
 * Dựng HTML một thẻ phim.
 * @param {object} movie    phim đã chuẩn hoá
 * @param {object} catalog  { genres, reviews }
 * @param {object} [options] { showGenre?: boolean, showDuration?: boolean }
 */
export function renderMovieCard(movie, catalog, options = {}) {
  const { showGenre = true, showDuration = true } = options;
  const genres = genreNames(movie, catalog.genres);
  const duration = formatDuration(movie.duration);
  const title = escapeHtml(movie.title);
  const href = detailUrl(movie.id);

  // Dò meta: năm • thể loại • thời lượng (bỏ dần phần không có dữ liệu)
  const meta = [movie.year ? escapeHtml(movie.year) : ""];
  if (showGenre && genres.length) {
    meta.push(
      `<span class="w-1 h-1 rounded-full bg-white/20"></span><span class="truncate min-w-0 px-1">${escapeHtml(
        genres.join(", "),
      )}</span>`,
    );
  }
  if (showDuration && duration) {
    meta.push(
      `<span class="w-1 h-1 rounded-full bg-white/20"></span><span>${escapeHtml(duration)}</span>`,
    );
  }

  return `
            <!-- ${title} -->
            <a
              class="group relative flex flex-col bg-surface-container-low rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              data-movie-id="${escapeHtml(movie.id)}"
              href="${href}"
              title="${title}"
            >
              <div class="relative aspect-[2/3] w-full overflow-hidden bg-surface-container">
                <img
                  alt="Poster phim ${title}"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  data-fallback="${POSTER_FALLBACK}"
                  decoding="async"
                  loading="lazy"
                  src="${escapeHtml(movie.poster || POSTER_FALLBACK)}"
                />${qualityBadge(movie)}${ratingBadge(movie, catalog.reviews)}
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-lg shadow-primary-container/40 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <span class="material-symbols-outlined text-2xl" style="font-variation-settings: &quot;FILL&quot; 1">play_arrow</span>
                  </div>
                </div>
              </div>
              <div class="p-3.5 flex flex-col flex-grow justify-between">
                <div>
                  <h3 class="font-title-sm text-title-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">${title}</h3>
                  ${
                    movie.country
                      ? `<p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">${escapeHtml(
                          movie.country,
                        )}</p>`
                      : ""
                  }
                </div>
                <div class="flex flex-nowrap items-center justify-between gap-1 text-on-surface-variant font-label-md text-label-md mt-3 pt-2.5 border-t border-white/5">
                  ${meta.filter(Boolean).join("\n                  ")}
                </div>
              </div>
            </a>`;
}

/** Render cả danh sách phim vào một container. */
export function renderMovieCards(container, movies, catalog, options) {
  if (!container) return;
  container.innerHTML = movies.map((m) => renderMovieCard(m, catalog, options)).join("\n");
}
