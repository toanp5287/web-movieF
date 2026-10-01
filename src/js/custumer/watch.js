/**
 * watch.js  (/watch?id=<id>)
 *
 * Trang xem phim của MovieF.
 *
 * Trước đây watch.html là một khối giao diện tĩnh: khung 16:9 trong đó là một
 * <img> "keyframe" từ Google, các nút điều khiển không gắn handler, thanh tiến
 * trình bị tự xóa ngay ở lần timeupdate đầu tiên... nên không có video nào
 * phát được. Phiên bản này dùng <video> thật với bộ điều khiển gốc của trình
 * duyệt và chỉ bổ sung những thứ thật sự cần:
 *
 *   1. đọc ?id= rồi tìm phim trong data/db.json (không tự chế dữ liệu),
 *   2. dò file video riêng của phim trong data/db.json — đường dẫn trong db
 *      đang viết lộn xộn ("../videos/x.mp4", "videos/x.mp4", "/videos/x.mp4"),
 *   3. phim chưa có nguồn riêng thì dùng chung video mẫu của MovieF,
 *   4. hiện trạng thái tải / buffering / lỗi + nút thử lại, không gọi load()
 *      lặp lại và không tự phát,
 *   5. đổi phim chỉ thay src của MỘT player duy nhất, không tạo player mới.
 *
 * Lưu ý: #progressTrackContainer và #videoProgressBar được giữ lại (đặt DƯỚI
 * trình phát, không che thanh điều khiển gốc) vì src/js/custumer/history.js đọc
 * đúng hai id đó để tính tiến độ xem đã lưu.
 */

import {
  averageRating,
  bindImageFallback,
  detailUrl,
  escapeHtml,
  findMovie,
  findRelated,
  formatDuration,
  formatViews,
  genreNames,
  loadCatalog,
  qualityLabel,
  ratingCount,
} from "./movie-data.js";

import { renderMovieCards } from "./movie-card.js";

/* ------------------------------------------------------------------ *
 * 1. TÌM FILE VIDEO THẬT
 * ------------------------------------------------------------------ */

/**
 * Video mẫu dùng chung cho các phim chưa có nguồn riêng.
 *
 * Đây chính là file video của phim Interstellar (id 3) — phim đang chạy ở
 * banner trang chủ — nên đã được kiểm tra là tồn tại và máy chủ phục vụ được
 * (HTTP 206, Accept-Ranges: bytes).
 */
const SHARED_SAMPLE_VIDEO = "/videos/phim-demo-3.mp4";

/**
 * db.json lưu đường dẫn video không nhất quán, ví dụ:
 *   "../videos/phim-demo-3.mp4"   (đi vào thư mục cha rồi mới vào videos/)
 *   "videos/dune-2.mp4"           (không có dấu / ở đầu)
 *   "/videos/no-video.mp4"        (dấu / ở đầu)
 *
 * normalizeMovie() của movie-data đã chạy mediaUrl() nên giá trị nhận được lại
 * bị gắn thêm "/" ở đầu -> "../videos/x.mp4" thành "/../videos/x.mp4". Vì vậy
 * phải bỏ lặp lại cả "/" lẫn "../" cho tới khi sạch, nếu không sẽ còn sót
 * "/../" và chỉ chạy được nhờ trình duyệt tự gộp đường dẫn.
 */
function normalizeVideoPath(value) {
  let path = String(value ?? "").trim();
  let previous;
  do {
    previous = path;
    path = path.replace(/^(?:\/|\.\.\/)+/, "");
  } while (path !== previous);
  return path ? `/${path}` : "";
}

function videoCandidates(movie) {
  const raw = [movie.video, movie.videoUrl, movie.src]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const urls = new Set();
  for (const value of raw) {
    const clean = normalizeVideoPath(value);
    if (!clean) continue;
    urls.add(clean);
    // Trường hợp chỉ ghi tên file, thử gắn vào /videos/.
    if (!clean.includes("/")) urls.add(`/videos/${clean.slice(1)}`);
  }
  return [...urls];
}

/** File "trình chiếu" dùng để báo chưa có video, không phải video thật. */
const isPlaceholder = (url) => /\/no-video\.mp4$/i.test(url);

const videoProbeCache = new Map();

/**
 * Kiểm tra URL có thực sự trỏ tới một file video.
 *
 * Bắt buộc phải xem content-type: Vite (và mọi SPA fallback) trả HTTP 200 +
 * "text/html" cho đường dẫn không tồn tại, nên chỉ kiểm tra status sẽ tưởng là
 * có video rồi màn hình đen mà không hiện lỗi.
 *
 * @returns {Promise<boolean>}
 */
