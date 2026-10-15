/**
 * service.js — Tầng dữ liệu cho Trang cá nhân & Cài đặt.
 *
 * Kiến trúc "API-first, mock-fallback":
 *   1. Thử kết nối json-server (src/js/api.js → localhost:3000).
 *   2. Nếu không sống hoặc người dùng chưa đăng nhập → dùng dữ liệu mẫu
 *      trong `mock-data.js`, lưu ở localStorage để thao tác vẫn "bền".
 *
 * Mọi hàm trả về VIEW-MODEL đã chuẩn hoá (sẵn sàng cho component render),
 * nên component không cần biết dữ liệu đến từ API hay từ mock.
 * Khi backend thật sẵn sàng: chỉ cần bỏ khối `if (online) ... else ...` trong
 * `loadDashboard()` — phần còn lại giữ nguyên.
 */

import api from "../../api.js";
import { createSeed, MOCK_MOVIES } from "./mock-data.js";
import {
  AVATAR_FALLBACK,
  detailHref,
  formatDate,
  formatHours,
  formatMinutes,
  formatNumber,
  formatRelative,
  mediaUrl,
  POSTER_FALLBACK,
  slugify,
  storage,
  watchHref,
} from "./utils.js";

const MOCK_PREFIX = "mf:demo:";
const GENDER_LABEL = { nam: "Nam", nu: "Nữ", khac: "Khác" };
const API_TIMEOUT = 2500;
const NO_TITLE = "Chưa có tên";

/* ------------------------------------------------------------------ *
 * 1. PHIÊN ĐĂNG NHẬP
 * ------------------------------------------------------------------ */

/** Đọc user đang đăng nhập (cùng cơ chế với header.js / auth.js). */
export function getSessionUser() {
  const raw = storage.get("currentUser", null);
  return raw && raw.id !== undefined ? raw : null;
}

export function isSignedIn() {
  return Boolean(getSessionUser());
}

/** id dùng cho khoá dữ liệu: user thật nếu đăng nhập, không thì "guest". */
export function currentScopeId() {
  const user = getSessionUser();
  return user ? String(user.id) : "guest";
}

/* ------------------------------------------------------------------ *
 * 2. KHO DỮ LIỆU MẪU
 * ------------------------------------------------------------------ */

function readMock(scopeId) {
  const key = MOCK_PREFIX + scopeId;
  const seed = createSeed(scopeId);
  const stored = storage.get(key, null);
  return stored ? { ...seed, ...stored } : seed;
}

function writeMock(scopeId, data) {
  storage.set(MOCK_PREFIX + scopeId, data);
  return data;
}

/* ------------------------------------------------------------------ *
 * 3. PHÁT HIỆN BACKEND
 * ------------------------------------------------------------------ */

let backendPromise = null;

/** @returns {Promise<boolean>} true nếu json-server đang chạy. */
export function detectBackend() {
  if (!backendPromise) {
    backendPromise = Promise.race([
      api
        .get("/movies")
        .then((rows) => Array.isArray(rows) && rows.length > 0)
        .catch(() => false),
      new Promise((resolve) => setTimeout(() => resolve(false), API_TIMEOUT)),
    ]);
  }
  return backendPromise;
}

const withTimeout = (request) =>
  Promise.race([
    request(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), API_TIMEOUT)),
  ]);

const sameId = (a, b) => String(a) === String(b);

/* ------------------------------------------------------------------ *
 * 4. CHUẨN HOÁ DỮ LIỆU (API row → view-model)
 * ------------------------------------------------------------------ */

const avatarOf = (value) => mediaUrl(value, AVATAR_FALLBACK);

