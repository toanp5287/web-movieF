/**
 * movie-data.js
 * Lớp dữ liệu phim dùng chung cho /movies, /movie-detail và các trang khác.
 *
 * Nguồn dữ liệu (theo thứ tự ưu tiên):
 *  1. json-server tại http://localhost:3000 (src/js/api.js) — chạy cùng `npm run dev`
 *  2. File tĩnh /data/db.json do Vite phục vụ — dùng khi máy chủ :3000 chưa bật
 *
 * Nguyên tắc: KHÔNG tự tạo dữ liệu phim. Mọi tiêu đề / poster / mô tả /
 * đạo diễn / diễn viên đều lấy nguyên vẹn từ data/db.json.
 *
 * Lưu ý về ảnh: Vite trả về HTTP 200 + "Content-Type: text/html" cho mọi
 * đường dẫn không tồn tại (SPA fallback). Vì vậy phải kiểm tra content-type
 * bắt đầu bằng "image/" thay vì chỉ kiểm tra status, nếu không sẽ hiện
 * poster hỏng. Hàm probeImage() xử lý đúng chuyện này.
 */

import api from "../api.js";

/** File db.json tĩnh, Vite phục vụ từ thư mục gốc dự án. */
const DB_FALLBACK_URL = "/data/db.json";

/** Thư mục ảnh đạo diễn / diễn viên có sẵn trong public/. */
const ACTOR_DIR = "/images/actors";

/** Chỉ hiện phim đang xuất bản (bỏ qua dữ liệu thử nghiệm của admin). */
const ACTIVE_STATUS = "published";

/* ------------------------------------------------------------------ *
 * 1. TIỆN ÍCH CƠ BẢN
 * ------------------------------------------------------------------ */

/** db.json vừa có id số ("3") vừa có id nanoid sinh ra từ trang admin. */
export const sameId = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

/** Escape ký tự HTML trước khi chèn text từ db.json vào innerHTML. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Chuẩn hoá đường dẫn ảnh trong db.json: luôn bắt đầu bằng "/" và không có "//". */
export const mediaUrl = (path) => {
  const clean = String(path ?? "").trim();
  return clean ? `/${clean.replace(/^\/+/, "")}` : "";
};

/** Phần mở rộng ảnh được phép đưa vào thuộc tính src / background-image. */
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * Kiểm tra một giá trị trong db.json có phải đường dẫn ảnh dùng được hay không.
 *
 * Cần để chặn trường hợp dữ liệu bị dính HTML (ví dụ giá trị là
 * "<span class=...>") vì chuỗi đó sẽ được in ra ngay trong khu vực poster.
 * Đồng thời loại các scheme không an toàn như javascript: hay data:.
 *
 * @returns {string} đường dẫn đã chuẩn hoá, hoặc "" nếu không hợp lệ
 */
