/**
 * mock-data.js — Bộ dữ liệu mẫu cho trang Cá nhân.
 *
 * Cấu trúc ở đây CỐ TÝ GIỐNG hệt dữ liệu trả về từ API
 * (bảng `movies`, `histories`, `favorites`, `reviews`, `users`...).
 * Nhờ vậy khi backend json-server sẵn sàng, chỉ cần thay `createSeed()`
 * bằng `service.loadDashboard()` — không phải sửa component nào.
 */

const MOVIES = [
  // --- Phim Việt ---
  { id: "v01", title: "Người Giả Ma", slug: "nguoi-gia-ma", poster: "images/movies/admin-nguoi-gia-ma.jpg", year: 2025, duration: 112, quality: "FHD", score: 8.2, type: "movie", genres: ["Kinh dị", "Tâm lý"] },
  { id: "v02", title: "Vực Thẳm Vô Cực", slug: "vuc-tham-vo-cuc", poster: "images/movies/admin-vuc-tham-vo-cuc.jpg", year: 2024, duration: 128, quality: "4K", score: 7.6, type: "movie", genres: ["Hành động", "Phiêu lưu"] },
  { id: "v03", title: "Thợ Săn Ma Đêm", slug: "tho-san-ma-dem", poster: "images/movies/admin-tho-san-ma-dem.jpg", year: 2025, duration: 104, quality: "FHD", score: 7.1, type: "movie", genres: ["Hành động", "Kinh dị"] },
  { id: "v04", title: "Hai Chuông Tử Thần", slug: "hai-chuong-tu-than", poster: "images/movies/admin-hai-chuong-tu-than.jpg", year: 2024, duration: 96, quality: "HD", score: 6.9, type: "movie", genres: ["Tâm lý", "Kinh dị"] },
  { id: "v05", title: "Áo Anh Cuối Cùng", slug: "ao-anh-cuoi-cung", poster: "images/movies/admin-ao-anh-cuoi-cung.jpg", year: 2025, duration: 118, quality: "FHD", score: 7.8, type: "movie", genres: ["Tình cảm", "Chính sản"] },
  { id: "v06", title: "Mật Vụ Bóng Đêm", slug: "mat-vu-bong-dem", poster: "images/movies/admin-mat-vu-bong-dem.jpg", year: 2024, duration: 132, quality: "4K", score: 8.0, type: "movie", genres: ["Hành động", "Tâm lý"] },
  { id: "v07", title: "Thành Phố Vô Tội", slug: "thanh-pho-vo-toi", poster: "images/movies/admin-thanh-pho-vo-toi.jpg", year: 2023, duration: 124, quality: "FHD", score: 7.4, type: "movie", genres: ["Tình cảm", "Tâm lý"] },
  { id: "v08", title: "Bí Ẩn Đao Đầu Lâu", slug: "bi-an-dao-dau-lau", poster: "images/movies/admin-bi-an-dao-dau-lau.jpg", year: 2025, duration: 108, quality: "HD", score: 6.8, type: "movie", genres: ["Kinh dị", "Trinh thám"] },

  // --- Phim quốc tế ---
  { id: "m01", title: "Avengers: Endgame", slug: "avengers-endgame", poster: "images/movies/endgame.jpg", year: 2019, duration: 181, quality: "4K", score: 8.7, type: "movie", genres: ["Hành động", "Viễn tưởng"] },
  { id: "m02", title: "Spider-Man: No Way Home", slug: "spider-man-no-way-home", poster: "images/movies/spiderman.jpg", year: 2021, duration: 148, quality: "4K", score: 8.4, type: "movie", genres: ["Hành động", "Phiêu lưu"] },
  { id: "m03", title: "Interstellar", slug: "interstellar", poster: "images/movies/interstellar.jpg", year: 2014, duration: 169, quality: "4K", score: 8.9, type: "movie", genres: ["Viễn tưởng", "Cổ điển"] },
  { id: "m04", title: "Your Name", slug: "your-name", poster: "images/movies/your-name.jpg", year: 2016, duration: 106, quality: "FHD", score: 8.6, type: "movie", genres: ["Hoạt hình", "Tình cảm"] },
  { id: "m05", title: "The Conjuring", slug: "the-conjuring", poster: "images/movies/conjuring.jpg", year: 2013, duration: 112, quality: "FHD", score: 7.7, type: "movie", genres: ["Kinh dị"] },
  { id: "m06", title: "Toy Story 4", slug: "toy-story-4", poster: "images/movies/toy-story-4.jpg", year: 2019, duration: 100, quality: "FHD", score: 7.9, type: "movie", genres: ["Hoạt hình", "Gia đình"] },
  { id: "m07", title: "Dune: Part Two", slug: "dune-part-two", poster: "images/movies/dune-2.jpg", year: 2024, duration: 166, quality: "4K", score: 8.5, type: "movie", genres: ["Hành động", "Viễn tưởng"] },
  { id: "m08", title: "La La Land", slug: "la-la-land", poster: "images/movies/la-la-land.jpg", year: 2016, duration: 128, quality: "FHD", score: 8.1, type: "movie", genres: ["Tình cảm", "Nhạc"] },
  { id: "m09", title: "Inside Out 2", slug: "inside-out-2", poster: "images/movies/inside-out-2.jpg", year: 2024, duration: 96, quality: "4K", score: 7.8, type: "movie", genres: ["Hoạt hình", "Gia đình"] },
  { id: "m10", title: "The Batman", slug: "the-batman", poster: "images/movies/the-batman.jpg", year: 2022, duration: 176, quality: "4K", score: 8.0, type: "movie", genres: ["Hành động", "Trinh thám"] },
  { id: "m11", title: "Blade Runner 2049", slug: "blade-runner-2049", poster: "images/movies/blade-runner-2049.jpg", year: 2017, duration: 164, quality: "4K", score: 8.3, type: "movie", genres: ["Viễn tưởng", "Cổ điển"] },
  { id: "m12", title: "Inception", slug: "inception", poster: "images/movies/inception.jpg", year: 2010, duration: 148, quality: "FHD", score: 8.8, type: "movie", genres: ["Hành động", "Viễn tưởng"] },
  { id: "m13", title: "The Dark Knight", slug: "the-dark-knight", poster: "images/movies/dark-knight.jpg", year: 2008, duration: 152, quality: "4K", score: 9.0, type: "movie", genres: ["Hành động", "Tâm lý"] },
  { id: "m14", title: "Joker", slug: "joker", poster: "images/movies/joker.jpg", year: 2019, duration: 122, quality: "FHD", score: 8.4, type: "movie", genres: ["Tâm lý", "Chính sản"] },
  { id: "m15", title: "The Matrix", slug: "the-matrix", poster: "images/movies/matrix.jpg", year: 1999, duration: 136, quality: "4K", score: 8.7, type: "movie", genres: ["Viễn tưởng", "Hành động"] },
  { id: "m16", title: "Oppenheimer", slug: "oppenheimer", poster: "images/movies/oppenheimer.jpg", year: 2023, duration: 180, quality: "4K", score: 8.6, type: "movie", genres: ["Chính sản", "Cổ điển"] },
  { id: "m17", title: "The Shawshank Redemption", slug: "the-shawshank-redemption", poster: "images/movies/shawshank.jpg", year: 1994, duration: 142, quality: "FHD", score: 9.1, type: "movie", genres: ["Chính sản", "Cổ điển"] },
  { id: "m18", title: "Arrival", slug: "arrival", poster: "images/movies/arrival.jpg", year: 2016, duration: 116, quality: "FHD", score: 8.2, type: "movie", genres: ["Viễn tưởng", "Tâm lý"] },
  { id: "m19", title: "Crimson Nocturne", slug: "crimson-nocturne", poster: "images/movies/crimson-nocturne.jpg", year: 2023, duration: 108, quality: "FHD", score: 7.5, type: "movie", genres: ["Hành động", "Trinh thám"] },
  { id: "m20", title: "Ghost in the Shell", slug: "ghost-in-the-shell", poster: "images/movies/ghost-in-the-shell.jpg", year: 2017, duration: 107, quality: "4K", score: 7.6, type: "movie", genres: ["Hoạt hình", "Viễn tưởng"] },
  { id: "m21", title: "Spider-Man: Into the Spider-Verse", slug: "spider-verse", poster: "images/movies/spiderverse.jpg", year: 2018, duration: 117, quality: "4K", score: 8.4, type: "movie", genres: ["Hoạt hình", "Hành động"] },
  { id: "m22", title: "The Godfather", slug: "the-godfather", poster: "images/movies/godfather.jpg", year: 1972, duration: 175, quality: "FHD", score: 9.2, type: "movie", genres: ["Tội phạm", "Cổ điển"] },
  { id: "m23", title: "The Abyss", slug: "the-abyss", poster: "images/movies/the-abyss.jpg", year: 1989, duration: 140, quality: "FHD", score: 7.3, type: "movie", genres: ["Viễn tưởng", "Cổ điển"] },
  { id: "m24", title: "The Fast and the Furious: Tokyo Drift", slug: "tokyo-drift", poster: "images/movies/tokyo-drift.jpg", year: 2006, duration: 144, quality: "HD", score: 6.6, type: "movie", genres: ["Hành động", "Hài"] },
  { id: "m25", title: "The Lord of the Rings: The Return of the King", slug: "return-of-the-king", poster: "images/movies/return-of-the-king.jpg", year: 2003, duration: 201, quality: "4K", score: 9.0, type: "movie", genres: ["Phiêu lưu", "Cổ điển"] },
  { id: "m26", title: "The Last Verdict", slug: "the-last-verdict", poster: "images/movies/the-last-verdict.jpg", year: 2024, duration: 126, quality: "FHD", score: 7.9, type: "movie", genres: ["Tâm lý", "Chính sản"] },
  { id: "m27", title: "Dune", slug: "dune", poster: "images/movies/dune-poster.jpg", year: 2021, duration: 155, quality: "4K", score: 8.0, type: "movie", genres: ["Viễn tưởng", "Cổ điển"] },

  // --- Phim bộ (nhiều tập) ---
  { id: "s01", title: "House of the Dragon", slug: "house-of-the-dragon", poster: "images/movies/house-of-the-dragon.jpg", year: 2022, duration: 62, quality: "4K", score: 8.5, type: "series", totalEpisodes: 18, genres: ["Cổ điển", "Chính sản"] },
  { id: "s02", title: "Kẻ Trộm Ký Ức", slug: "ke-trom-ky-uc", poster: "images/movies/admin-ke-trom-ky-uc.jpg", year: 2024, duration: 48, quality: "FHD", score: 7.7, type: "series", totalEpisodes: 12, genres: ["Hành động", "Trinh thám"] },
  { id: "s03", title: "Thanh Phố Vô Tội", slug: "thanh-pho-vo-toi-phim-bo", poster: "images/movies/admin-thanh-pho-vo-toi.jpg", year: 2023, duration: 45, quality: "FHD", score: 7.2, type: "series", totalEpisodes: 10, genres: ["Tình cảm", "Tâm lý"] },
  { id: "s04", title: "Kỳ Sinh Trùng", slug: "ky-sinh-trung", poster: "images/movies/admin-ky-sinh-trung.jpg", year: 2024, duration: 44, quality: "4K", score: 7.4, type: "series", totalEpisodes: 9, genres: ["Kinh dị", "Viễn tưởng"] },
  { id: "s05", title: "Biệt Đội Đột Kích", slug: "biet-doi-dot-kich", poster: "images/movies/admin-biet-doi-dot-kich.jpg", year: 2024, duration: 50, quality: "FHD", score: 7.0, type: "series", totalEpisodes: 16, genres: ["Hành động", "Chiến tranh"] },
  { id: "s06", title: "Ẩn Mặt Tầng 13", slug: "an-mat-tang-13", poster: "images/movies/admin-an-mang-tang-13.jpg", year: 2025, duration: 42, quality: "HD", score: 6.8, type: "series", totalEpisodes: 8, genres: ["Kinh dị", "Tâm lý"] },
];

