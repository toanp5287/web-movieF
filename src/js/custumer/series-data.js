/**
 * series-data.js
 * Model phim bộ (Series) / Mùa phim (Season) / Tập phim (Episode).
 *
 * Mục đích: gom cách đọc và quan hệ dữ liệu phim bộ vào một chỗ để các chức
 * năng sau (danh sách tập, chọn mùa, chuyển tập...) dùng lại. File này KHÔNG
 * vẽ giao diện và KHÔNG tự tạo dữ liệu phim.
 *
 * Cách lưu dữ liệu của dự án (data/db.json qua json-server):
 *  - movies:  mỗi phim bộ có `type: "series"`.
 *  - season:  `{ id, movieId, seasonNumber, title, description, poster,
 *               releaseYear, status }` — movieId trỏ tới movies.id.
 *  - episodes:`{ id, seasonId, episodeNumber, title, description, video,
 *               thumbnail, duration, releaseDate, status }`
 *             — seasonId trỏ tới season.id.
 *
 * Quan hệ: Phim bộ 1—n Mùa phim 1—n Tập phim.
 *
 * Nguồn dữ liệu (giống movie-data.js): json-server http://localhost:3000,
 * lỗi thì đọc file tĩnh /data/db.json.
 */

import api from "../api.js";
import {
  DB_FALLBACK_URL,
  fetchJsonWithRetry,
  mediaUrl,
  safeImagePath,
  sameId,
} from "./movie-data.js";

/** Giá trị `type` đánh dấu một phim là phim bộ. */
export const SERIES_TYPE = "series";

/** Endpoint của json-server (giữ đúng tên hiện có trong data/db.json). */
export const SEASON_ENDPOINT = "/season";
export const EPISODE_ENDPOINT = "/episodes";

/* ------------------------------------------------------------------ *
 * 1. TIỆN ÍCH CHUẨN HOÁ
 * ------------------------------------------------------------------ */

/** db.json có thể lưu số dạng "12" hoặc 12; trả null nếu không phải số. */
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toText = (value) => String(value ?? "").trim();

/**
 * Chuẩn hoá nguồn video của một tập phim.
 * - Link ngoài (http/https hoặc protocol-relative "//") giữ nguyên, KHÔNG thêm
 *   "/" ở đầu — giống cách `layDuongDanVideo` trong src/js/admin/phimBo.js xử lý.
 * - Còn lại dùng mediaUrl để chắc chắn đường dẫn nội bộ bắt đầu bằng "/".
 *
 * Nếu dùng thẳng mediaUrl cho link ngoài, "https://x/e.mp4" sẽ bị đổi thành
 * "/https://x/e.mp4" làm hỏng video.
 */
export const normalizeVideoUrl = (value) => {
  const raw = toText(value);
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  return mediaUrl(raw);
};

/**
 * Một mùa/tập có đang hoạt động không.
 * Dữ liệu cũ dùng boolean (true/false), cũng có nơi dùng chuỗi "inactive".
 * Chỉ coi là ẩn khi status là false / "false" / "inactive" / 0.
 * Cách này khớp với `chuanHoaTrangThai` đang dùng trong src/js/admin.
 */
export const isActive = (status) => {
  if (status === false || status === 0) return false;
  const value = toText(status).toLowerCase();
  return !(value === "false" || value === "inactive" || value === "0");
};

/** Phim này có phải phim bộ hay không. */
export const isSeriesMovie = (movie) =>
  toText(movie?.type).toLowerCase() === SERIES_TYPE;

/**
 * Chuẩn hoá một bản ghi trong bảng `season` về cùng một dạng.
 * poster được kiểm tra an toàn giống poster phim (safeImagePath).
 */
export function normalizeSeason(raw) {
  return {
    id: raw.id,
    movieId: raw.movieId,
    seasonNumber: toNumber(raw.seasonNumber),
    title: toText(raw.title),
    description: toText(raw.description),
    poster: safeImagePath(raw.poster),
    releaseYear: toNumber(raw.releaseYear),
    status: isActive(raw.status),
  };
}

