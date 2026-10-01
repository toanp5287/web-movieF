/**
 * watch.js  (/watch?id=<id>)
 *
 * Trang xem phim của MovieF.
 *
 * Trước đây watch.html là một khối giao diện tĩnh: khung 16:9 trong đó là một
 * <img> "keyframe" từ Google, các nút điều khiển không gắn handler, thanh tiến
 * trình bị tự xóa ngay ở lần timeupdate đầu tiên... nên không có video nào
 * phát được. Phiên bản này dùng <video> thật và chỉ bổ sung những thứ thật
 * sự cần:
 *
 *   1. đọc ?id= rồi tìm phim trong data/db.json (không tự chế dữ liệu),
 *   2. dò file video riêng của phim trong data/db.json — đường dẫn trong db
 *      đang viết lộn xộn ("../videos/x.mp4", "videos/x.mp4", "/videos/x.mp4"),
 *   3. phim chưa có nguồn riêng thì hiện TRẠNG THÁI thay vì ép phát video mẫu,
 *      kèm nút "Xem Trailer" nếu trailer thật sự tồn tại,
 *   4. hiện trạng thái tải / buffering / lỗi + nút thử lại, không gọi load()
 *      lặp lại và không tự phát,
 *   5. đổi phim chỉ thay src của MỘT player duy nhất, không tạo player mới.
 *
 * Lưu ý: KHÔNG bật `controls` gốc của trình duyệt vì nó có sẵn một thanh thời
 * gian riêng, trùng với #progressTrackContainer. Trang dùng bộ control tuỳ
 * biến (#videoControls: nút phát, tua ±10s, thanh tiến trình) nên chỉ có MỘT
 * thanh thời gian. #progressTrackContainer và #videoProgressBar được giữ lại vì
 * src/js/custumer/history.js đọc đúng hai id đó để tính tiến độ xem đã lưu.
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
 * chỉ chậm thêm một vòng chờ trước khi phát.
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

/**
 * Trailer chỉ dùng để xem trước, KHÔNG bao giờ làm nguồn video chính.
 *
 * Dùng lại probeVideo() sẵn có để chỉ trả về URL khi file thật sự tồn tại —
 * trailer ghi trong db.json (videos/trailer/*.mp4) phần lớn không có trong
 * public/videos, và bấm "Xem Trailer" vào một URL hỏng là tệ hơn là không
 * hiện nút đó.
 *
 * @returns {Promise<string>} URL trailer hợp lệ, hoặc "" nếu không có
 */
async function resolveTrailerUrl(movie) {
  const raw = String(movie?.trailer ?? "").trim();
  if (!raw) return "";
  const url = normalizeVideoPath(raw);
  if (!url || isPlaceholder(url)) return "";
  return (await probeVideo(url)) ? url : "";
}

/**
 * Ngày/giờ phát hành — CHỉ đọc field có thật trong dữ liệu, không tự suy đoán.
 *
 * data/db.json hiện chỉ có `createdAt`, mà `createdAt` là "Ngày thêm" (ngày
 * đưa phim vào hệ thống, hiển thị ở aside "Ngày thêm"), KHÔNG phải ngày chiếu —
 * nên tuyệt đối không dùng nó để kết luận "phim chưa phát hành". Vì vậy hàm này
 * chỉ đọc đúng hai field phát hành và trả null khi chúng không tồn tại; khi đó
 * trang sẽ không dùng nhánh "chưa phát hành" thay vì bịa ngày ra.
 *
 * @returns {{at: number, label: string, hasTime: boolean}|null}
 */
function readReleaseMoment(movie) {
  const date = String(movie?.releaseDate ?? "").trim();
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return null;

  const [, y, m, d] = dateMatch;
  const timeMatch = String(movie?.releaseTime ?? "").match(/(\d{1,2}):(\d{2})/);
  const hh = timeMatch ? String(Number(timeMatch[1])).padStart(2, "0") : "00";
  const mm = timeMatch ? timeMatch[2] : "00";

  return {
    at: new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0).getTime(),
    label: timeMatch ? `${d}/${m}/${y} ${hh}:${mm}` : `${d}/${m}/${y}`,
    hasTime: Boolean(timeMatch),
  };
}