export function safeImagePath(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Dấu hiệu chứa HTML/JS, hoặc scheme nguy hiểm -> coi như dữ liệu hỏng.
  if (/[<>"'`]/.test(raw)) return "";
  if (/^(javascript|data|vbscript|file|blob):/i.test(raw)) return "";
  // Đường dẫn tuyệt đối ra ngoài dự án hoặc protocol-relative.
  if (raw.startsWith("//")) return "";

  const url = mediaUrl(raw);
  // Bỏ query/hash phía sau, ví dụ "poster.jpg?v=2".
  const pathOnly = url.split(/[?#]/)[0];
  if (!IMAGE_EXT.test(pathOnly)) return "";

  return url;
}

/** Placeholder SVG cho poster/diễn viên không có ảnh thật. */
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

/** Ảnh tròn gradient theo chữ cái đầu, dùng khi không tìm thấy ảnh diễn viên. */
export const avatarFallback = (name) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3a1418"/><stop offset="100%" stop-color="#0c0e12"/>
      </linearGradient></defs>
      <rect width="120" height="120" fill="url(#a)"/>
      <text x="60" y="76" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-size="48" font-weight="bold" fill="rgba(255,255,255,0.8)">${escapeHtml(
          String(name ?? "?").trim().charAt(0).toUpperCase() || "?",
        )}</text>
    </svg>`,
  );

/* ------------------------------------------------------------------ *
 * 2. KIỂM TRA ẢNH THẬT
 *    Vite trả 200 + text/html cho file không tồn tại nên phải xem
 *    content-type, nếu không sẽ hiện poster hỏng.
 * ------------------------------------------------------------------ */

const probeCache = new Map();

/**
 * Kiểm tra một URL có thực sự là ảnh hay không.
 *
 * Lưu ý: lỗi mạng trả về `true` (coi như "không biết") vì ảnh vẫn được bảo vệ
 * bởi data-fallback/onerror. Chỉ khi máy chủ khẳng định trả về không phải ảnh
 * mới loại phim — như vậy một lần rớt mạng không làm biến mất phim.
 *
 * @returns {Promise<boolean>}
 */
export async function probeImage(url) {
  if (!url) return false;
  if (probeCache.has(url)) return probeCache.get(url);

  const task = (async () => {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
      const type = res.headers.get("content-type") || "";
      // Bắt buộc: file tĩnh của Vite cũng trả 200, nhưng content-type là text/html.
      return res.ok ? type.toLowerCase().startsWith("image/") : false;
    } catch {
      return true; // không xác định được -> để onerror lo
    }
  })();

  probeCache.set(url, task);
  return task;
}

/** Gắn cơ chế tự thay ảnh hỏng bằng ảnh dự phòng. */
export function bindImageFallback(root = document, selector = "img[data-fallback]") {
  root.querySelectorAll(selector).forEach((img) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.fallbackApplied === "1") return;
        img.dataset.fallbackApplied = "1";
        img.src = img.dataset.fallback;
      },
      { once: true },
    );
  });
}

/* ------------------------------------------------------------------ *
 * 3. ĐỌC data/db.json
 * ------------------------------------------------------------------ */

const fetchJson = async (url, timeoutMs = 6000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-cache" });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

/** Thử lại vài lần khi mạng chập chờn, để trang không nháy sang thông báo lỗi. */
const fetchJsonWithRetry = async (url, retries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJson(url);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError;
};

/** Đọc db.json qua json-server, lỗi thì trả null. */
async function readViaApi() {
  const [movies, genres, reviews, users] = await Promise.all([
    api.get("/movies"),
    api.get("/genres").catch(() => []),
    api.get("/reviews").catch(() => []),
    api.get("/users").catch(() => []),
  ]);
  if (!Array.isArray(movies)) throw new Error("/movies không phải mảng");
  return {
    movies,
    genres: Array.isArray(genres) ? genres : [],
    reviews: Array.isArray(reviews) ? reviews : [],
    users: Array.isArray(users) ? users : [],
    source: "api",
  };
}

/** Đọc db.json từ file tĩnh do Vite phục vụ. */
async function readViaStaticFile() {
  const db = await fetchJsonWithRetry(DB_FALLBACK_URL);
  if (!db || !Array.isArray(db.movies)) throw new Error("db.json không hợp lệ");
  return {
    movies: db.movies,
    genres: Array.isArray(db.genres) ? db.genres : [],
    reviews: Array.isArray(db.reviews) ? db.reviews : [],
    users: Array.isArray(db.users) ? db.users : [],
    source: "static",
  };
}

/* ------------------------------------------------------------------ *
 * 4. CHUẨN HOÁ DỮ LIỆU PHIM
 * ------------------------------------------------------------------ */

/** db.json có thể lưu "166" hoặc 166, mảng rỗng hoặc thiếu hẳn. */
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  return [String(value).trim()];
};

function normalizeMovie(raw) {
  const year = toNumber(raw.year);
  const duration = toNumber(raw.duration);
  return {
    id: raw.id,
    slug: raw.slug || "",
    title: String(raw.title ?? "").trim(),
    originalTitle: "",
    description: String(raw.description ?? "").trim(),
    poster: safeImagePath(raw.poster),
    backdrop: safeImagePath(raw.backdrop),
    year,
    decade: year ? Math.floor(year / 10) * 10 : null,
    duration,
    country: String(raw.country ?? "").trim(),
    director: String(raw.director ?? "").trim(),
    actors: toList(raw.actors),
    genreIds: toList(raw.genre),
    quality: String(raw.quality ?? "").trim(),
    status: String(raw.status ?? "").trim(),
    views: toNumber(raw.views) ?? 0,
    trailer: mediaUrl(raw.trailer),
    video: mediaUrl(raw.video),
    createdAt: raw.createdAt || "",
  };
}

/**
 * Phim nào đủ điều kiện hiển thị lên giao diện.
 * - Phải có tên.
 * - Phải đang xuất bản (bỏ dữ liệu thử nghiệm status: "Inactive").
 *
 * Poster hỏng KHÔNG làm mất phim: giao diện sẽ hiện ảnh dự phòng, đồng thời
 * `movie.poster` được đặt về "" để chắc chắn không đưa URL hỏng (hay chuỗi HTML
 * bị dính trong db.json) vào thuộc tính src / background-image.
 */
async function isRenderable(movie) {
  if (!movie.title) return false;
  if (movie.status && movie.status.toLowerCase() !== ACTIVE_STATUS) return false;

  if (movie.poster && (await probeImage(movie.poster))) return true;

  if (movie.poster) {
    console.warn(
      `[movie-data] Poster không dùng được, dùng ảnh dự phòng cho phim #${movie.id}:`,
      movie.poster,
    );
  }
  movie.poster = "";
  return true;
}

/* ------------------------------------------------------------------ *
 * 5. CATALOGUE DÙNG CHUNG (có cache)
 * ------------------------------------------------------------------ */

let catalogPromise = null;

/**
 * Nạp toàn bộ dữ liệu phim đã lọc và đã kiểm tra ảnh.
 * @returns {Promise<{movies: Array, genres: Array, reviews: Array, source: string}>}
 */
export function loadCatalog() {
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    let raw;
    let source;
    try {
      raw = await readViaApi();
      source = raw.source;
    } catch (errApi) {
      console.warn("[movie-data] json-server không dùng được, chuyển sang db.json tĩnh:", errApi?.message);
      raw = await readViaStaticFile();
      source = raw.source;
    }

    const all = raw.movies.map(normalizeMovie);
    const verdicts = await Promise.all(all.map((m) => isRenderable(m).catch(() => false)));
    const movies = all.filter((_, i) => verdicts[i]);

    // Ảnh diễn viên / đạo diễn: đặt sẵn null để actorImage() dùng được ngay,
    // sau đó dò ảnh thật ở nền để không chặn lần vẽ đầu tiên.
    const people = new Set();
    for (const m of movies) {
      if (m.director) people.add(m.director);
      m.actors.forEach((a) => people.add(a));
    }
    const avatars = new Map([...people].map((name) => [name, null]));

    return { movies, genres: raw.genres, reviews: raw.reviews, users: raw.users, avatars, source };
  })().catch((err) => {
    catalogPromise = null; // cho phép thử lại ở lần gọi sau
    throw err;
  });

  // Dò ảnh diễn viên nền, giới hạn số request đồng thời.
  catalogPromise
    .then((catalog) => resolveAvatars(catalog))
    .catch(() => {});

  return catalogPromise;
}