/**
 * Chuẩn hoá một bản ghi trong bảng `episodes` về cùng một dạng.
 * video giữ nguyên link ngoài, còn đường dẫn nội bộ thì thêm "/" đầu
 * (normalizeVideoUrl); thumbnail kiểm tra an toàn.
 */
export function normalizeEpisode(raw) {
  return {
    id: raw.id,
    seasonId: raw.seasonId,
    episodeNumber: toNumber(raw.episodeNumber),
    title: toText(raw.title),
    description: toText(raw.description),
    video: normalizeVideoUrl(raw.video),
    thumbnail: safeImagePath(raw.thumbnail),
    duration: toNumber(raw.duration),
    releaseDate: toText(raw.releaseDate),
    status: isActive(raw.status),
  };
}

/* ------------------------------------------------------------------ *
 * 2. SẮP XẾP
 * ------------------------------------------------------------------ */

/** So sánh theo một trường số (seasonNumber / episodeNumber). */
const byNumber = (field) => (a, b) => {
  const na = Number(a[field]);
  const nb = Number(b[field]);

  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;

  return String(a[field] ?? "").localeCompare(String(b[field] ?? ""));
};

/** Sắp xếp mùa theo seasonNumber tăng dần (không sửa mảng gốc). */
export const sortSeasons = (list = []) =>
  list.slice().sort(byNumber("seasonNumber"));

/** Sắp xếp tập theo episodeNumber tăng dần (không sửa mảng gốc). */
export const sortEpisodes = (list = []) =>
  list.slice().sort(byNumber("episodeNumber"));

/* ------------------------------------------------------------------ *
 * 3. NẠP DỮ LIỆU (có cache, giống loadCatalog)
 * ------------------------------------------------------------------ */

let seriesPromise = null;

/** Đọc bảng season/episodes qua json-server. */
async function readSeriesViaApi() {
  const [seasons, episodes] = await Promise.all([
    api.get(SEASON_ENDPOINT),
    api.get(EPISODE_ENDPOINT),
  ]);

  if (!Array.isArray(seasons) || !Array.isArray(episodes)) {
    throw new Error("Dữ liệu season/episodes không hợp lệ.");
  }

  return { seasons, episodes, source: "api" };
}

/** Đọc bảng season/episodes từ file db.json tĩnh. */
async function readSeriesViaStaticFile() {
  const db = await fetchJsonWithRetry(DB_FALLBACK_URL);
  if (!db) throw new Error("db.json không hợp lệ");

  return {
    seasons: Array.isArray(db.season) ? db.season : [],
    episodes: Array.isArray(db.episodes) ? db.episodes : [],
    source: "static",
  };
}

/**
 * Nạp toàn bộ mùa phim và tập phim đã chuẩn hoá, đã sắp xếp.
 * @returns {Promise<{seasons: Array, episodes: Array, source: string}>}
 */
export function loadSeriesData() {
  if (seriesPromise) return seriesPromise;

  seriesPromise = (async () => {
    let raw;

    try {
      raw = await readSeriesViaApi();
    } catch (errApi) {
      console.warn(
        "[series-data] json-server không dùng được, chuyển sang db.json tĩnh:",
        errApi?.message,
      );
      raw = await readSeriesViaStaticFile();
    }

    return {
      seasons: sortSeasons(raw.seasons.map(normalizeSeason)),
      episodes: sortEpisodes(raw.episodes.map(normalizeEpisode)),
      source: raw.source,
    };
  })().catch((err) => {
    seriesPromise = null; // cho phép thử lại ở lần gọi sau
    throw err;
  });

  return seriesPromise;
}

/* ------------------------------------------------------------------ *
 * 4. QUAN HỆ PHIM BỘ — MÙA — TẬP
 * ------------------------------------------------------------------ */

/** Tất cả mùa của một phim bộ, sắp theo số mùa. */
export const seasonsOfMovie = (seasons = [], movieId) =>
  sortSeasons(seasons.filter((season) => sameId(season.movieId, movieId)));