function probeVideo(url) {
  if (!url) return Promise.resolve(false);
  if (videoProbeCache.has(url)) return videoProbeCache.get(url);

  const task = (async () => {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
      if (!res.ok) return false;
      const type = (res.headers.get("content-type") || "").toLowerCase();
      return type.startsWith("video/") || type.includes("octet-stream");
    } catch {
      // Không xác định được: cứ thử cho player tự báo lỗi, đừng chặn người dùng.
      return true;
    }
  })();

  videoProbeCache.set(url, task);
  return task;
}

/**
 * Chọn nguồn phát cho một phim.
 *
 * Ưu tiên video riêng của phim nếu file tồn tại; phim chưa có nguồn riêng thì
 * dùng chung video mẫu. Không dò file mẫu vì đã biết chắc nó tồn tại — dò thêm
 * chỉ chậy thêm một vòng chờ trước khi phát.
 *
 * @returns {Promise<{url: string, isSample: boolean}>}
 */
async function resolveVideoSource(movie) {
  for (const url of videoCandidates(movie)) {
    if (isPlaceholder(url)) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await probeVideo(url)) return { url, isSample: false };
  }
  return { url: SHARED_SAMPLE_VIDEO, isSample: true };
}

/* ------------------------------------------------------------------ *
 * 2. HIỂN THỊ THÔNG TIN PHIM
 * ------------------------------------------------------------------ */

const put = (name, value) => {
  const el = document.querySelector(`[data-bind='${name}']`);
  if (el && value) el.textContent = value;
};