/**
 * Quyết định trạng thái hiển thị khi phim KHÔNG có video chính.
 *
 * Phân biệt 4 nhánh bằng dữ liệu thật, không đoán:
 *   A. Có `releaseDate`(+`releaseTime`) và hiện tại chưa tới  -> chưa phát hành.
 *   B/E. Đã qua thời điểm phát hành (hoặc không có dữ liệu phát hành) nhưng
 *        không có video chính -> "đang được cập nhật" + Xem Trailer nếu có trailer.
 *   D. Không có video chính và không có trailer -> "chưa sẵn sàng", không nút Trailer.
 *
 * Trường hợp C (có URL video nhưng tải/phát lỗi) KHÔNG nằm ở đây: nó do event
 * `error` của <video> đảm nhiệm qua overlay #videoError.
 *
 * @returns {{icon: string, title: string, message: string, trailerUrl: string}|null}
 *          null nghĩa là có video chính hợp lệ -> phát bình thường.
 */
function resolveUnavailableState(movie, source, trailerUrl) {
  const release = readReleaseMoment(movie);

  if (release && Date.now() < release.at) {
    return {
      icon: "schedule",
      title: "Phim chưa được phát hành",
      message: `Phim sẽ được công chiếu vào ${release.label}.`,
      trailerUrl,
    };
  }

  if (!source.isSample) return null;

  if (trailerUrl) {
    return {
      icon: "movie",
      title: "Phim đang được cập nhật",
      message: "Nội dung phim chưa sẵn sàng để xem. Vui lòng quay lại sau.",
      trailerUrl,
    };
  }

  return {
    icon: "info",
    title: "Nội dung phim chưa sẵn sàng",
    message: "Phim hiện chưa có nội dung để xem.",
    trailerUrl: "",
  };
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
 * 2b. TRẠNG THÁI "KHÔNG CÓ VIDEO CHÍNH"
 * ------------------------------------------------------------------ */

const stateUi = {
  box: null,
  icon: null,
  title: null,
  message: null,
  trailer: null,
  back: null,
};

/** Lấy các phần tử của overlay #videoState, chỉ tìm một lần. */
function stateEls() {
  if (stateUi.box) return stateUi;
  stateUi.box = document.getElementById("videoState");
  stateUi.icon = document.getElementById("videoStateIcon");
  stateUi.title = document.getElementById("videoStateTitle");
  stateUi.message = document.getElementById("videoStateMsg");
  stateUi.trailer = document.getElementById("videoStateTrailerBtn");
  stateUi.back = document.getElementById("videoStateBackDetail");
  return stateUi;
}

/**
 * Hiện trạng thái không có video chính và ẩn thanh điều khiển.
 *
 * Luôn tắt #videoLoading/#videoError trước: hai overlay đó dành cho trường hợp
 * khác (đang tải / có URL nhưng lỗi) và không được chồng lên trạng thái này.
 */
function showVideoState({ icon, title, message, trailerUrl }) {
  const el = stateEls();
  if (!el.box) return;

  setOverlay({});
  if (el.icon) el.icon.textContent = icon || "info";
  if (el.title) el.title.textContent = title || "";
  if (el.message) el.message.textContent = message || "";

  if (el.trailer) {
    const show = Boolean(trailerUrl);
    el.trailer.classList.toggle("hidden", !show);
    if (show) el.trailer.dataset.trailerUrl = trailerUrl;
  }

  el.box.classList.remove("hidden");
  player.controls?.classList.add("hidden");
  if (player.status) player.status.textContent = "";
}

function hideVideoState() {
  stateEls().box?.classList.add("hidden");
}

/**
 * Phát trailer thay cho video chính.
 *
 * Trailer chỉ là bản xem trước: gán vào CÙNG một #watchVideo, không tạo player
 * mới, và không thay đổi nguồn video chính đã lưu trong player.src trước đó.
 */
function playTrailer(url) {
  if (!url) return;
  const video = bindPlayer();
  if (!video) return;

  hideVideoState();
  player.controls?.classList.remove("hidden");
  setOverlay({ loading: "Đang tải trailer…" });
  if (player.status) player.status.textContent = `Đang phát trailer: ${url}`;
  syncProgress();

  if (player.src !== url) {
    player.src = url;
    video.src = url;
  }
  video.pause();
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
  /* --- control tuỳ biến (thay cho `controls` gốc của trình duyệt) --- */
  controls: null,
  playToggle: null,
  playIcon: null,
  back10: null,
  forward10: null,
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
  player.controls = document.getElementById("videoControls");
  player.playToggle = document.getElementById("btnPlayPause");
  player.playIcon = document.getElementById("btnPlayPauseIcon");
  player.back10 = document.getElementById("btnSeekBack10");
  player.forward10 = document.getElementById("btnSeekForward10");

  /**
   * Bật/tắt nút tua theo vị trí hiện tại: không tua được thì disable, tránh
   * bấm mà không có phản ứng.
   */
  function updateSeekButtons() {
    const total = Number(player.video?.duration);
    const position = Number(player.video?.currentTime) || 0;
    const ready = Boolean(player.video) && Number.isFinite(total) && total > 0;

    if (player.back10) player.back10.disabled = !ready || position <= 0;
    if (player.forward10) {
      player.forward10.disabled = !ready || position >= total - 0.25;
    }
    if (player.playToggle) player.playToggle.disabled = !player.video;
  }

  /** Tua đúng một khoảng, luôn kẹp trong [0, duration]. */
  function seekBy(seconds) {
    const target = player.video;
    if (!target) return;
    const total = Number(target.duration);
    if (!Number.isFinite(total) || total <= 0) return;
    const next = (Number(target.currentTime) || 0) + seconds;
    target.currentTime = Math.min(total, Math.max(0, next));
    syncProgress();
    updateSeekButtons();
  }

  function paintPlayIcon() {
    if (!player.playIcon) return;
    player.playIcon.textContent =
      player.video && player.video.paused === false ? "pause" : "play_arrow";
  }

  video.addEventListener("loadstart", () => {
    setOverlay({ loading: "Đang tải video…" });
  });

  video.addEventListener("loadedmetadata", () => {
    setOverlay({});
    syncProgress();
    updateSeekButtons();
    paintPlayIcon();
  });

  video.addEventListener("canplay", () => {
    setOverlay({});
    syncProgress();
    updateSeekButtons();
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

  video.addEventListener("play", () => {
    updateSeekButtons();
    paintPlayIcon();
  });

  video.addEventListener("pause", () => {
    paintPlayIcon();
  });

  video.addEventListener("timeupdate", () => {
    scheduleSync();
    updateSeekButtons();
  });
  video.addEventListener("seeked", () => {
    scheduleSync();
    updateSeekButtons();
  });
  video.addEventListener("durationchange", () => {
    syncProgress();
    updateSeekButtons();
  });

  video.addEventListener("error", () => {
    setOverlay({ error: describeMediaError(video) });
    if (player.status) player.status.textContent = "";
  });

  // Control tuỳ biến: nút phát + tua ±10 giây.
  player.playToggle?.addEventListener("click", () => {
    const target = player.video;
    if (!target) return;
    if (target.paused) {
      // Không tự phát: chỉ phát khi người dùng bấm, và nuốt lỗi autoplay nếu có.
      const attempt = target.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
    } else {
      target.pause();
    }
  });

  player.back10?.addEventListener("click", () => seekBy(-10));
  player.forward10?.addEventListener("click", () => seekBy(10));

  // Nút "Xem Trailer" trong overlay trạng thái (chỉ hiện khi trailer thật).
  stateEls().trailer?.addEventListener("click", () => {
    const url = stateEls().trailer?.dataset.trailerUrl || "";
    if (url) playTrailer(url);
  });

  player.track?.addEventListener("click", (event) => {
    seekToRatio(ratioFromPointer(event));
    updateSeekButtons();
  });

  player.track?.addEventListener("keydown", (event) => {
    const { video: current } = player;
    const total = Number(current?.duration);
    if (!current || !Number.isFinite(total) || total <= 0) return;

    const step = event.shiftKey ? 30 : 5;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      current.currentTime = Math.min(total, current.currentTime + step);
      syncProgress();
      updateSeekButtons();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      current.currentTime = Math.max(0, current.currentTime - step);
      syncProgress();
      updateSeekButtons();
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToRatio(0);
      updateSeekButtons();
    } else if (event.key === "End") {
      event.preventDefault();
      seekToRatio(1);
      updateSeekButtons();
    }
  });

  // Nút "Thử lại": chỉ gọi load() một lần cho mỗi lần bấm, không có vòng lặp.
  player.retry?.addEventListener("click", () => {
    setOverlay({ loading: "Đang thử tải lại video…" });
    video.load();
  });

  updateSeekButtons();
  paintPlayIcon();
  return video;
}

/**
 * Gắn nguồn phát. Chỉ gán src khi URL thực sự khác nguồn đang chạy, nên đổi ID
 * phim không tạo ra player mới và không tải lại cùng một file.
 */
function mountPlayer(url) {
  const video = bindPlayer();
  if (!video) return null;

  hideVideoState();
  player.controls?.classList.remove("hidden");
  setOverlay({ loading: "Đang tải video…" });
  syncProgress();

  if (player.src !== url) {
    player.src = url;
    video.src = url;
  }

  // Không tự phát: người dùng bấm nút phát.
  video.pause();
  return video;
}

/* ------------------------------------------------------------------ *
 * 4. DẢI "PHIM LIÊN QUAN"
 * ------------------------------------------------------------------ */

function renderRelated(catalog, movie) {
  const rail = document.getElementById("relatedRail");
  if (!rail) return;
  // Grid 4 cột trong HTML: mỗi dòng tối đa 4 phim, không rail cuộn ngang.
  const related = findRelated(catalog, movie, 8);
  if (!related.length) {
    rail.innerHTML = "";
    return;
  }
  renderMovieCards(rail, related, catalog, { toWatch: true, showGenre: false });
  bindImageFallback(rail);
}

/* ------------------------------------------------------------------ *
 * 5. KHỞI TẠO
 * ------------------------------------------------------------------ */

let started = false;

async function init() {
  if (started) return;
  started = true;

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

  // Gắn player TRƯỚC khi đọc player.status — nếu không, status luôn null và
  // dòng "Đang phát: ..." không bao giờ hiện.
  bindPlayer();

  const source = await resolveVideoSource(movie);
  const trailerUrl = await resolveTrailerUrl(movie);

  fillMovieInfo(movie, catalog, source);
  document.getElementById("backToDetail").href = detailUrl(movie.id);
  document.getElementById("backToDetailInline").href = detailUrl(movie.id);

  // Phân biệt "không có video chính" với "có URL nhưng tải lỗi" (trường hợp C,
  // do event `error` của <video> xử lý qua overlay #videoError).
  const unavailable = resolveUnavailableState(movie, source, trailerUrl);

  if (unavailable) {
    const sourceCell = document.querySelector("[data-bind='movie-video-source']");
    if (sourceCell) {
      sourceCell.textContent = source.isSample ? "Chưa có nguồn phim" : "Nguồn riêng của phim";
    }
    const backLink = stateEls().back;
    if (backLink) backLink.href = detailUrl(movie.id);

    showVideoState(unavailable);
    body.classList.remove("hidden");
    renderRelated(catalog, movie);
    return;
  }

  if (player.status) {
    player.status.textContent = source.isSample
      ? `Phim này chưa có nguồn phim riêng nên đang phát video mẫu của MovieF (${source.url}).`
      : `Đang phát: ${source.url}`;
  }

  mountPlayer(source.url);
  body.classList.remove("hidden");
  renderRelated(catalog, movie);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}