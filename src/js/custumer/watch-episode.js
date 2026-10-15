/**
 * watch-episode.js
 * Chức năng 3 — Mở và phát ĐÚNG một tập phim bộ trên trang xem phim.
 *
 * URL: /watch?id=<movieId>&episode=<episodeId>
 *
 * File này CHỈ chứa logic thuần: đọc tham số trên URL, tra tập trong model
 * phim bộ ở series-data.js, dựng nhãn và thông báo. Không đụng tới DOM, không
 * tự tạo dữ liệu tập. Nhờ vậy có thể kiểm tra bằng Node với dữ liệu thật.
 *
 * Trang xem phim (watch.js) chỉ việc gọi rồi phát video của tập trả về.
 */

import { sameId } from "./movie-data.js";
import {
  findEpisodeById,
  findSeasonById,
  isActive,
  loadSeriesData,
} from "./series-data.js";

/**
 * Đọc tham số trên URL của trang xem phim.
 *
 * @param {string} search chuỗi query (window.location.search)
 * @returns {{id: string, episodeId: string}} đã trim; thiếu thì trả ""
 */
export function parseWatchQuery(search) {
  const params = new URLSearchParams(String(search ?? ""));
  return {
    id: String(params.get("id") ?? "").trim(),
    episodeId: String(params.get("episode") ?? "").trim(),
  };
}

/** Nhãn tập để gắn vào tiêu đề/trạng thái: "Mùa 2 · Tập 1". */
export function episodeLabel(episode, season) {
  const bits = [];
  if (season?.seasonNumber) bits.push(`Mùa ${season.seasonNumber}`);
  bits.push(episode?.episodeNumber ? `Tập ${episode.episodeNumber}` : "Tập");
  return bits.join(" · ");
}

/**
 * Tìm tập theo id và xác nhận tập đó THẬT SỰ thuộc phim đang xem.
 *
 * Chỉ khi `reason === "ok"` mới được phép phát. Mọi trường hợp khác đều bị chặn
 * để không bao giờ phát nhầm video:
 *   - "not-found"  : không có tập với id đó;
 *   - "wrong-movie": tập thuộc phim/mùa khác, hoặc mùa không tồn tại (tập mồ côi);
 *   - "hidden"     : tập hoặc mùa đang bị ẩn (status không hoạt động);
 *   - "load-error" : không đọc được bảng season/episodes.
 *
 * @returns {Promise<{reason: string, episode: object|null, season: object|null}>}
 */
export async function resolveWatchEpisode(movie, episodeId) {
  let data;
  try {
    data = await loadSeriesData();
  } catch (error) {
    console.error("[watch-episode] Không tải được mùa/tập:", error?.message);
    return { reason: "load-error", episode: null, season: null };
  }

  const episode = findEpisodeById(data.episodes, episodeId);
  if (!episode) return { reason: "not-found", episode: null, season: null };

  const season = findSeasonById(data.seasons, episode.seasonId);
  if (!season || !sameId(season.movieId, movie?.id)) {
    return { reason: "wrong-movie", episode, season: null };
  }

  if (!isActive(season.status) || !isActive(episode.status)) {
    return { reason: "hidden", episode, season };
  }

  return { reason: "ok", episode, season };
}

/**
 * Nội dung overlay cho tập không phát được — luôn có icon + tiêu đề + lý do,
 * để trang xem hiển thị an toàn thay vì crash hoặc màn hình đen.
 *
 * @param {{reason: string, episode?: object|null, season?: object|null}} result
 * @param {string} episodeId id tập trên URL (để báo khi không tìm thấy)
 * @returns {{icon: string, title: string, message: string}}
 */
export function describeBlockedEpisode(result, episodeId) {
  const reason = result?.reason;
  const label = result?.episode ? episodeLabel(result.episode, result.season) : "";

  switch (reason) {
    case "load-error":
      return {
        icon: "cloud_off",
        title: "Không tải được danh sách tập",
        message: "Không đọc được dữ liệu mùa/tập của phim bộ. Vui lòng tải lại trang.",
      };
    case "wrong-movie":
      return {
        icon: "link_off",
        title: "Tập phim không thuộc phim này",
        message: `Mã tập “${episodeId}” không thuộc bộ phim đang xem. Hãy mở đúng phim bộ rồi chọn lại tập.`,
      };
    case "hidden":
      return {
        icon: "visibility_off",
        title: "Tập phim hiện không khả dụng",
        message: `${
          label || "Tập này"
        } đang bị tạm ẩn. Vui lòng chọn tập khác trong danh sách.`,
      };
    case "not-found":
    default:
      return {
        icon: "search_off",
        title: "Không tìm thấy tập phim",
        message: `Không có tập nào với mã “${episodeId}”. Tập có thể đã bị gỡ khỏi dữ liệu.`,
      };
  }
}
