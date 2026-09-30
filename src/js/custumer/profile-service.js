/**
 * profile-service.js
 * Lớp dữ liệu cho Trang cá nhân (/profile).
 *
 * Chiến lược dữ liệu (2 chế độ):
 *  - "api"   : đọc/ghi qua json-server thật (src/js/api.js). Được dùng mặc định.
 *  - "local" : dùng localStorage làm "database" khi máy chủ không chạy,
 *              kèm dữ liệu mẫu để giao diện vẫn chạy đầy đủ.
 *
 * Bật chế độ dữ liệu mẫu: /profile?demo=1
 * Khi backend thật sẵn sàng, chỉ cần xoá khối DEMO_* bên dưới —
 * phần gọi API phía trên không cần thay đổi.
 */

import api from "../api.js";

/* ------------------------------------------------------------------ *
 * 1. TIỆN ÍCH CHUNG
 * ------------------------------------------------------------------ */

/** Đọc/ghi JSON trong localStorage, không bao giờ ném lỗi. */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* bỏ qua */
    }
  },
};

const lsKey = (name, userId) => `mf:${name}:${userId}`;

/** Chuẩn hoá id: db.json vừa có id số ("3") vừa có id nanoid ("DewJuy53BrE"). */
const sameId = (a, b) => String(a) === String(b);

/** SHA-256 giống hệt cách auth.js băm mật khẩu khi đăng nhập/đăng ký. */
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Lấy user đang đăng nhập từ localStorage (cùng cơ chế với header.js / auth.js). */
export function getCurrentUser() {
  return store.get("currentUser", null);
}

export function setCurrentUser(user) {
  store.set("currentUser", user);
}

/* ------------------------------------------------------------------ *
 * 2. ẢNH DỰ PHÒNG
 *    db.json có vài đường dẫn ảnh không tồn tại (spiderman.jpg, default.png...)
 *    nên mọi <img> đều gắn onerror để thay bằng ảnh dự phòng.
 * ------------------------------------------------------------------ */