/* ------------------------------------------------------------------ *
 * PRNG tất định — đảm bảo số liệu mẫu luôn giống nhau giữa các lần tải.
 * ------------------------------------------------------------------ */
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_SIZE = 128;
const TARGET_WATCH_MINUTES = 86 * 60; // "86h" trong thẻ thống kê
const BASE_TIME = new Date("2026-09-28T21:30:00").getTime();

function buildHistory() {
  const random = mulberry32(20250928);

  const rows = Array.from({ length: HISTORY_SIZE }, (_, index) => {
    const movie = MOVIES[Math.floor(random() * MOVIES.length)];
    const totalSeconds = movie.duration * 60;
    const fraction = 0.12 + random() * 0.5; // 12% – 62%

    return {
      id: `h${String(index + 1).padStart(3, "0")}`,
      movieId: movie.id,
      positionSeconds: Math.round(totalSeconds * fraction),
      durationSeconds: totalSeconds,
      episode: movie.type === "series" ? 1 + Math.floor(random() * (movie.totalEpisodes - 1)) : 1,
      totalEpisodes: movie.totalEpisodes || 1,
      watchedAt: new Date(BASE_TIME - index * 5.4e7).toISOString(),
    };
  });

  // Cân lại tổng thời lượng đã xem về đúng 86h mà vẫn giữ mọi tỉ lệ hợp lý.
  const total = rows.reduce((sum, row) => sum + row.positionSeconds, 0);
  const targetSeconds = TARGET_WATCH_MINUTES * 60;
  const scale = targetSeconds / total;

  return rows.map((row) => ({
    ...row,
    positionSeconds: Math.min(
      Math.round(row.durationSeconds * 0.92),
      Math.round(row.positionSeconds * scale),
    ),
  }));
}