function normalizeProfile(raw, scopeId) {
  const fullName = String(raw?.fullname || raw?.fullName || "Nguyễn Văn A").trim();
  const username = String(raw?.username || "nguyenvana").trim();
  const joined = raw?.createdAt || raw?.joinedAt || "2025-01-15";
  const parsed = new Date(joined);
  const joinedYear = Number.isNaN(parsed.getTime()) ? 2025 : parsed.getFullYear();

  return {
    id: String(raw?.id ?? scopeId),
    fullName,
    username,
    handle: `@${username}`,
    email: raw?.email || "example@movief.vn",
    phone: raw?.phone || "",
    birthday: raw?.dob || raw?.birthday || "",
    gender: raw?.gender || "khac",
    genderLabel: GENDER_LABEL[raw?.gender] || "Khác",
    bio: raw?.bio || "Khám phá thế giới điện ảnh cùng MovieF.",
    avatar: avatarOf(raw?.avatar),
    role: raw?.role || "Thành viên",
    status: raw?.status || "active",
    joinedAt: joined,
    joinedLabel: `Tham gia từ ${joinedYear}`,
    joinedFull: formatDate(joined),
  };
}

/** db.json chưa có `quality`/`rating` → suy ra từ dữ liệu có sẵn. */
const qualityOf = (movie) => movie.quality || "FHD";

const scoreOf = (movie) => {
  if (movie.rating !== undefined) return Number(movie.rating).toFixed(1);
  if (movie.score !== undefined) return Number(movie.score).toFixed(1);
  if (movie.views) return Math.min(9.8, 6 + movie.views / 4000).toFixed(1);
  return "—";
};

function normalizeMovie(movie, context) {
  const totalEpisodes = Number(movie.totalEpisodes) || 1;
  const isSeries = movie.type === "series" || totalEpisodes > 1;
  return {
    movieId: String(movie.id),
    title: movie.title || NO_TITLE,
    slug: movie.slug || slugify(movie.title),
    poster: mediaUrl(movie.poster, POSTER_FALLBACK),
    year: movie.year ?? "—",
    quality: qualityOf(movie),
    score: scoreOf(movie),
    genres: Array.isArray(movie.genres) ? movie.genres.slice(0, 2) : [],
    type: isSeries ? "series" : "movie",
    totalEpisodes,
    durationMinutes: Number(movie.duration) || 0,
    durationLabel: movie.duration ? formatMinutes(movie.duration) : "—",
    isFavorite: context.favoriteIds.has(String(movie.id)),
    isInWatchLater: context.watchLaterIds.has(String(movie.id)),
    href: watchHref(movie),
    detailHref: detailHref(movie),
  };
}

const percentOf = (positionSeconds, totalSeconds) => {
  const total = Number(totalSeconds) || 0;
  if (!total) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round(((Number(positionSeconds) || 0) / total) * 100)),
  );
};

const remainingOf = (positionSeconds, totalSeconds) =>
  Math.max(0, Math.round(((Number(totalSeconds) || 0) - (Number(positionSeconds) || 0)) / 60));

/** Bổ sung duration/tập cho dữ liệu API (db.json không lưu 2 trường này). */
function decorateRows(rows, movies) {
  return rows.map((row) => {
    const movie = movies.find((item) => sameId(item.id, row.movieId));
    return {
      ...row,
      durationSeconds: (movie?.duration || 0) * 60,
      episode: row.episode ?? 1,
      totalEpisodes: row.totalEpisodes ?? movie?.totalEpisodes ?? 1,
    };
  });
}

function normalizeContinue(row, context) {
  const movie = context.moviesById.get(String(row.movieId));
  if (!movie) return null;

  const totalSeconds = row.durationSeconds || (movie.duration || 0) * 60;
  const positionSeconds = Number(row.positionSeconds ?? row.progress) || 0;
  const base = normalizeMovie(movie, context);
  const percent = percentOf(positionSeconds, totalSeconds);
  const remaining = remainingOf(positionSeconds, totalSeconds);

  return {
    id: String(row.id),
    ...base,
    episodeNumber: Number(row.episode) || 1,
    episodeLabel: base.type === "series" ? `Tập ${Number(row.episode) || 1}` : "Phim lẻ",
    progressPercent: percent,
    watchedLabel: `Đã xem ${percent}%`,
    remainingMinutes: remaining,
    remainingLabel: remaining > 0 ? `Còn ${formatMinutes(remaining)}` : "Đã xem xong",
    updatedLabel: formatRelative(row.updatedAt || row.watchedAt),
    href: watchHref(movie, positionSeconds),
  };
}