const svgPlaceholder = (label, from, to) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
      </linearGradient></defs>
      <rect width="300" height="450" fill="url(#g)"/>
      <text x="150" y="232" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-size="86" font-weight="bold" fill="rgba(255,255,255,0.85)">${label}</text>
    </svg>`,
  );

export const POSTER_FALLBACK = svgPlaceholder("MF", "#1d2024", "#0c0e12");
export const AVATAR_FALLBACK = "/images/avatar/default.svg";

/** Gắn cơ chế tự thay ảnh hỏng, áp dụng cho mọi ảnh trong vùng container. */
export function bindImageFallback(root = document) {
  root.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "1";
        img.src = img.dataset.fallback;
      },
      { once: true },
    );
  });
}

/** Chuẩn hoá đường dẫn ảnh từ db.json (bỏ dấu "/" đầu nếu có). */
export const mediaUrl = (path, fallback = POSTER_FALLBACK) =>
  path && String(path).trim() ? `/${String(path).replace(/^\/+/, "")}` : fallback;

/* ------------------------------------------------------------------ *
 * 3. DEMO DATA (chỉ dùng khi không có backend)
 *    Dữ liệu phim bám theo data/db.json để khớp với giao diện hiện tại.
 * ------------------------------------------------------------------ */

const DEMO_GENRES = [
  { id: "1", name: "Hành động", slug: "hanh-dong" },
  { id: "2", name: "Tình cảm", slug: "tinh-cam" },
  { id: "3", name: "Hài", slug: "hai" },
  { id: "4", name: "Kinh dị", slug: "kinh-di" },
  { id: "5", name: "Khoa học viễn tưởng", slug: "khoa-hoc-vien-tuong" },
  { id: "6", name: "Hoạt hình", slug: "hoat-hinh" },
  { id: "7", name: "Phiêu lưu", slug: "phieu-luu" },
  { id: "8", name: "Tâm lý", slug: "tam-ly" },
];

const DEMO_MOVIES = [
  { id: "1", title: "Avengers: Endgame", slug: "avengers-endgame", poster: "images/movies/endgame.jpg", year: 2019, duration: 181 },
  { id: "2", title: "Spider-Man: No Way Home", slug: "spider-man-no-way-home", poster: "images/movies/spiderman.jpg", year: 2021, duration: 148 },
  { id: "3", title: "Interstellar", slug: "interstellar", poster: "images/movies/interstellar.jpg", year: 2014, duration: 169 },
  { id: "4", title: "Your Name", slug: "your-name", poster: "images/movies/your-name.jpg", year: 2016, duration: 106 },
  { id: "5", title: "The Conjuring", slug: "the-conjuring", poster: "images/movies/conjuring.jpg", year: 2013, duration: 112 },
  { id: "6", title: "Toy Story 4", slug: "toy-story-4", poster: "images/movies/toy-story-4.jpg", year: 2019, duration: 100 },
  { id: "7", title: "Dune: Part Two", slug: "dune-part-two", poster: "images/movies/dune-2.jpg", year: 2024, duration: 166 },
  { id: "8", title: "La La Land", slug: "la-la-land", poster: "images/movies/la-la-land.jpg", year: 2016, duration: 128 },
  { id: "9", title: "Inside Out 2", slug: "inside-out-2", poster: "images/movies/inside-out-2.jpg", year: 2024, duration: 96 },
  { id: "10", title: "The Batman", slug: "the-batman", poster: "images/movies/the-batman.jpg", year: 2022, duration: 176 },
];

const DEMO_MOVIE_GENRES = [
  ["1", "1"], ["1", "5"], ["1", "7"],
  ["2", "1"], ["2", "5"], ["2", "7"],
  ["3", "5"], ["3", "7"], ["3", "8"],
  ["4", "2"], ["4", "6"],
  ["5", "4"], ["5", "8"],
  ["6", "3"], ["6", "6"],
  ["7", "1"], ["7", "5"], ["7", "7"],
  ["8", "2"], ["8", "3"],
  ["9", "3"], ["9", "6"],
  ["10", "1"], ["10", "8"],
];

/** Dữ liệu mẫu: yêu thích / lịch sử / đánh giá (áp dụng cho mọi tài khoản ở chế độ demo). */
const DEMO_FAVORITES = [
  { userId: "*", movieId: "1", createdAt: "2026-09-12" },
  { userId: "*", movieId: "3", createdAt: "2026-09-13" },
  { userId: "*", movieId: "7", createdAt: "2026-09-14" },
  { userId: "*", movieId: "8", createdAt: "2026-09-15" },
];

const DEMO_HISTORY = [
  { movieId: "1", progress: 7800, totalEpisodes: 1, watchedAt: "2026-09-18T10:30:00" },
  { movieId: "3", progress: 5400, totalEpisodes: 1, watchedAt: "2026-09-18T13:20:00" },
  { movieId: "7", progress: 2400, totalEpisodes: 1, watchedAt: "2026-09-17T20:15:00" },
  { movieId: "9", progress: 1800, totalEpisodes: 1, watchedAt: "2026-09-16T21:00:00" },
];

const DEMO_REVIEWS = [
  { movieId: "1", rating: 5, comment: "Phim rất hay, phần cuối cực kỳ cảm xúc.", createdAt: "2026-09-12" },
  { movieId: "3", rating: 5, comment: "Nội dung sâu chứa và hình ảnh đẹp.", createdAt: "2026-09-13" },
  { movieId: "8", rating: 4, comment: "Nhạc hay, phim chạm cảm xúc.", createdAt: "2026-09-15" },
];

/** Thông tin bổ sung (SĐT, ngày sinh, giới tính) chỉ tồn tại ở chế độ demo. */
const DEMO_EXTRA_INFO = {
  username: "movief_member",
  phone: "0987 654 321",
  dob: "1998-08-15",
  gender: "nam",
};

const stamp = () => new Date().toISOString();

/* Các hàm seed: chỉ tạo dữ liệu mẫu nếu localStorage chưa có bucket tương ứng,
   trả về dữ liệu đang lưu để dùng tiếp ngay. */
const seedFavoritesFor = (userId) => {
  const key = lsKey("favorites", userId);
  if (localStorage.getItem(key)) return store.get(key, []);
  const rows = DEMO_FAVORITES.map((item, index) => ({
    id: `d${stamp()}-${index}`,
    userId: String(userId),
    movieId: item.movieId,
    createdAt: item.createdAt,
  }));
  store.set(key, rows);
  return rows;
};

const seedHistoryFor = (userId) => {
  const key = lsKey("history", userId);
  if (localStorage.getItem(key)) return store.get(key, []);
  const rows = DEMO_HISTORY.map((item, index) => ({
    id: `d${stamp()}-${index}`,
    userId: String(userId),
    movieId: item.movieId,
    progress: item.progress,
    episode: item.totalEpisodes > 1 ? 1 : undefined,
    totalEpisodes: item.totalEpisodes,
    watchedAt: item.watchedAt,
  }));
  store.set(key, rows);
  return rows;
};

const seedReviewsFor = (userId) => {
  const key = lsKey("reviews", userId);
  if (localStorage.getItem(key)) return store.get(key, []);
  const rows = DEMO_REVIEWS.map((item, index) => ({
    id: `d${stamp()}-${index}`,
    userId: String(userId),
    movieId: item.movieId,
    rating: item.rating,
    comment: item.comment,
    status: "visible",
    createdAt: item.createdAt,
  }));
  store.set(key, rows);
  return rows;
};

/** Tạo đầy đủ dữ liệu mẫu cho 1 tài khoản (chế độ demo). */
function seedDemo(userId) {
  seedFavoritesFor(userId);
  seedHistoryFor(userId);
  seedReviewsFor(userId);

  const infoKey = lsKey("info", userId);
  if (!localStorage.getItem(infoKey)) store.set(infoKey, { ...DEMO_EXTRA_INFO });
}

/* ------------------------------------------------------------------ *
 * 4. LỚY DỮ LIỆU TỪ API (kèm fallback)
 * ------------------------------------------------------------------ */

const API_TIMEOUT = 2500;

async function tryApi(request) {
  // Timeout để không bị treo UI khi json-server chưa được cài/chạy.
  return Promise.race([
    request(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), API_TIMEOUT)),
  ]);
}

const forceDemo = new URLSearchParams(window.location.search).get("demo") === "1";

/**
 * Kiểm tra backend có sống hay không (cache kết quả để không gọi lặp).
 * @returns {Promise<boolean>}
 */
let apiAlive = null;
export function checkApi() {
  if (forceDemo) return Promise.resolve(false);
  if (!apiAlive) {
    apiAlive = tryApi(() => api.get("/movies"))
      .then((res) => Array.isArray(res))
      .catch(() => false);
  }
  return apiAlive;
}

/** Đọc song song nhiều bảng. Trả về null nếu bất kỳ bảng nào không hợp lệ. */
async function loadTables(tables) {
  try {
    const result = await tryApi(() => Promise.all(tables.map((t) => api.get(`/${t}`))));
    return result.every((rows) => Array.isArray(rows)) ? result : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 5. API CÔNG KHAI
 * ------------------------------------------------------------------ */

/** Thông tin người dùng đầy đủ (kèm SĐT / ngày sinh / giới tính nếu có). */
export async function fetchUser(userId) {
  const current = getCurrentUser();
  if (!current) return null;

  if (await checkApi()) {
    try {
      const fresh = await tryApi(() => api.get(`/users/${userId}`));
      if (fresh && fresh.id !== undefined) {
        const extra = store.get(lsKey("info", userId), {});
        return { ...fresh, ...extra };
      }
    } catch {
      /* rơi xuống currentUser */
    }
  }

  return { ...current, ...store.get(lsKey("info", userId), DEMO_EXTRA_INFO) };
}

/** Danh sách phim yêu thích đã gộp thông tin phim. */
export async function fetchFavorites(userId) {
  if (!(await checkApi())) {
    seedDemo(userId);
    const rows = store.get(lsKey("favorites", userId), []);
    return attachMovies(rows);
  }

  const tables = await loadTables(["favorites", "movies"]);
  if (!tables) return [];
  const [favorites, movies] = tables;
  return attachMovies(
    favorites.filter((f) => sameId(f.userId, userId)),
    movies,
  );
}

/** Lịch sử xem phim (đã gộp phim), sắp xếp mới nhất trước. */
export async function fetchHistory(userId) {
  if (!(await checkApi())) {
    seedDemo(userId);
    const rows = store.get(lsKey("history", userId), []);
    return attachMovies(rows).sort(sortByWatchedAt);
  }

  const tables = await loadTables(["histories", "movies"]);
  if (!tables) return [];
  const [histories, movies] = tables;
  return attachMovies(
    histories.filter((h) => sameId(h.userId, userId)),
    movies,
  ).sort(sortByWatchedAt);
}

/** Các phim đã đánh giá. */
export async function fetchReviews(userId) {
  if (!(await checkApi())) {
    seedDemo(userId);
    const rows = store.get(lsKey("reviews", userId), []);
    return attachMovies(rows);
  }

  const tables = await loadTables(["reviews", "movies"]);
  if (!tables) return [];
  const [reviews, movies] = tables;
  return attachMovies(
    reviews.filter((r) => sameId(r.userId, userId)),
    movies,
  );
}

/** Bảng thể loại (dùng để gắn nhãn thể loại lên card phim). */
export async function fetchGenres() {
  if (await checkApi()) {
    const tables = await loadTables(["genres", "movieGenres"]);
    if (tables) {
      const [genres, movieGenres] = tables;
      return { genres, movieGenres };
    }
  }
  return {
    genres: DEMO_GENRES,
    movieGenres: DEMO_MOVIE_GENRES.map(([movieId, genreId], index) => ({
      id: String(index + 1),
      movieId,
      genreId,
    })),
  };
}

/** Danh sách phim nổi bật, dùng cho màn hình rỗng "Khám phá phim". */
export async function fetchPopularMovies() {
  if (await checkApi()) {
    const tables = await loadTables(["movies"]);
    if (tables) return tables[0].slice(0, 6);
  }
  return DEMO_MOVIES.slice(0, 6);
}

/* ------------------------------------------------------------------ *
 * 6. MUTATION (ghi dữ liệu)
 * ------------------------------------------------------------------ */

/** Cập nhật thông tin cá nhân. */
export async function updateUser(userId, payload) {
  const current = getCurrentUser();
  const next = { ...(current || {}), ...payload };

  if (await checkApi()) {
    try {
      await tryApi(() => api.patch(`/users/${userId}`, payload));
    } catch (error) {
      console.warn("[profile] Không ghi được lên API, dùng bộ nhớ cục bộ:", error);
    }
  }

  // Giữ các trường mở rộng riêng để lần tải sau vẫn còn.
  const { username, phone, dob, gender, ...core } = payload;
  if (phone !== undefined || dob !== undefined || gender !== undefined) {
    const extra = store.get(lsKey("info", userId), {});
    store.set(lsKey("info", userId), { ...extra, username, phone, dob, gender });
  }

  setCurrentUser(next);
  return next;
}

/** Xoá phim khỏi yêu thích. */
export async function removeFavorite(userId, favoriteId) {
  if (await checkApi()) {
    try {
      await tryApi(() => api.delete(`/favorites/${favoriteId}`));
    } catch (error) {
      console.warn("[profile] Không xoá được yêu thích trên API:", error);
    }
  }

  const key = lsKey("favorites", userId);
  store.set(key, store.get(key, []).filter((f) => !sameId(f.id, favoriteId)));
}

/** Xoá một bản ghi khỏi lịch sử xem. */
export async function removeHistory(userId, historyId) {
  if (await checkApi()) {
    try {
      await tryApi(() => api.delete(`/histories/${historyId}`));
    } catch (error) {
      console.warn("[profile] Không xoá được lịch sử trên API:", error);
    }
  }

  const key = lsKey("history", userId);
  store.set(key, store.get(key, []).filter((h) => !sameId(h.id, historyId)));
}

/** Sửa đánh giá của người dùng. */
export async function updateReview(userId, reviewId, payload) {
  if (await checkApi()) {
    try {
      await tryApi(() => api.patch(`/reviews/${reviewId}`, payload));
    } catch (error) {
      console.warn("[profile] Không sửa được đánh giá trên API:", error);
    }
  }

  // Ghi cả bản sao cục bộ để lần tải sau vẫn thấy thay đổi khi không có backend.
  const key = lsKey("reviews", userId);
  const rows = store.get(key, null) ?? seedReviewsFor(userId);
  store.set(
    key,
    rows.map((r) => (sameId(r.id, reviewId) ? { ...r, ...payload } : r)),
  );
}

/**
 * Đổi mật khẩu.
 * Mật khẩu luôn được so khớp dưới dạng SHA-256 giống auth.js.
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const hash = await hashPassword(currentPassword);
  const newHash = await hashPassword(newPassword);

  let stored = getCurrentUser();
  if (await checkApi()) {
    try {
      stored = await tryApi(() => api.get(`/users/${userId}`));
    } catch {
      /* dùng bản trong localStorage */
    }
  }

  // Tài khoản demo có mật khẩu lưu dạng plaintext trong db.json.
  const matches = stored?.password === hash || stored?.password === currentPassword;
  if (!matches) return { ok: false, message: "Mật khẩu hiện tại không chính xác." };

  if (await checkApi()) {
    try {
      await tryApi(() => api.patch(`/users/${userId}`, { password: newHash }));
    } catch (error) {
      console.warn("[profile] Không đổi được mật khẩu trên API:", error);
    }
  }

  setCurrentUser({ ...stored, password: newHash });
  return { ok: true, message: "Đổi mật khẩu thành công." };
}

/** Đăng xuất: xoá phiên đăng nhập. */
export function logout() {
  store.remove("currentUser");
  sessionStorage.removeItem("redirectAfterLogin");
}

/* ------------------------------------------------------------------ *
 * 7. HÀM NỘI BỘ
 * ------------------------------------------------------------------ */

function sortByWatchedAt(a, b) {
  return new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0);
}

/**
 * Gộp bảng ghi (yêu thích / lịch sử / đánh giá) với bảng phim
 * và chuẩn hoá id về string để so sánh không lệch kiểu.
 */
function attachMovies(rows, moviesFromApi) {
  const movies = moviesFromApi || DEMO_MOVIES;
  const byId = new Map(movies.map((m) => [String(m.id), m]));

  return rows
    .map((row) => ({ ...row, movie: byId.get(String(row.movieId)) || null }))
    .filter((row) => row.movie);
}

export { DEMO_MOVIES };