function buildContinueWatching() {
  return [
    { id: "cw1", movieId: "s01", episode: 8, positionSeconds: 25 * 60 + 12, durationSeconds: 62 * 60, updatedAt: "2026-09-28T20:10:00" },
    { id: "cw2", movieId: "s02", episode: 5, positionSeconds: 20 * 60 + 8, durationSeconds: 48 * 60, updatedAt: "2026-09-27T22:35:00" },
    { id: "cw3", movieId: "m07", episode: 1, positionSeconds: 96 * 60, durationSeconds: 166 * 60, updatedAt: "2026-09-27T19:02:00" },
    { id: "cw4", movieId: "s04", episode: 7, positionSeconds: 31 * 60 + 40, durationSeconds: 44 * 60, updatedAt: "2026-09-26T23:20:00" },
    { id: "cw5", movieId: "m03", episode: 1, positionSeconds: 148 * 60, durationSeconds: 169 * 60, updatedAt: "2026-09-25T21:44:00" },
    { id: "cw6", movieId: "s03", episode: 3, positionSeconds: 22 * 60 + 30, durationSeconds: 45 * 60, updatedAt: "2026-09-24T20:55:00" },
  ];
}

function buildFavorites() {
  return [
    "m01", "m03", "m07", "m12", "m13", "m04", "m09", "m26",
    "v01", "v02", "v05", "m11", "m16", "m25", "s01", "m17",
    "m22", "v06", "m19", "s02", "m08", "m14", "m15", "m21",
  ].map((movieId, index) => ({
      id: `f${String(index + 1).padStart(3, "0")}`,
      movieId,
      createdAt: new Date(BASE_TIME - index * 1.1e8).toISOString(),
    }));
}