/** Sự kiện báo các ảnh diễn viên vừa được tìm thấy thêm. */
export const AVATARS_RESOLVED = "movie-data:avatars";

/**
 * Dò ảnh thật cho toàn bộ người trong catalogue, chạy nền sau khi trang đã vẽ.
 * Mỗi lần tìm thêm ảnh sẽ bắn AVATARS_RESOLVED để giao diện vẽ lại.
 */
async function resolveAvatars(catalog) {
  const names = [...catalog.avatars.keys()].filter((n) => !catalog.avatars.get(n));
  if (!names.length) return;

  const CONCURRENCY = 4;
  let added = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < names.length) {
      const name = names[cursor++];
      // eslint-disable-next-line no-await-in-loop
      const url = await findActorAvatar(name);
      if (url) {
        catalog.avatars.set(name, url);
        added++;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, names.length) }, worker));
  if (added) window.dispatchEvent(new CustomEvent(AVATARS_RESOLVED, { detail: { count: added } }));
}

/* ------------------------------------------------------------------ *
 * 6. TRA CỨU
 * ------------------------------------------------------------------ */

/** Lấy phim theo id từ query string (?id=3). Trả null nếu không có/không tìm thấy. */
export function findMovie(catalog, id) {
  if (id === null || id === undefined || String(id).trim() === "") return null;
  return catalog.movies.find((m) => sameId(m.id, id)) || null;
}

