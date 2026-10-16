/**
 * episode-navigation.js
 * Chức năng 4 — Tập trước / Tập tiếp theo cho phim bộ.
 *
 * URL: /watch?id=<movieId>&episode=<episodeId>
 *
 * File này CHỈ chứa logic thuần, không đụng DOM, nên kiểm tra được bằng Node
 * với dữ liệu thật lẫn dữ liệu tự tạo:
 *
 *  - xếp mọi tập của MỘT phim theo đúng thứ tự xuất hiện thực tế: tăng dần theo
 *    số mùa, trong mỗi mùa tăng dần theo số tập (đúng như danh sách tập hiển thị
 *    trên trang chi tiết);
 *  - bỏ tập/mùa không hoạt động và tập mồ côi, nên không bao giờ đề xuất tập
 *    bị ẩn hoặc tập của phim khác;
 *  - tìm tập đứng TRƯỚC và TIẾP THEO — khi hết tập của mùa hiện tại thì tự sang
 *    tập đầu của mùa kế tiếp (và ngược lại), theo thứ tự số mùa thực tế;
 *  - báo rõ lý do khi không tra được (thiếu dữ liệu / tập không hợp lệ) để trang
 *    xem vô hiệu hoá nút thay vì điều hướng nhầm.
 *
 * File KHÔNG tự chuyển tập: chỉ trả về đích; việc chuyển do người dùng bấm nút.
 */

import { sameId } from "./movie-data.js";
import {
  episodesOfSeason,
  isActive,
  loadSeriesData,
  seasonsOfMovie,
} from "./series-data.js";

/**
 * Danh sách {episode, season} của một phim theo đúng thứ tự thực tế.
 *
 * Thứ tự: số mùa tăng dần -> số tập tăng dần. Mùa/tập không hoạt động bị bỏ,
 * nhờ vậy tập mồ côi (season không thuộc phim) không thể lọt vào danh sách.
 *
 * @param {Array} seasons  mảng season đã chuẩn hoá (season-data)
 * @param {Array} episodes mảng episode đã chuẩn hoá
 * @param {string} movieId id phim cần xếp
 * @returns {Array<{episode: object, season: object}>}
 */
export function episodesInOrder(seasons, episodes, movieId) {
  const ordered = [];

  for (const season of seasonsOfMovie(seasons, movieId)) {
    if (!isActive(season.status)) continue;

    for (const episode of episodesOfSeason(episodes, season.id)) {
      if (!isActive(episode.status)) continue;
      ordered.push({ episode, season });
    }
  }

  return ordered;
}

/**
 * Vị trí của một tập trong danh sách đã sắp thứ tự + hai tập lân cận.
 *
 * Tập đầu có prev = null, tập cuối có next = null. Khi đi xuyên mùa, chính
 * danh sách đã sắp theo số mùa nên "cuối mùa hiện tại" và "đầu mùa kế tiếp"
 * nằm cạnh nhau — không cần code riêng cho từng mùa.
 *
 * @returns {{index: number, prev: object|null, next: object|null}}
 *          index === -1 nghĩa là không tìm thấy tập này.
 */
export function locateEpisode(ordered, episodeId) {
  const index = ordered.findIndex((item) => sameId(item.episode.id, episodeId));

  if (index === -1) return { index: -1, prev: null, next: null };

  return {
    index,
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

/**
 * Tập trước / tập tiếp theo của một tập đang xem.
 *
 * Chỉ trả `reason === "ok"` khi tập đó THUỘC đúng phim và đang hoạt động —
 * tập mồ côi, tập bị ẩn hoặc tập của phim khác đều trả "invalid" nên trang xem
 * sẽ ẩn/vô hiệu hoá nút thay vì dẫn tới tập sai.
 *
 * @param {object|null} movie   phim đang xem (đã chuẩn hoá)
 * @param {string} episodeId    id tập trên URL
 * @returns {Promise<{reason: string, prev: {episode,season}|null, next: {episode,season}|null}>}
 *          reason: "ok" | "invalid" | "not-episode" | "load-error"
 */
export async function resolveEpisodeNavigation(movie, episodeId) {
  if (!movie || !episodeId) {
    return { reason: "not-episode", prev: null, next: null };
  }

  let data;
  try {
    data = await loadSeriesData();
  } catch (error) {
    console.error("[episode-navigation] Không tải được mùa/tập:", error?.message);
    return { reason: "load-error", prev: null, next: null };
  }

  const ordered = episodesInOrder(data.seasons, data.episodes, movie.id);
  const { index, prev, next } = locateEpisode(ordered, episodeId);

  if (index === -1) return { reason: "invalid", prev: null, next: null };

  return { reason: "ok", prev, next };
}