function buildWatchLater() {
  return [
    "m10", "m18", "m21", "v03", "m06", "s05", "m20", "v04",
    "m23", "s06", "v07", "m24", "v08", "m27", "s04", "m05",
  ].map((movieId, index) => ({
    id: `w${String(index + 1).padStart(3, "0")}`,
    movieId,
    createdAt: new Date(BASE_TIME - index * 9e7).toISOString(),
  }));
}

function buildReviews() {
  return [
    { id: "r01", movieId: "m13", rating: 5, comment: "Một kiệt tác bất tử của điện ảnh. Nhân vật Joker đến nay vẫn là chuẩn mực cho vai phản diện.", createdAt: "2026-08-30T21:10:00" },
    { id: "r02", movieId: "m03", rating: 5, comment: "Hình ảnh và âm thanh đẹp đến mức không thể tả. Xem hai lần vẫn không chán.", createdAt: "2026-09-02T20:24:00" },
    { id: "r03", movieId: "v01", rating: 4, comment: "Diễn xuất tốt, cốt truyện có chút twist ở cuối. Rất đáng để xem.", createdAt: "2026-09-05T19:02:00" },
    { id: "r04", movieId: "m12", rating: 5, comment: "Kịch bản lồng nhiều tầng, xem lại vẫn thấy chi tiết mới.", createdAt: "2026-09-11T22:41:00" },
    { id: "r05", movieId: "m04", rating: 4, comment: "Dễ xem, phim hoạt hình đẹp mắt. Chỉ hơi ngắn.", createdAt: "2026-09-18T20:15:00" },
  ];
}

const DEFAULT_SETTINGS = {
  notifyNewMovie: true,
  notifyNewEpisode: true,
  autoplay: true,
  autoHd: true,
  emailDigest: false,
  showWatchHistory: false,
  profilePublic: true,
  reduceMotion: false,
};

/**
 * Tạo dữ liệu mẫu cho một tài khoản.
 * @param {string|number} userId
 */
export function createSeed(userId) {
  const id = String(userId ?? "guest");

  return {
    profile: {
      id,
      fullName: "Nguyễn Văn A",
      username: "nguyenvana",
      email: "example@movief.vn",
      phone: "0987654321",
      birthday: "1995-08-15",
      gender: "nam",
      bio: "Khám phá thế giới điện ảnh cùng MovieF.",
      avatar: "",
      role: "Thành viên",
      status: "active",
      joinedAt: "2025-01-15T08:30:00",
    },
    settings: { ...DEFAULT_SETTINGS },
    continueWatching: buildContinueWatching(),
    favorites: buildFavorites(),
    watchLater: buildWatchLater(),
    history: buildHistory(),
    reviews: buildReviews(),
  };
}

export { MOVIES as MOCK_MOVIES, DEFAULT_SETTINGS };