/** Gợi ý phim tương tự: cùng thể loại trước, rồi bù đủ số lượng. */
export function findRelated(catalog, movie, limit = 5) {
  if (!movie) return [];
  const others = catalog.movies.filter((m) => !sameId(m.id, movie.id));
  const sameGenre = others.filter((m) =>
    m.genreIds.some((g) => movie.genreIds.includes(g)),
  );
  const sameDecade = others.filter(
    (m) => movie.decade && m.decade === movie.decade && !sameGenre.includes(m),
  );
  const rest = others.filter((m) => !sameGenre.includes(m) && !sameDecade.includes(m));
  return [...sameGenre, ...sameDecade, ...rest].slice(0, limit);
}

/** Tên thể loại từ mảng id trong db.json, tra bảng `genres`. */
export function genreNames(movie, genres) {
  if (!movie?.genreIds?.length) return [];
  return movie.genreIds
    .map((gid) => genres.find((g) => sameId(g.id, gid))?.name)
    .filter(Boolean);
}

/** Điểm trung bình từ bảng `reviews`. Trả null nếu chưa có đánh giá nào. */
export function averageRating(movie, reviews) {
  if (!movie) return null;
  const ratings = (reviews || [])
    .filter((r) => sameId(r.movieId, movie.id))
    .map((r) => toNumber(r.rating))
    .filter((n) => n !== null);
  if (!ratings.length) return null;
  return ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
}

/** Số lượt bình chọn tương ứng với điểm trung bình. */
export function ratingCount(movie, reviews) {
  if (!movie) return 0;
  return (reviews || []).filter((r) => sameId(r.movieId, movie.id)).length;
}

/* ------------------------------------------------------------------ *
 * 7. ĐỊNH DẠNG HIỂN THỊ
 * ------------------------------------------------------------------ */

/** 166 -> "2 giờ 46 phút" */
export function formatDuration(minutes) {
  const total = toNumber(minutes);
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
}

/** 11320 -> "11,3k" ; 1132000 -> "1,1tr" */
export function formatViews(views) {
  const n = toNumber(views) ?? 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} triệu`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

/** Đường dẫn trang chi tiết — dùng chung cho mọi thẻ phim. */
export const detailUrl = (id) => `/movie-detail?id=${encodeURIComponent(id)}`;

/**
 * Nhãn chất lượng lấy đúng từ db.json.
 *
 * db.json chỉ có "hd" cho Spider-Man và The Batman, các phim còn lại không có
 * trường quality — nên trả chuỗi rỗng thay vì đoán, tránh hiện thông tin sai.
 * @returns {string}
 */
export function qualityLabel(movie) {
  return String(movie?.quality ?? "")
    .trim()
    .toUpperCase();
}

/* ------------------------------------------------------------------ *
 * 8. ẢNH DIỄN VIÊN / ĐẠO DIỄN
 * ------------------------------------------------------------------ */

/** "Timothee Chalamet" -> "chalamet" (khớp tên file public/images/actors/). */
function actorSlug(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt / tiếng Pháp
    .replace(/[^a-zA-Z\s'-]/g, "")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .pop()
    ?.toLowerCase() || "";
}

const actorProbeCache = new Map();

/**
 * Tìm ảnh thật của diễn viên/đạo diễn trong public/images/actors/.
 * @returns {Promise<string|null>}
 */
export async function findActorAvatar(name) {
  const slug = actorSlug(name);
  if (!slug) return null;
  if (actorProbeCache.has(slug)) return actorProbeCache.get(slug);

  const task = (async () => {
    for (const candidate of [slug, `${slug}-1`, `${slug}-2`]) {
      const url = `${ACTOR_DIR}/${candidate}.jpg`;
      // eslint-disable-next-line no-await-in-loop
      if (await probeImage(url)) return url;
    }
    return null;
  })();

  actorProbeCache.set(slug, task);
  return task;
}

/** Ảnh diễn viên đã xác minh, hoặc placeholder chữ cái đầu. */
export const actorImage = (catalog, name) =>
  catalog?.avatars?.get(name) || avatarFallback(name);