/** Tất cả tập của một mùa, sắp theo số tập. */
export const episodesOfSeason = (episodes = [], seasonId) =>
  sortEpisodes(episodes.filter((episode) => sameId(episode.seasonId, seasonId)));

/** Tìm một mùa theo id. Trả null nếu không có. */
export const findSeasonById = (seasons = [], id) =>
  seasons.find((season) => sameId(season.id, id)) || null;

/** Tìm một tập theo id. Trả null nếu không có. */
export const findEpisodeById = (episodes = [], id) =>
  episodes.find((episode) => sameId(episode.id, id)) || null;

/** Tất cả tập của một phim bộ (gộp qua các mùa), sắp theo mùa rồi theo tập. */
export function episodesOfMovie(movieId, seasons = [], episodes = []) {
  const seasonOrder = new Map(
    seasonsOfMovie(seasons, movieId).map((season, index) => [String(season.id), index]),
  );

  return episodes
    .filter((episode) => seasonOrder.has(String(episode.seasonId)))
    .sort((a, b) => {
      const seasonA = seasonOrder.get(String(a.seasonId));
      const seasonB = seasonOrder.get(String(b.seasonId));
      if (seasonA !== seasonB) return seasonA - seasonB;
      return byNumber("episodeNumber")(a, b);
    });
}

/**
 * Gộp phim bộ với mùa và tập thành một cây để giao diện dùng.
 * @returns {null | {movie, seasons: Array, episodeCount: number}}
 *          mỗi phần tử seasons có thêm trường `episodes`.
 */
export function buildSeriesModel(movie, seasons = [], episodes = []) {
  if (!movie) return null;

  const movieSeasons = seasonsOfMovie(seasons, movie.id).map((season) => ({
    ...season,
    episodes: episodesOfSeason(episodes, season.id),
  }));

  return {
    movie,
    seasons: movieSeasons,
    episodeCount: movieSeasons.reduce((sum, s) => sum + s.episodes.length, 0),
  };
}

/* ------------------------------------------------------------------ *
 * 5. KIỂM TRA TÍNH ĐÚNG CỦA QUAN HỆ
 * ------------------------------------------------------------------ */

/** Đếm các giá trị khoá bị lặp (dùng cho seasonNumber / episodeNumber). */
function findDuplicates(list, keyFn) {
  const counts = new Map();

  for (const item of list) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

/**
 * Rà soát dữ liệu phim bộ để phát hiện liên kết hỏng.
 * Không sửa dữ liệu, chỉ báo cáo — dùng cho bước kiểm tra thủ công.
 *
 * @param {{seasons?: Array, episodes?: Array}} data mùa và tập (đã chuẩn hoá)
 * @param {Array} [movies] danh sách phim, truyền vào để dò mùa mồ côi
 * @returns {{orphanSeasons: Array, orphanEpisodes: Array,
 *            duplicateSeasons: Array, duplicateEpisodes: Array}}
 */
export function validateSeriesData({ seasons = [], episodes = [] } = {}, movies) {
  const seasonIds = new Set(seasons.map((s) => String(s.id)));
  const movieIds = Array.isArray(movies)
    ? new Set(movies.map((m) => String(m.id)))
    : null;

  return {
    // Mùa trỏ tới phim không tồn tại (chỉ kiểm tra khi có danh sách phim).
    orphanSeasons: movieIds
      ? seasons.filter((s) => !movieIds.has(String(s.movieId)))
      : [],
    // Tập trỏ tới mùa không tồn tại.
    orphanEpisodes: episodes.filter((e) => !seasonIds.has(String(e.seasonId))),
    // Hai mùa cùng số trong một phim.
    duplicateSeasons: findDuplicates(seasons, (s) => `${s.movieId}::${s.seasonNumber}`),
    // Hai tập cùng số trong một mùa.
    duplicateEpisodes: findDuplicates(episodes, (e) => `${e.seasonId}::${e.episodeNumber}`),
  };
}