/** "2024-03-11" / ISO string -> "11/03/2024" */
function formatDate(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function fillMovieInfo(movie, catalog, source) {
  const year = Number(movie.year) || 0;
  const genres = genreNames(movie, catalog.genres);
  const rating = averageRating(movie, catalog.reviews);
  const votes = ratingCount(movie, catalog.reviews);
  const quality = qualityLabel(movie);

  document.title = year ? `${movie.title} (${year}) - Xem phim` : `${movie.title} - Xem phim`;

  put("nav-title", movie.title);
  put("movie-title", movie.title);
  put("movie-year", year ? String(year) : "");
  put("movie-duration", formatDuration(movie.duration));
  put("movie-country", movie.country);
  put("movie-quality", quality);
  put("movie-description", movie.description);
  put("movie-director", movie.director);
  put("movie-actors", movie.actors.join(", "));
  put("movie-country-side", movie.country);
  put("movie-created", formatDate(movie.createdAt));
  put("movie-video-source", source.isSample ? "Video mẫu MovieF" : "Nguồn riêng của phim");

  // Điểm: reviews dùng thang 1-5, hiển thị ra thang 10 cho khớp giao diện.
  const ratingBox = document.querySelector("[data-bind='movie-rating']");
  if (ratingBox) {
    ratingBox.innerHTML =
      rating === null
        ? `<span class="text-on-surface-variant">Chưa có đánh giá</span>`
        : `
          <span class="material-symbols-outlined text-secondary" style="font-variation-settings: &quot;FILL&quot; 1">star</span>
          <span class="font-title-sm text-title-sm text-on-surface">${(rating * 2).toFixed(1)}</span>
          <span class="text-on-surface-variant">${formatViews(movie.views)} lượt xem • ${votes} đánh giá</span>`;
  }

  const genreBox = document.querySelector("[data-bind='movie-genres']");
  if (genreBox) {
    genreBox.innerHTML = genres
      .map(
        (name) => `
          <span class="rounded bg-surface-container px-2 py-0.5 font-label-md text-label-md text-on-surface-variant">${escapeHtml(
            name,
          )}</span>`,
      )
      .join("");
  }
}

/** Thông báo "không tìm thấy phim" — hiện thay cả khối player. */
function showNotFound(title, reason) {
  document.getElementById("movieBody")?.classList.add("hidden");
  const box = document.getElementById("movieNotFound");
  if (!box) return;
  put("notfound-title", title);
  put("notfound-reason", reason);
  box.classList.remove("hidden");
}

/* ------------------------------------------------------------------ *
 * 3. TRÌNH PHÁT
 * ------------------------------------------------------------------ */

const player = {
  video: null,
  track: null,
  bar: null,
  head: null,
  currentTime: null,
  duration: null,
  status: null,
  loading: null,
  loadingText: null,
  error: null,
  errorText: null,
  retry: null,
  /** src hiện tại — dùng để không gán lại src khi điều hành chưa đổi. */
  src: "",
  rafId: 0,
  lastRatio: -1,
  lastTime: -1,
  lastDuration: -1,
};

/** Định dạng 0:07 / 1:02:03 cho hiển thị. */
const clock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

function setOverlay({ loading = "", error = "" }) {
  const { loading: loadBox, loadingText, error: errorBox, errorText } = player;

  loadBox?.classList.toggle("hidden", !loading);
  if (loading && loadingText) loadingText.textContent = loading;

  errorBox?.classList.toggle("hidden", !error);
  if (error && errorText) errorText.textContent = error;
}

/** Thông điệp cho mã lỗi của HTMLMediaElement. */
function describeMediaError(video) {
  switch (video?.error?.code) {
    case 1:
      return "Tải video bị gián đoạn. Kiểm tra kết nối mạng rồi thử lại.";
    case 2:
      return "Máy chủ đã ngắt kết nối khi đang tải video.";
    case 3:
      return "Không giải mã được video này: trình duyệt có thể chưa hỗ trợ codec của tệp.";
    case 4:
      return "Định dạng hoặc đường dẫn video không hợp lệ.";
    default:
      return "Video đang tạm thời không tải được. Vui lòng thử lại.";
  }
}

/**
 * Cập nhật thanh tiến trình + hai đồng hồ.
 *
 * Ghi trong requestAnimationFrame và chỉ khi giá trị thực sự đổi: timeupdate bắn
 * 4-10 lần/giây, mỗi lần sửa style/textContent đều là layout work không cần
 * thiết — đây là một trong các nguyên nhân làm giao diện "giật" khi tua.
 */
function syncProgress() {
  const { video, bar, head, track, currentTime, duration } = player;
  if (!video) return;

  const total = Number(video.duration) || 0;
  const position = Number(video.currentTime) || 0;
  const ratio = total ? Math.min(1, Math.max(0, position / total)) : 0;
  const percent = ratio * 100;

  if (bar && Math.abs(percent - player.lastRatio) > 0.05) {
    player.lastRatio = percent;
    bar.style.width = `${percent}%`;
    track?.setAttribute("aria-valuenow", String(Math.round(percent)));
    if (head) head.style.left = `${percent}%`;
  }
  if (currentTime && Math.floor(position) !== player.lastTime) {
    player.lastTime = Math.floor(position);
    currentTime.textContent = clock(position);
  }
  if (duration && Math.floor(total) !== player.lastDuration) {
    player.lastDuration = Math.floor(total);
    duration.textContent = clock(total);
  }
}

function scheduleSync() {
  if (player.rafId) return;
  player.rafId = requestAnimationFrame(() => {
    player.rafId = 0;
    syncProgress();
  });
}

/** Chuyển video.currentTime theo tỉ lệ trên thanh tiến trình. */
function seekToRatio(ratio) {
  const { video } = player;
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const clamped = Math.min(1, Math.max(0, ratio));
  video.currentTime = clamped * video.duration;
  syncProgress();
}

function ratioFromPointer(event) {
  const box = player.track?.getBoundingClientRect();
  if (!box || !box.width) return 0;
  return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
}

/** Gắn listener đúng MỘT lần cho phần tử player vốn đã nằm sẵn trong HTML. */
function bindPlayer() {
  const video = document.getElementById("watchVideo");
  if (!video || player.video) return video;

  player.video = video;
  player.track = document.getElementById("progressTrackContainer");
  player.bar = document.getElementById("videoProgressBar");
  player.head = document.querySelector("[data-bind='progress-head']");
  player.currentTime = document.getElementById("videoCurrentTime");
  player.duration = document.getElementById("videoDuration");
  player.status = document.getElementById("videoStatus");
  player.loading = document.getElementById("videoLoading");
  player.loadingText = document.getElementById("videoLoadingText");
  player.error = document.getElementById("videoError");
  player.errorText = document.getElementById("videoErrorText");
  player.retry = document.getElementById("videoRetryBtn");

  video.addEventListener("loadstart", () => {
    setOverlay({ loading: "Đang tải video…" });
  });

  video.addEventListener("loadedmetadata", () => {
    setOverlay({});
    syncProgress();
  });

  video.addEventListener("canplay", () => {
    setOverlay({});
    syncProgress();
  });

  video.addEventListener("waiting", () => {
    setOverlay({ loading: "Đang tải thêm dữ liệu để phát mượt…" });
  });

  video.addEventListener("stalled", () => {
    setOverlay({ loading: "Mạng đang chậm, đang tải thêm dữ liệu…" });
  });

  video.addEventListener("playing", () => {
    setOverlay({});
  });

  video.addEventListener("timeupdate", scheduleSync);
  video.addEventListener("seeked", scheduleSync);
  video.addEventListener("durationchange", syncProgress);

  video.addEventListener("error", () => {
    setOverlay({ error: describeMediaError(video) });
    if (player.status) player.status.textContent = "";
  });

  player.track?.addEventListener("click", (event) => {
    seekToRatio(ratioFromPointer(event));
  });

  player.track?.addEventListener("keydown", (event) => {
    const { video } = player;
    const total = Number(video?.duration);
    if (!video || !Number.isFinite(total) || total <= 0) return;

    const step = event.shiftKey ? 30 : 5;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      video.currentTime = Math.min(total, video.currentTime + step);
      syncProgress();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - step);
      syncProgress();
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToRatio(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekToRatio(1);
    }
  });

  // Nút "Thử lại": chỉ gọi load() một lần cho mỗi lần bấm, không có vòng lặp.
  player.retry?.addEventListener("click", () => {
    setOverlay({ loading: "Đang thử tải lại video…" });
    video.load();
  });

  return video;
}