function normalizeHistory(row, context) {
  const movie = context.moviesById.get(String(row.movieId));
  if (!movie) return null;

  const totalSeconds = row.durationSeconds || (movie.duration || 0) * 60;
  const positionSeconds = Number(row.positionSeconds ?? row.progress) || 0;
  const base = normalizeMovie(movie, context);
  const percent = percentOf(positionSeconds, totalSeconds);
  const remaining = remainingOf(positionSeconds, totalSeconds);
  const totalEpisodes = Number(row.totalEpisodes) || base.totalEpisodes;

  return {
    id: String(row.id),
    ...base,
    episodeNumber: Number(row.episode) || 1,
    episodeLabel:
      base.type === "series"
        ? `Tập ${Number(row.episode) || 1}/${totalEpisodes}`
        : `${formatMinutes(positionSeconds / 60)} / ${base.durationLabel}`,
    progressPercent: percent,
    watchedLabel: `Đã xem ${percent}%`,
    remainingMinutes: remaining,
    remainingLabel: remaining > 0 ? `Còn ${formatMinutes(remaining)}` : "Đã xem xong",
    watchedAtLabel: formatRelative(row.watchedAt),
    href: watchHref(movie, positionSeconds),
  };
}

function normalizeReview(row, context) {
  const movie = context.moviesById.get(String(row.movieId));
  if (!movie) return null;
  return {
    id: String(row.id),
    ...normalizeMovie(movie, context),
    rating: Number(row.rating) || 0,
    comment: row.comment || "",
    createdAt: row.createdAt,
    createdLabel: formatDate(row.createdAt),
  };
}

/** 4 thẻ thống kê tài khoản — luôn tính từ dữ liệu thật nên không bị lệch. */
function buildStats(history, favorites, watchLater) {
  const totalMinutes = history.reduce(
    (sum, row) => sum + (Number(row.positionSeconds ?? row.progress) || 0) / 60,
    0,
  );
  const hours = Math.round(totalMinutes / 60);

  return [
    { key: "watched", label: "Phim đã xem", value: formatNumber(history.length), hint: "Tác phẩm trong lịch sử", icon: "film" },
    { key: "favorites", label: "Phim yêu thích", value: formatNumber(favorites.length), hint: "Đã lưu để xem lại", icon: "heart", fill: true },
    { key: "watchLater", label: "Danh sách xem sau", value: formatNumber(watchLater.length), hint: "Đang chờ bạn", icon: "bookmark" },
    { key: "hours", label: "Giờ đã xem", value: formatHours(hours), hint: `~${formatNumber(Math.round(totalMinutes))} phút`, icon: "clock" },
  ];
}

function makeContext(movies, favorites, watchLater) {
  return {
    moviesById: new Map(movies.map((movie) => [String(movie.id), movie])),
    favoriteIds: new Set(favorites.map((row) => String(row.movieId))),
    watchLaterIds: new Set(watchLater.map((row) => String(row.movieId))),
  };
}

/** Bỏ các bản ghi trỏ tới phim không còn tồn tại trong bảng `movies`. */
const toMovieCards = (rows, context) =>
  rows
    .filter((row) => context.moviesById.has(String(row.movieId)))
    .map((row) => ({ id: String(row.id), ...normalizeMovie(context.moviesById.get(String(row.movieId)), context) }));

