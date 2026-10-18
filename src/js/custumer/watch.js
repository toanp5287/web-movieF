/**
 * watch.js  (/watch?id=<id>[&episode=<episodeId>])
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
 * Chức năng 3 bổ sung: nếu URL có thêm `&episode=<episodeId>` (từ danh sách tập
 * ở trang chi tiết phim bộ) thì phát đúng video của TẬP đó — logic đọc/kiểm tra
 * tập nằm ở watch-episode.js. Không có tham số episode thì luồng phát phim lẻ
 * giữ nguyên như trước. Tập sai mã / bị ẩn / của phim khác hiện trạng thái an
 * toàn, không phát nhầm và không crash.
 *
 * Chức năng 5 bổ sung: khi video của TẬP phim bộ phát hết tự nhiên (`ended`),
 * trang tự chuyển sang tập kế tiếp thật sự phát được (mục 4c). Tập cuối / hết
 * tập có nguồn thì đứng yên, phim lẻ không tự đổi nội dung, và tạm dừng hay tua
 * video không kích hoạt việc chuyển tập.
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
  POSTER_FALLBACK,
  qualityLabel,
  ratingCount,
  sameId,
  watchUrl,
} from "./movie-data.js";

import { renderMovieCards } from "./movie-card.js";

import {
  findNextPlayableEpisode,
  resolveEpisodeNavigation,
} from "./episode-navigation.js";

import { initEpisodeList } from "./episode-list.js";

import {
  describeBlockedEpisode,
  episodeLabel,
  parseWatchQuery,
  resolveWatchEpisode,
} from "./watch-episode.js";

import {
  isActive,
  isSeriesMovie,
  loadSeriesData,
  seasonsOfMovie,
  episodesOfSeason,
} from "./series-data.js";

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
 * Nguồn phát của MỘT TẬP phim bộ.
 *
 * Chỉ dùng video ghi riêng cho tập đó. KHÔNG rơi về video mẫu chung: phát video
 * mẫu thay cho tập là phát nhầm nội dung, trái với yêu cầu "phát đúng tập".
 * Vì vậy khi tập chưa có video (hoặc file không tồn tại) thì trả url rỗng để
 * trang hiện trạng thái "chưa có nguồn" thay vì màn hình đen.
 *
 * Link ngoài (http/https/protocol-relative) giữ nguyên; đường dẫn nội bộ đi qua
 * normalizeVideoPath giống phim lẻ.
 *
 * @returns {Promise<{url: string, isSample: boolean}>}
 */
async function resolveEpisodeSource(episode) {
  const raw = String(episode?.video ?? "").trim();
  if (!raw) return { url: "", isSample: false };

  const external = /^(https?:)?\/\//i.test(raw);
  const url = external ? raw : normalizeVideoPath(raw);
  if (!url || (!external && isPlaceholder(url)))
    return { url: "", isSample: false };

  return (await probeVideo(url))
    ? { url, isSample: false }
    : { url: "", isSample: false };
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
    at: new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0,
    ).getTime(),
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