/**
 * Gắn nguồn phát. Chỉ gán src khi URL thực sự khác nguồn đang chạy, nên đổi ID
 * phim không tạo ra player mới và không tải lại cùng một file.
 */
function mountPlayer(url) {
  const video = bindPlayer();
  if (!video) return null;

  setOverlay({ loading: "Đang tải video…" });
  syncProgress();

  if (player.src !== url) {
    player.src = url;
    video.src = url;
  }

  // Không tự phát: trình duyệt chặn autoplay có tiếng, người dùng bấm play.
  video.pause();
  return video;
}

/* ------------------------------------------------------------------ *
 * 4. DẢI "PHIM LIÊN QUAN"
 * ------------------------------------------------------------------ */

function renderRelated(catalog, movie) {
  const rail = document.getElementById("relatedRail");
  if (!rail) return;
  const related = findRelated(catalog, movie, 8);
  if (!related.length) {
    rail.innerHTML = "";
    return;
  }
  renderMovieCards(rail, related, catalog, { toWatch: true, showGenre: false });
  bindImageFallback(rail);
}

function bindRelatedRail() {
  const rail = document.getElementById("relatedRail");
  if (!rail) return;
  document.querySelectorAll("[data-rail]").forEach((button) => {
    button.addEventListener("click", () => {
      rail.scrollBy({ left: button.dataset.rail === "next" ? 640 : -640, behavior: "smooth" });
    });
  });
}

/* ------------------------------------------------------------------ *
 * 5. KHỞI TẠO
 * ------------------------------------------------------------------ */

let started = false;

async function init() {
  if (started) return;
  started = true;

  bindRelatedRail();

  const container = document.getElementById("videoContainer");
  const body = document.getElementById("movieBody");
  if (!container || !body) return;

  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    showNotFound("Chưa chọn phim để xem", "Đường dẫn không có mã phim. Hãy quay lại danh sách và nhấn nút xem phim.");
    return;
  }

  let catalog;
  let movie;
  try {
    catalog = await loadCatalog();
    movie = findMovie(catalog, id);
  } catch (error) {
    console.error("[watch] Không tải được data/db.json:", error);
    showNotFound("Không tải được danh sách phim", "Vui lòng tải lại trang hoặc kiểm tra kết nối máy chủ.");
    return;
  }

  if (!movie) {
    showNotFound("Không tìm thấy phim", `Không có phim nào với mã "${id}". Phim có thể đã bị gỡ khỏi danh sách.`);
    return;
  }

  container.dataset.movieId = String(movie.id);

  const source = await resolveVideoSource(movie);
  if (player.status) {
    player.status.textContent = source.isSample
      ? `Phim này chưa có nguồn phim riêng nên đang phát video mẫu của MovieF (${source.url}).`
      : `Đang phát: ${source.url}`;
  }

  fillMovieInfo(movie, catalog, source);
  document.getElementById("backToDetail").href = detailUrl(movie.id);
  document.getElementById("backToDetailInline").href = detailUrl(movie.id);
  body.classList.remove("hidden");

  mountPlayer(source.url);
  renderRelated(catalog, movie);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}