/** Sắp xếp theo `watchedAt` gốc (chuẩn hoá xong đã mất trường thời gian). */
const sortByWatchedAt = (normalized, rawRows) => {
  const order = new Map(rawRows.map((row) => [String(row.id), new Date(row.watchedAt || 0).getTime()]));
  return [...normalized].sort((a, b) => (order.get(b.id) || 0) - (order.get(a.id) || 0));
};

/* ------------------------------------------------------------------ *
 * 5. ĐỌC DỮ LIỆU
 * ------------------------------------------------------------------ */

async function loadApiTable(table) {
  try {
    const rows = await withTimeout(() => api.get(`/${table}`));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Trả về toàn bộ dữ liệu trang Cá nhân đã chuẩn hoá.
 * @returns {Promise<{mode:string, profile:object, stats:Array, settings:object,
 *   continueWatching:Array, favorites:Array, watchLater:Array, history:Array, reviews:Array}>}
 */
export async function loadDashboard() {
  const scopeId = currentScopeId();
  const session = getSessionUser();
  const online = Boolean(session) && (await detectBackend());
  const mock = readMock(scopeId);

  let profile;
  let movies = [];
  let favoriteRows = [];
  let watchLaterRows = [];
  let historyRows = [];
  let reviewRows = [];
  let continueRows = [];
  let settings = mock.settings;

  if (online) {
    const [freshUser, apiMovies, apiFavorites, apiHistories, apiReviews] = await Promise.all([
      withTimeout(() => api.get(`/users/${scopeId}`)).catch(() => null),
      loadApiTable("movies"),
      loadApiTable("favorites"),
      loadApiTable("histories"),
      loadApiTable("reviews"),
    ]);

    movies = apiMovies;
    favoriteRows = apiFavorites.filter((row) => sameId(row.userId, scopeId));
    historyRows = decorateRows(apiHistories.filter((row) => sameId(row.userId, scopeId)), movies);
    reviewRows = apiReviews.filter((row) => sameId(row.userId, scopeId));

    // "Xem sau" & cài đặt chưa có bảng trong db.json → giữ ở kho cục bộ.
    // Thêm bảng `watchLaters` vào db.json là dùng được ngay mà không phải sửa component.
    watchLaterRows = storage.get(`${MOCK_PREFIX}${scopeId}:watchLater`, mock.watchLater) || [];
    continueRows = historyRows.filter((row) => {
      const percent = percentOf(row.progress, row.durationSeconds);
      return percent > 0 && percent < 95;
    });

    profile = normalizeProfile({ ...mock.profile, ...(freshUser || session) }, scopeId);
    settings = { ...mock.settings, ...(storage.get(`${MOCK_PREFIX}${scopeId}:settings`, {}) || {}) };
  } else {
    movies = MOCK_MOVIES;
    favoriteRows = mock.favorites;
    watchLaterRows = mock.watchLater;
    historyRows = mock.history;
    reviewRows = mock.reviews;
    continueRows = mock.continueWatching;
    profile = normalizeProfile({ ...mock.profile, ...(session || {}) }, scopeId);
  }

  const context = makeContext(movies, favoriteRows, watchLaterRows);

  return {
    mode: online ? "api" : "demo",
    profile,
    settings,
    stats: buildStats(historyRows, favoriteRows, watchLaterRows),
    continueWatching: continueRows
      .map((row) => normalizeContinue(row, context))
      .filter(Boolean)
      .sort((a, b) => b.progressPercent - a.progressPercent),
    favorites: toMovieCards(favoriteRows, context),
    watchLater: toMovieCards(watchLaterRows, context),
    history: sortByWatchedAt(
      historyRows.map((row) => normalizeHistory(row, context)).filter(Boolean),
      historyRows,
    ),
    reviews: reviewRows.map((row) => normalizeReview(row, context)).filter(Boolean),
  };
}

/* ------------------------------------------------------------------ *
 * 6. MUTATION
 * ------------------------------------------------------------------ */

const COLLECTION_TABLE = { favorites: "favorites", watchLater: "watchLaters" };

/** Lưu hồ sơ: ghi API nếu có, luôn ghi kho cục bộ để giao diện cập nhật tức thì. */
export async function saveProfile(patch) {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  mock.profile = { ...mock.profile, ...patch };
  writeMock(scopeId, mock);

  const session = getSessionUser();
  if (session) {
    const next = { ...session };
    for (const key of ["fullname", "username", "email", "phone", "dob", "bio", "avatar"]) {
      if (patch[key] !== undefined) next[key] = patch[key];
    }
    storage.set("currentUser", next);
  }

  if (await detectBackend()) {
    try {
      const body = { ...patch };
      if (patch.birthday !== undefined && body.dob === undefined) {
        body.dob = patch.birthday;
        delete body.birthday;
      }
      await withTimeout(() => api.patch(`/users/${scopeId}`, body));
    } catch (error) {
      console.warn("[profile] Không ghi được hồ sơ lên API:", error);
    }
  }

  return normalizeProfile({ ...mock.profile }, scopeId);
}

/** Bật/tắt yêu thích. @returns {Promise<boolean>} trạng thái sau khi bật/tắt */
export async function toggleFavorite(movieId) {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  const index = mock.favorites.findIndex((row) => sameId(row.movieId, movieId));
  const willAdd = index === -1;
  const removedId = willAdd ? null : mock.favorites[index].id;

  if (willAdd) {
    mock.favorites.unshift({
      id: `f-${Date.now()}`,
      movieId: String(movieId),
      createdAt: new Date().toISOString(),
    });
  } else {
    mock.favorites.splice(index, 1);
  }
  writeMock(scopeId, mock);

  if (await detectBackend()) {
    try {
      if (willAdd) {
        await withTimeout(() =>
          api.post("/favorites", {
            userId: Number(scopeId),
            movieId: String(movieId),
            createdAt: new Date().toISOString(),
          }),
        );
      } else {
        await withTimeout(() => api.delete(`/favorites/${removedId}`));
      }
    } catch (error) {
      console.warn("[profile] Không đồng bộ được yêu thích lên API:", error);
    }
  }

  return willAdd;
}

/** Bật/tắt danh sách xem sau. @returns {Promise<boolean>} trạng thái sau khi bật/tắt */
export async function toggleWatchLater(movieId) {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  const index = mock.watchLater.findIndex((row) => sameId(row.movieId, movieId));
  const willAdd = index === -1;

  if (willAdd) {
    mock.watchLater.unshift({
      id: `w-${Date.now()}`,
      movieId: String(movieId),
      createdAt: new Date().toISOString(),
    });
  } else {
    mock.watchLater.splice(index, 1);
  }
  mock.watchLater.forEach((row, i) => {
    row.id = `w-${i + 1}`;
  });
  writeMock(scopeId, mock);
  storage.set(`${MOCK_PREFIX}${scopeId}:watchLater`, mock.watchLater);

  return willAdd;
}

/** Xoá 1 phim khỏi yêu thích / xem sau. */
export async function removeFromCollection(collection, id) {
  const scopeId = currentScopeId();
  const key = collection === "watchLater" ? "watchLater" : "favorites";
  const mock = readMock(scopeId);
  mock[key] = mock[key].filter((item) => !sameId(item.id, id));
  writeMock(scopeId, mock);

  if (key === "watchLater") {
    storage.set(`${MOCK_PREFIX}${scopeId}:watchLater`, mock.watchLater);
  } else if (await detectBackend()) {
    try {
      await withTimeout(() => api.delete(`/${COLLECTION_TABLE.favorites}/${id}`));
    } catch (error) {
      console.warn("[profile] Không xoá được yêu thích trên API:", error);
    }
  }
}

/** Xoá 1 mục khỏi lịch sử xem (và mục "tiếp tục xem" tương ứng). */
export async function removeHistoryItem(id) {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  const removed = mock.history.find((row) => sameId(row.id, id));
  const movieId = removed?.movieId;

  mock.history = mock.history.filter((row) => !sameId(row.id, id));
  mock.continueWatching = mock.continueWatching.filter(
    (row) => !sameId(row.id, id) && !(movieId !== undefined && sameId(row.movieId, movieId)),
  );
  writeMock(scopeId, mock);

  if (await detectBackend()) {
    try {
      await withTimeout(() => api.delete(`/histories/${id}`));
    } catch (error) {
      console.warn("[profile] Không xoá được lịch sử trên API:", error);
    }
  }
}

/** Xoá toàn bộ lịch sử xem. */
export async function clearHistory() {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  const ids = mock.history.map((row) => row.id);
  mock.history = [];
  mock.continueWatching = [];
  writeMock(scopeId, mock);

  if (await detectBackend()) {
    try {
      await Promise.all(ids.map((id) => withTimeout(() => api.delete(`/histories/${id}`)).catch(() => null)));
    } catch (error) {
      console.warn("[profile] Không xoá được lịch sử trên API:", error);
    }
  }
}

/** Xoá 1 đánh giá. */
export async function removeReview(id) {
  const scopeId = currentScopeId();
  const mock = readMock(scopeId);
  mock.reviews = mock.reviews.filter((row) => !sameId(row.id, id));
  writeMock(scopeId, mock);

  if (await detectBackend()) {
    try {
      await withTimeout(() => api.delete(`/reviews/${id}`));
    } catch (error) {
      console.warn("[profile] Không xoá được đánh giá trên API:", error);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 7. CÀI ĐẶT & BẢO MẬT
 * ------------------------------------------------------------------ */

const SETTINGS_KEY = (scopeId) => `${MOCK_PREFIX}${scopeId}:settings`;

export async function loadSettings() {
  const scopeId = currentScopeId();
  return { ...readMock(scopeId).settings, ...(storage.get(SETTINGS_KEY(scopeId), {}) || {}) };
}

export async function saveSettings(patch) {
  const scopeId = currentScopeId();
  const next = { ...(await loadSettings()), ...patch };
  storage.set(SETTINGS_KEY(scopeId), next);
  return next;
}

/** SHA-256 giống hệt cách auth.js băm mật khẩu. */
export async function hashPassword(password) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function changePassword(currentPassword, newPassword) {
  const scopeId = currentScopeId();
  const session = getSessionUser();
  if (!session) {
    return { ok: false, message: "Bạn cần đăng nhập để đổi mật khẩu." };
  }

  let stored = session;
  if (await detectBackend()) {
    try {
      stored = await withTimeout(() => api.get(`/users/${scopeId}`));
    } catch {
      stored = session;
    }
  }

  const hash = await hashPassword(currentPassword);
  if (stored?.password !== hash && stored?.password !== currentPassword) {
    return { ok: false, message: "Mật khẩu hiện tại không chính xác." };
  }

  const newHash = await hashPassword(newPassword);
  storage.set("currentUser", { ...stored, password: newHash });

  if (await detectBackend()) {
    try {
      await withTimeout(() => api.patch(`/users/${scopeId}`, { password: newHash }));
    } catch (error) {
      console.warn("[profile] Không đổi được mật khẩu trên API:", error);
    }
  }

  return { ok: true, message: "Đổi mật khẩu thành công." };
}

/** Đăng xuất: dọn sạch phiên + dữ liệu phụ của tài khoản đó. */
export function signOut() {
  const scopeId = currentScopeId();
  storage.remove("currentUser");
  storage.remove(SETTINGS_KEY(scopeId));
  storage.remove(`${MOCK_PREFIX}${scopeId}:watchLater`);
  try {
    sessionStorage.removeItem("redirectAfterLogin");
  } catch {
    /* bỏ qua */
  }
}