function fillMovieInfo(movie, catalog, source, episode = null) {
  const year = Number(movie.year) || Number(movie.releaseYear) || 0;
  const genres = genreNames(movie, catalog.genres);
  const rating = averageRating(movie, catalog.reviews);
  const votes = ratingCount(movie, catalog.reviews);
  const quality = qualityLabel(movie);

  document.title = year
    ? `${movie.title} (${year}) - Xem phim`
    : `${movie.title} - Xem phim`;

  put("nav-title", movie.title);
  put("movie-title", movie.title);
  put("movie-director", movie.director);
  put("movie-actors", Array.isArray(movie.actors) ? movie.actors.join(", ") : String(movie.actors ?? ""));
  put("movie-country-side", movie.country);
  put("movie-created", formatDate(movie.createdAt));
  put(
    "movie-video-source",
    source.isSample ? "Video mẫu MovieF" : "Nguồn riêng của phim",
  );

  // Poster (chỉ cho phim bộ theo ý chỉ định: khi có episode hợp lệ hoặc đơn giản
  // chỗ này dùng movie.type series; nhưng dữ liệu trên watch.html mới có
  // data-bind="movie-poster" → điền để episode-list/watch dùng chung).
  const posterImg = document.querySelector("[data-bind='movie-poster']");
  if (posterImg) {
    const poster = movie.poster || POSTER_FALLBACK;
    posterImg.src = poster;
    posterImg.alt = `Poster phim ${movie.title}`;
    posterImg.dataset.fallback = POSTER_FALLBACK;
    // bindImageFallback đã tồn tại
    bindImageFallback(document, "[data-bind='movie-poster']");
    posterImg.classList.remove("hidden");
  }

  // Meta builder: year · duration · country · quality (only truthy, join with bullets)
  const metaBox = document.querySelector("[data-bind='movie-meta']");
  if (metaBox) {
    const parts = [];
    if (year) parts.push(String(year));
    const durationText = formatDuration(episode ? episode.duration : movie.duration);
    if (durationText) parts.push(durationText);
    if (movie.country) parts.push(movie.country);
    if (quality) parts.push(quality);
    metaBox.innerHTML = parts
      .map((v) => `<span>${escapeHtml(String(v))}</span>`)
      .join(`<span class="opacity-40" aria-hidden="true">•</span>`);
  }

  // Description box toggle
  const descBox = document.querySelector("[data-bind='movie-description-box']");
  if (descBox) {
    if (movie.description && String(movie.description).trim()) {
      descBox.classList.remove("hidden");
    } else {
      descBox.classList.add("hidden");
    }
  }
  put("movie-description", movie.description);

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
  /**
   * Vị trí video sau lần tua gần nhất (-1 = chưa tua lần nào).
   *
   * Dùng cho chức năng 5: kéo thanh tiến trình về tận cuối thì `ended` do người
   * dùng tua chứ không phải tập phát hết, nên không được tự chuyển tập.
   */
  lastSeekPosition: -1,
  /* --- control tuỳ biến (thay cho `controls` gốc của trình duyệt) --- */
  controls: null,
  playToggle: null,
  playIcon: null,
  back10: null,
  forward10: null,
  /* --- âm lượng / mute --- */
  mute: null,
  muteIcon: null,
  volume: null,
  /**
   * Mức âm lượng trước khi mute.
   *
   * Không dùng `video.volume` làm nguồn khôi phục vì khi muted, Chrome vẫn giữ
   * nguyên volume — nhưng nếu sau đó người dùng kéo thanh trượt thì ý nghĩa
   * "mức trước khi mute" đã mất. Giữ riêng ở đây để bấm unmute luôn trả về
   * đúng mức người dùng đang nghe.
   */
  volumeBeforeMute: 1,
  /* --- fullscreen --- */
  shell: null,
  fullscreenBtn: null,
  fullscreenIcon: null,
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

/**
 * Vẽ lại icon nút Mute theo trạng thái thật của <video>.
 *
 * Icon bám theo `video.muted` + `video.volume` chứ không theo nút vừa bấm, nên
 * tạm âm ở một chỗ khác (ví dụ người dùng điều khiển bằng phím cứng trên bàn
 * phím) vẫn hiển thị đúng.
 */
function paintVolumeIcon() {
  if (!player.muteIcon) return;
  const { video } = player;

  const label = !video
    ? "volume_up"
    : video.muted || video.volume === 0
      ? "volume_off"
      : video.volume < 0.5
        ? "volume_down"
        : "volume_up";

  player.muteIcon.textContent = label;

  const button = player.mute;
  if (button) {
    const muted = Boolean(video && (video.muted || video.volume === 0));
    button.setAttribute("aria-label", muted ? "Bật tiếng" : "Tắt tiếng");
    button.title = muted ? "Bật tiếng" : "Tắt tiếng";
  }

  // Thanh trượt phải hiển thị đúng mức đang nghe: 0 khi đang mute.
  if (player.volume) {
    const shown = video && video.muted ? 0 : video ? video.volume : 1;
    const next = String(Number(shown.toFixed(2)));
    if (player.volume.value !== next) player.volume.value = next;
  }
}

/** Đặt mức âm lượng và cập nhật nút trượt + icon. */
function setVolume(value) {
  const { video } = player;
  if (!video) return;

  const next = Math.min(1, Math.max(0, Number(value) || 0));
  video.volume = next;

  // Kéo thanh trượt lên khỏi 0 chính là cách duy nhất để "bật lại" tiếng đang
  // tắt, nên phải bỏ muted — nếu không slider chạy nhưng vẫn không có tiếng.
  if (next > 0) video.muted = false;

  paintVolumeIcon();
}

function toggleMute() {
  const { video } = player;
  if (!video) return;

  if (video.muted || video.volume === 0) {
    // Trả về mức trước khi mute; nếu trước đó vốn đã là 0 thì chọn mức dễ nghe.
    const restore = player.volumeBeforeMute > 0 ? player.volumeBeforeMute : 1;
    video.muted = false;
    setVolume(restore);
  } else {
    // Nhớ mức hiện tại TRƯỚC khi tắt để lần bật lại không bị mất.
    player.volumeBeforeMute = video.volume;
    video.muted = true;
  }

  paintVolumeIcon();
}

/* ------------------------------------------------------------------ *
 * 3b. FULLSCREEN
 * ------------------------------------------------------------------ */

/** Đang ở fullscreen hay không — đọc từ chính Fullscreen API, không tự đặt cờ. */
function isFullscreen() {
  return Boolean(document.fullscreenElement);
}

/**
 * Phóng to / thu nhỏ bằng Fullscreen API.
 *
 * Phóng `#playerShell` chứ không phải `#videoContainer`: thanh điều khiển
 * (#videoControls) là phần tử anh em nằm NGOÀI #videoContainer, nên phóng riêng
 * video sẽ khiến người dùng mất sạch nút play / âm lượng / fullscreen.
 *
 * Rơi về requestFullscreen trên webkit cũ (Safari) vì `standard` chỉ có từ
 * Safari 16.4; `webkit*` phải bắt đầu bằng "webkit".
 */
async function toggleFullscreen() {
  const target = player.shell || document.documentElement;
  if (!target) return;

  const request =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.msRequestFullscreen;
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  try {
    if (isFullscreen()) {
      if (typeof exit === "function") await exit.call(document);
    } else if (typeof request === "function") {
      await request.call(target);
    } else {
      Swal.fire({
        icon: "info",
        title: "Trình duyệt không hỗ trợ",
        text: "Phiên bản trình duyệt của bạn không hỗ trợ phóng to màn hình video.",
      });
    }
  } catch (error) {
    // requestFullscreen bị từ chối khi chưa có tương tác người dùng, hoặc khi
    // trình duyệt chặn. Không nên để thành lỗi nghiêm trọng.
    console.warn("[watch] Không vào được fullscreen:", error);
  }
}

/** Đồng bộ icon nút fullscreen theo trạng thái thật từ Fullscreen API. */
function paintFullscreenIcon() {
  if (!player.fullscreenIcon) return;
  const active = isFullscreen();

  player.fullscreenIcon.textContent = active ? "fullscreen_exit" : "fullscreen";

  const button = player.fullscreenBtn;
  if (button) {
    button.setAttribute(
      "aria-label",
      active ? "Thoát phóng to màn hình" : "Phóng to màn hình",
    );
    button.title = active ? "Thoát phóng to" : "Phóng to màn hình";
  }
}

/** Gắn listener, chỉ tìm một lần. */
function bindFullscreen() {
  if (player.fullscreenBound) return;
  player.fullscreenBound = true;

  player.fullscreenBtn?.addEventListener("click", toggleFullscreen);

  // Người dùng có thể thoát fullscreen bằng Esc, F11 hoặc nút của trình duyệt —
  // những cách đó không đi qua nút của ta, nên phải nghe event toàn trang.
  document.addEventListener("fullscreenchange", paintFullscreenIcon);
  document.addEventListener("webkitfullscreenchange", paintFullscreenIcon);

  // Safari iOS bỏ qua requestFullscreen trên phần tử không phải <video>.
  // Gọi trực tiếp trên <video> là cách duy nhất hoạt động ở đó.
  player.video?.addEventListener("webkitbeginfullscreen", () => {
    paintFullscreenIcon();
  });
  player.video?.addEventListener("webkitendfullscreen", paintFullscreenIcon);

  // Tắt phím F: bật/tắt fullscreen (mặc định trình duyệt chỉ F11 toàn trang).
  document.addEventListener("keydown", (event) => {
    if (event.key !== "f" && event.key !== "F") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Không nuốt phím khi người dùng đang gõ vào ô nhập liệu.
    const tag = (event.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.target?.isContentEditable) return;

    event.preventDefault();
    toggleFullscreen();
  });

  paintFullscreenIcon();
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
  player.mute = document.getElementById("btnMute");
  player.muteIcon = document.getElementById("btnMuteIcon");
  player.volume = document.getElementById("videoVolume");
  player.shell = document.getElementById("playerShell");
  player.fullscreenBtn = document.getElementById("btnFullscreen");
  player.fullscreenIcon = document.getElementById("btnFullscreenIcon");

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
    player.lastSeekPosition = Number(video.currentTime) || 0;
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

  // CHỨC NĂNG 5: tập phim bộ phát hết tự nhiên -> sang tập kế tiếp.
  // Tạm dừng / tua / lỗi video đều không bắn `ended`, nên không thể chuyển tập
  // nhầm; chi tiết điều kiện nằm trong handleVideoEnded.
  video.addEventListener("ended", handleVideoEnded);

  // Control tuỳ biến: nút phát + tua ±10 giây.
  player.playToggle?.addEventListener("click", () => {
    const target = player.video;
    if (!target) return;
    if (target.paused) {
      // Không tự phát: chỉ phát khi người dùng bấm, và nuốt lỗi autoplay nếu có.
      const attempt = target.play();
      if (attempt && typeof attempt.catch === "function")
        attempt.catch(() => {});
    } else {
      target.pause();
    }
  });

  player.back10?.addEventListener("click", () => seekBy(-10));
  player.forward10?.addEventListener("click", () => seekBy(10));

  // Control âm lượng / mute.
  player.mute?.addEventListener("click", toggleMute);
  player.volume?.addEventListener("input", (event) => {
    setVolume(event.target.value);
  });

  // `volumechange` bắn cả khi ta tự đổi lẫn khi đổi từ bên ngoài (phím cứng,
  // menu của trình duyệt) -> giữ nút và thanh trượt luôn khớp với <video>.
  video.addEventListener("volumechange", () => {
    if (!video.muted && video.volume > 0) {
      player.volumeBeforeMute = video.volume;
    }
    paintVolumeIcon();
  });

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
  paintVolumeIcon();
  bindFullscreen();
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
    // Nguồn mới phát từ đầu: không giữ lại vị trí tua của nguồn trước.
    player.lastSeekPosition = -1;
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
 * 4b. ĐIỀU HƯỚNG TẬP — Tập trước / Tập tiếp theo (CHỨC NĂNG 4)
 * ------------------------------------------------------------------ */

const episodeNavUi = {
  bar: null,
  prevBtn: null,
  prevLabel: null,
  nextBtn: null,
  nextLabel: null,
};

/** Lấy các phần tử của thanh #episodeNav, chỉ tìm một lần. */
function episodeNavEls() {
  if (episodeNavUi.bar) return episodeNavUi;

  episodeNavUi.bar = document.getElementById("episodeNav");
  episodeNavUi.prevBtn = document.getElementById("prevEpisodeBtn");
  episodeNavUi.prevLabel = document.getElementById("prevEpisodeLabel");
  episodeNavUi.nextBtn = document.getElementById("nextEpisodeBtn");
  episodeNavUi.nextLabel = document.getElementById("nextEpisodeLabel");
  return episodeNavUi;
}

/**
 * Ẩn thanh điều hướng tập.
 *
 * `hidden` và `flex` phải luôn đối nhau: thêm một cái thì bỏ cái kia, nếu không
 * hai class cùng hiện thì thứ tự trong CSS sẽ quyết định và thanh có thể mất
 * hoặc hiện sai tùy bản build Tailwind.
 */
function hideEpisodeNav() {
  const el = episodeNavEls();
  if (!el.bar) return;

  el.bar.classList.remove("flex");
  el.bar.classList.remove("grid");
  el.bar.classList.add("hidden");
}

/**
 * Cấu hình MỘT nút (Trước / Tiếp theo).
 *
 * Còn tập hợp lệ thì gắn href thật (mở bằng click chuột giữa/new tab được);
 * không còn thì gỡ href, đánh dấu aria-disabled và thêm lớp mờ để nút thành
 * trạng thái bị vô hiệu hoá theo yêu cầu.
 */
function fillEpisodeNavSlot(button, label, item, movieId) {
  if (!button) return;

  if (!item) {
    button.removeAttribute("href");
    button.setAttribute("aria-disabled", "true");
    button.classList.add(
      "pointer-events-none",
      "opacity-40",
      "cursor-not-allowed",
    );
    if (label) label.textContent = "Không có tập";
    return;
  }

  button.href = `${watchUrl(movieId)}&episode=${encodeURIComponent(item.episode.id)}`;
  button.setAttribute("aria-disabled", "false");
  button.classList.remove(
    "pointer-events-none",
    "opacity-40",
    "cursor-not-allowed",
  );
  if (label) label.textContent = episodeLabel(item.episode, item.season);
}

/**
 * Hiện thanh Tập trước / Tập tiếp theo cho đúng tập đang xem.
 *
 * Chỉ hiện khi tập đang mở hợp lệ (reason === "ok"); hướng nào không có tập
 * hợp lệ thì nút hướng đó bị vô hiệu hoá, không bao giờ dẫn tới tập mồ côi,
 * tập bị ẩn hay tập của phim khác. Không tự chuyển tập — chờ người dùng bấm.
 */
async function renderEpisodeNav(movie, episode) {
  const el = episodeNavEls();
  if (!el.bar || !movie || !episode) {
    hideEpisodeNav();
    return;
  }

  const { reason, prev, next } = await resolveEpisodeNavigation(
    movie,
    episode.id,
  );

  if (reason !== "ok") {
    hideEpisodeNav();
    return;
  }

  fillEpisodeNavSlot(el.prevBtn, el.prevLabel, prev, movie.id);
  fillEpisodeNavSlot(el.nextBtn, el.nextLabel, next, movie.id);

  el.bar.classList.remove("hidden");
  el.bar.classList.add("grid");
}

/* ------------------------------------------------------------------ *
 * 4b-bis. BẢNG CHỌN MÙA/TẬP + THỐNG KÊ (CHỨC NĂNG 3 trên trang xem)
 * ------------------------------------------------------------------ */

/**
 * Tổng số mùa / tổng số tập của phim bộ — chỉ hiện phần có dữ liệu thật.
 * Ô `series-stats` ẩn mặc định (class `hidden`), gọi hàm này mới hiện.
 */
function fillSeriesStats(seasonCount, episodeCount) {
  const box = document.querySelector("[data-bind='series-stats']");
  if (!box) return;

  box.innerHTML = `
    <span class="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 font-label-md text-label-md text-on-surface-variant">
      <span class="material-symbols-outlined text-base">stacks</span>
      ${escapeHtml(String(seasonCount))} mùa
    </span>
    <span class="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 font-label-md text-label-md text-on-surface-variant">
      <span class="material-symbols-outlined text-base">playlist_play</span>
      ${escapeHtml(String(episodeCount))} tập
    </span>`;
  box.classList.remove("hidden");
}

/**
 * Hiện thống kê mùa/tập + bảng chọn mùa/tập cho phim bộ ngay trên trang xem.
 *
 * Dùng lại nguyên `episode-list.js`: hàm này chỉ đếm dữ liệu thật (mùa/tập
 * đang hoạt động) để điền `series-stats`, rồi giao việc render tab mùa + lưới
 * tập (kèm viền "Đang xem") cho `initEpisodeList`. Phim lẻ hoặc lỗi dữ liệu thì
 * ẩn cả hai khối — không làm trang crash.
 *
 * `currentEpisode` (tuỳ chọn): tập đang phát, để mở sẵn đúng mùa và đánh dấu.
 */
async function renderSeriesPanels(movie, currentEpisode = null) {
  const statsBox = document.querySelector("[data-bind='series-stats']");
  const block = document.querySelector("[data-bind='series-block']");

  if (!movie || !isSeriesMovie(movie)) {
    statsBox?.classList.add("hidden");
    if (block) block.hidden = true;
    return;
  }

  try {
    const data = await loadSeriesData();
    const seasons = seasonsOfMovie(data.seasons, movie.id).filter((season) =>
      isActive(season.status),
    );
    const episodeCount = seasons.reduce(
      (total, season) =>
        total +
        episodesOfSeason(data.episodes, season.id).filter((episode) =>
          isActive(episode.status),
        ).length,
      0,
    );
    fillSeriesStats(seasons.length, episodeCount);
  } catch (error) {
    console.warn("[watch] Không tải được thống kê mùa/tập:", error?.message);
    statsBox?.classList.add("hidden");
  }

  await initEpisodeList(movie, currentEpisode?.id ?? null);
}

/* ------------------------------------------------------------------ *
 * 4c. TỰ ĐỘNG CHUYỂN TẬP KẾ TIẾP (CHỨC NĂNG 5)
 * ------------------------------------------------------------------ */

/**
 * Cờ do trang TẬP ĐANG CHUYỂN tới để lại trong sessionStorage.
 *
 * Trang chỉ tự phát khi cờ chứa đúng id tập sắp mở — nhờ vậy không bao giờ tự
 * phát khi người dùng mở tập theo cách khác, và cờ chỉ có hiệu lực MỘT lần
 * (đọc là xoá ngay).
 */
const AUTO_NEXT_FLAG_KEY = "movief:auto-next-episode";

/** Chờ một nhịp trước khi tải trang mới để lịch sử xem kịp ghi tập vừa hết. */
const AUTO_NEXT_DELAY_MS = 300;

/** Tập cuối video nhỏ hơn mức này nếu do người dùng tua về cuối thì bỏ qua. */
const SEEK_TO_END_EPSILON = 0.1;

/** Trạng thái của chức năng 5 cho MỘT lần mở trang. */
const autoNext = {
  /** Chỉ true khi đang phát ĐÚNG một tập phim bộ có nguồn. */
  enabled: false,
  movie: null,
  episode: null,
  /** Nguồn phát của tập — dùng để phân biệt với trailer. */
  sourceUrl: "",
  /** Chống chạy trùng khi `ended` bắn lần nữa trong lúc đang tra tập. */
  running: false,
};

/**
 * Đọc (và xoá ngay) cờ "đang tự chuyển tập" do trang trước để lại.
 *
 * @param {string} episodeId id tập trên URL hiện tại
 * @returns {boolean} true chỉ khi tập đang mở đúng là tập được tự chuyển tới
 */
function consumeAutoNextFlag(episodeId) {
  try {
    const target = sessionStorage.getItem(AUTO_NEXT_FLAG_KEY) || "";
    sessionStorage.removeItem(AUTO_NEXT_FLAG_KEY);
    return Boolean(target && episodeId && sameId(target, episodeId));
  } catch {
    // sessionStorage bị chặn (chế độ riêng tư): coi như không có cờ.
    return false;
  }
}

/**
 * Video của tập hiện tại phát hết -> chuyển sang tập kế tiếp và phát luôn.
 *
 * Điều kiện để tự chuyển (tất cả phải cùng đúng):
 *   - đang xem MỘT tập phim bộ có nguồn phát (phim lẻ không bị ảnh hưởng);
 *   - video phát hết THẬT SỰ: không phải lúc đang tua, không phải tua về tận
 *     cuối video, không có lỗi tải/phát;
 *   - còn tập kế tiếp hợp lệ, đang hoạt động và có nguồn video dùng được
 *     (tra qua findNextPlayableEpisode — tập bị ẩn đã bị loại từ đầu).
 *
 * Không thỏa một điều kiện nào thì giữ nguyên trang hiện tại.
 */
async function handleVideoEnded() {
  const { enabled, running, movie, episode, sourceUrl } = autoNext;
  if (!enabled || running) return;

  const video = player.video;
  if (!video || video.error || video.seeking) return;

  const duration = Number(video.duration) || 0;
  if (duration > 0 && player.lastSeekPosition >= duration - SEEK_TO_END_EPSILON) {
    // Người dùng vừa tua về tận cuối: `ended` do thao tác tua gây ra.
    return;
  }

  // Đang phát trailer thay cho tập thì tập này chưa hề phát hết.
  if (!sourceUrl || player.src !== sourceUrl) return;

  autoNext.running = true;

  let target = null;
  try {
    target = await findNextPlayableEpisode(movie, episode.id, (candidate) =>
      resolveEpisodeSource(candidate).then((source) => Boolean(source.url)),
    );
  } catch (error) {
    console.warn("[watch] Không tra được tập kế tiếp:", error?.message);
  }

  if (!target) {
    // Hết tập hợp lệ có nguồn phát -> đứng yên, không đổi sang phim khác.
    autoNext.running = false;
    return;
  }

  // Chờ một nhịp để lịch sử xem kịp lưu tập vừa phát hết (history.js cũng lưu
  // ngay khi `ended` bắn) trước khi trang mới thay thế trang hiện tại.
  window.setTimeout(() => {
    try {
      sessionStorage.setItem(AUTO_NEXT_FLAG_KEY, String(target.episode.id));
    } catch {
      // Không ghi được cờ: vẫn chuyển tập, chỉ mất quyền tự phát tập mới.
    }
    window.location.href = `${watchUrl(movie.id)}&episode=${encodeURIComponent(
      target.episode.id,
    )}`;
  }, AUTO_NEXT_DELAY_MS);
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

  const { id, episodeId } = parseWatchQuery(window.location.search);

  // Đọc và xoá ngay cờ "vừa tự chuyển tập" — chỉ tập đúng trên URL mới được
  // tự phát, tránh bật tiếng khi người dùng mở trang theo cách khác.
  const autoplayNext = consumeAutoNextFlag(episodeId);

  if (!id) {
    showNotFound(
      "Chưa chọn phim để xem",
      "Đường dẫn không có mã phim. Hãy quay lại danh sách và nhấn nút xem phim.",
    );
    return;
  }

  let catalog;
  let movie;
  try {
    catalog = await loadCatalog();
    movie = findMovie(catalog, id);
  } catch (error) {
    console.error("[watch] Không tải được data/db.json:", error);
    showNotFound(
      "Không tải được danh sách phim",
      "Vui lòng tải lại trang hoặc kiểm tra kết nối máy chủ.",
    );
    return;
  }

  if (!movie) {
    showNotFound(
      "Không tìm thấy phim",
      `Không có phim nào với mã "${id}". Phim có thể đã bị gỡ khỏi danh sách.`,
    );
    return;
  }

  container.dataset.movieId = String(movie.id);

  // Gắn player TRƯỚC khi đọc player.status — nếu không, status luôn null và
  // dòng "Đang phát: ..." không bao giờ hiện.
  bindPlayer();

  // Nút quay lại luôn trỏ về trang chi tiết của phim này.
  document.getElementById("backToDetail").href = detailUrl(movie.id);
  document.getElementById("backToDetailInline").href = detailUrl(movie.id);

  /* ------------------------------------------------------------------ *
   * Chức năng 3: xem một tập phim bộ (?episode=<episodeId>)
   *
   * Chỉ phát khi tập tồn tại, đang hoạt động và THUỘC chính phim này. Sai mã,
   * tập bị ẩn, hay tập của phim khác đều hiện trạng thái an toàn — không phát
   * nhầm video, không crash, không tự chuyển tập.
   * ------------------------------------------------------------------ */
  let episode = null;
  let season = null;

  if (episodeId) {
    const resolved = await resolveWatchEpisode(movie, episodeId);

    if (resolved.reason !== "ok") {
      fillMovieInfo(movie, catalog, { url: "", isSample: false }, episode);
      const blockedCell = document.querySelector(
        "[data-bind='movie-video-source']",
      );
      if (blockedCell) blockedCell.textContent = "Tập phim không khả dụng";

      const backLink = stateEls().back;
      if (backLink) backLink.href = detailUrl(movie.id);

      showVideoState({
        ...describeBlockedEpisode(resolved, episodeId),
        trailerUrl: "",
      });
      body.classList.remove("hidden");
      renderRelated(catalog, movie);
      if (isSeriesMovie(movie)) {
        renderSeriesPanels(movie, episode).catch(() => {});
      }
      // Tập không hợp lệ thì không có thứ tự để đi tiếp/trước -> giấu nút.
      hideEpisodeNav();
      return;
    }

    episode = resolved.episode;
    season = resolved.season;
    container.dataset.episodeId = String(episode.id);

    // Tính trước Tập trước/Tiếp theo cho tập này. Dù sau đó tập thiếu video
    // (hiện trạng thái) người dùng vẫn cần nút để chuyển sang tập khác.
    await renderEpisodeNav(movie, episode);
  }

  const source = episode
    ? await resolveEpisodeSource(episode)
    : await resolveVideoSource(movie);
  const trailerUrl = await resolveTrailerUrl(movie);

  fillMovieInfo(movie, catalog, source, episode);

  // Phân biệt "không có video chính" với "có URL nhưng tải lỗi" (trường hợp C,
  // do event `error` của <video> xử lý qua overlay #videoError).
  const unavailable = episode
    ? source.url
      ? null
      : {
          icon: "movie",
          title: "Tập phim chưa có nguồn phát",
          message: `${episodeLabel(
            episode,
            season,
          )} chưa có video để xem. Vui lòng chọn tập khác hoặc quay lại sau.`,
          trailerUrl,
        }
    : resolveUnavailableState(movie, source, trailerUrl);

  if (unavailable) {
    const sourceCell = document.querySelector(
      "[data-bind='movie-video-source']",
    );
    if (sourceCell) {
      sourceCell.textContent = episode
        ? "Chưa có nguồn cho tập này"
        : source.isSample
          ? "Chưa có nguồn phim"
          : "Nguồn riêng của phim";
    }
    const backLink = stateEls().back;
    if (backLink) backLink.href = detailUrl(movie.id);

    showVideoState(unavailable);
    body.classList.remove("hidden");

    renderRelated(catalog, movie);
    // Gọi khối chọn tập cho phim bộ (kể cả khi tập không có video)
    if (isSeriesMovie(movie)) {
      renderSeriesPanels(movie, episode).catch(() => {});
    }
    return;
  }

  // Tiêu đề tab + thời lượng theo ĐÚNG tập đang xem (nếu có).
  if (episode) {
    document.title = `${movie.title} · ${episodeLabel(episode, season)} - Xem phim`;
    const episodeDuration = formatDuration(episode.duration);
    if (episodeDuration) put("movie-duration", episodeDuration);
  }

  if (player.status) {
    if (episode) {
      player.status.textContent = `Đang phát ${episodeLabel(episode, season)}: ${source.url}`;
    } else {
      player.status.textContent = source.isSample
        ? `Phim này chưa có nguồn phim riêng nên đang phát video mẫu của MovieF (${source.url}).`
        : `Đang phát: ${source.url}`;
    }
  }

  const video = mountPlayer(source.url);
  body.classList.remove("hidden");
  if (isSeriesMovie(movie)) {
    renderSeriesPanels(movie, episode).catch(() => {});
  }
  if (episode && source.url) {
    autoNext.enabled = true;
    autoNext.movie = movie;
    autoNext.episode = episode;
    autoNext.sourceUrl = source.url;
  }

  // Tập vừa được tự chuyển tới (cờ ở sessionStorage): phát tiếp ngay, giống
  // người dùng vừa bấm play. Lỗi autoplay (nếu có) được nuốt lặng lẽ.
  if (video && autoplayNext) {
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
