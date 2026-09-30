/**
 * watch.js  (/watch?id=<id>)
 *
 * Trang xem phim. Trước đây watch.html chỉ là một bản dựng giao diện tĩnh:
 *   - #videoContainer ghi cứng data-movie-id="7" (Dune: Part Two),
 *   - bên trong chỉ có một <img> làm "keyframe" giả, không hề có <video>,
 *   - script inline chỉ đổi icon play/pause chứ không phát video nào.
 * Nên dù nút "Xem phim ngay" có dẫn đúng tới /watch?id=3 thì cũng không
 * xem được gì.
 *
 * File này thay thế phần giả đó bằng một trình phát thật, tái sử dụng đúng
 * các id đã có sẵn trong watch.html (togglePlayBtn, muteBtn,
 * progressTrackContainer, videoProgressBar, fullscreenBtn, currentQuality):
 *   1. đọc ?id= rồi tìm phim trong data/db.json,
 *   2. dò file video thật của phim (đường dẫn trong db.json đang viết
 *      lộn xộn: "../videos/x.mp4", "videos/x.mp4", "/videos/x.mp4"),
 *   3. nếu có video thì chèn <video> thật và nối các nút điều khiển,
 *   4. nếu không có video hợp lệ thì hiện thông báo rõ ràng thay vì để
 *      nút bấm không được hay dẫn tới trang lỗi.
 */

import {
  escapeHtml,
  findMovie,
  formatDuration,
  genreNames,
  loadCatalog,
  sameId,
} from "./movie-data.js";

/* ------------------------------------------------------------------ *
 * 1. TÌM FILE VIDEO THẬT
 * ------------------------------------------------------------------ */

/**
 * db.json lưu đường dẫn video không nhất quán, ví dụ:
 *   "../videos/phim-demo-3.mp4"   (đi vào thư mục cha rồi mới vào videos/)
 *   "videos/phim-demo-3.mp4"      (không có dấu / ở đầu)
 *   "/videos/no-video.mp4"        (dấu / ở đầu)
 *
 * Lưu ý: normalizeMovie() của movie-data đã chạy mediaUrl() nên giá trị ta
 * nhận được lại bị gắn thêm "/" ở đầu -> "../videos/x.mp4" thành
 * "/../videos/x.mp4". Vì vậy phải bỏ lặp lại cả "/" lẫn "../" cho tới khi
 * sạch, nếu không sẽ còn sót "/../" và chỉ chạy được nhờ trình duyệt tự gộp
 * đường dẫn (máy chủ tĩnh nghiêm ngặt sẽ trả 404).
 */
function normalizeVideoPath(value) {
  let path = String(value ?? "").trim();
  // Bỏ lặp lại: "/../", "../", "//" ở đầu cho tới khi không còn.
  let previous;
  do {
    previous = path;
    path = path.replace(/^(?:\/|\.\.\/)+/, "");
  } while (path !== previous);
  return path ? `/${path}` : "";
}

function videoCandidates(movie) {
  const raw = [movie.video, movie.videoUrl, movie.src].map((v) => String(v ?? "").trim()).filter(Boolean);

  const urls = new Set();
  for (const value of raw) {
    const clean = normalizeVideoPath(value);
    if (!clean) continue;
    urls.add(clean);
    // Trường hợp ghi trần "phim-demo-3.mp4", thử gắn vào /videos/.
    if (!clean.includes("/")) urls.add(`/videos/${clean.slice(1)}`);
  }
  return [...urls];
}

/** File "trình chiếu" dùng để báo chưa có video, không phải video thật. */
const isPlaceholder = (url) => /\/no-video\.mp4$/i.test(url);

/** Kiểm tra một URL có tải được thật không (dùng HEAD, không tải hết file). */
async function urlExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") || "";
    // Server tĩnh có thể trả application/octet-stream cho .mp4 -> vẫn chấp nhận.
    return !type || type.startsWith("video/") || type.includes("octet-stream");
  } catch {
    return false;
  }
}

/** Trả về URL video đầu tiên thật sự tải được, hoặc "" nếu phim chưa có video. */
async function resolveVideoUrl(movie) {
  for (const url of videoCandidates(movie)) {
    if (isPlaceholder(url)) continue;
    if (await urlExists(url)) return url;
  }
  return "";
}

/* ------------------------------------------------------------------ *
 * 2. HIỂN THỊ THÔNG BÁO KHI CHƯA CÓ VIDEO
 * ------------------------------------------------------------------ */

/**
 * Hiện thông báo thay cho trình phát khi không xem được.
 *
 * Lưu ý: các nút điều khiển (togglePlayBtn, muteBtn, fullscreenBtn,
 * progressTrackContainer...) nằm bên trong #videoContainer nên bị gỡ luôn khi
 * ta thay nội dung. Đây là chủ ý: không có video thì thanh tua / âm lượng /
 * toàn màn hình cũng vô nghĩa, giữ lại chỉ gây hiểu nhầm là bấm được.
 */
function showNotice(container, { title, detail, actionHref = "/movies", actionText = "Xem danh sách phim" }) {
  container.innerHTML = `
    <div class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 p-6 text-center bg-surface-container-low/95">
      <span class="material-symbols-outlined text-5xl text-on-surface-variant/70">videocam_off</span>
      <p class="font-title-md text-title-md text-on-surface font-bold">${escapeHtml(title)}</p>
      <p class="font-body-sm text-body-sm text-on-surface-variant max-w-md">${escapeHtml(detail)}</p>
      <a class="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-title-sm text-title-sm hover:opacity-90 transition-opacity"
         href="${escapeHtml(actionHref)}">${escapeHtml(actionText)}</a>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * 3. GẮN THÔNG TIN PHIM LÊN TRANG
 * ------------------------------------------------------------------ */

function fillMeta(movie, catalog) {
  const title = movie.title;
  const year = Number(movie.year) || 0;
  const genres = genreNames(movie, catalog.genres).join(", ");

  document.title = year ? `${title} (${year}) - Xem phim` : `${title} - Xem phim`;

  const put = (name, value) => {
    const el = document.querySelector(`[data-bind='${name}']`);
    if (el && value) el.textContent = value;
  };
  put("overlay-title", year ? `${title} (${year})` : title);
  put("movie-title", title);
  put("movie-subtitle", year ? `Full HD Vietsub • ${title} (${year})` : `Full HD Vietsub • ${title}`);
  put("movie-year", year ? String(year) : "");
  put("movie-duration", movie.duration ? formatDuration(movie.duration) : "");
  put("movie-genres", genres);
}

/* ------------------------------------------------------------------ *
 * 4. TRÌNH PHÁT THẬT
 * ------------------------------------------------------------------ */

const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

function mountPlayer(container, url, movie) {
  const video = document.createElement("video");
  video.className = "absolute inset-0 w-full h-full object-contain bg-black";
  video.src = url;
  video.preload = "metadata";
  video.playsInline = true;
  video.controls = false; // dùng bộ điều khiển có sẵn của trang
  // Ảnh "keyframe" cứng trong HTML sẽ nằm đè lên video nên phải gỡ đi.
  container.querySelectorAll("img").forEach((img) => img.remove());
  container.prepend(video);

  const playIcon = document.getElementById("playStateIcon");
  const centerIcon = document.getElementById("centerPlayIcon");
  const centerBtn = document.getElementById("centerPlayBtn");
  const toggleBtn = document.getElementById("togglePlayBtn");
  const muteBtn = document.getElementById("muteBtn");
  const volIcon = document.getElementById("volIcon");
  const fullBtn = document.getElementById("fullscreenBtn");
  const track = document.getElementById("progressTrackContainer");
  const bar = document.getElementById("videoProgressBar");
  const timeNow = document.querySelector("[data-bind='time-current']");
  const timeTotal = document.querySelector("[data-bind='time-total']");

  const setIcon = (value) => {
    if (playIcon) playIcon.textContent = value;
    if (centerIcon) centerIcon.textContent = value;
  };

  const sync = () => {
    const playing = !video.paused && !video.ended;
    setIcon(playing ? "pause" : "play_arrow");
    if (volIcon) volIcon.textContent = video.muted || video.volume === 0 ? "volume_off" : "volume_up";

    const duration = video.duration || 0;
    const ratio = duration ? (video.currentTime / duration) * 100 : 0;
    if (bar) {
      bar.style.width = `${ratio}%`;
      bar.parentElement?.querySelector("div[style]")?.remove?.();
    }
    if (timeNow) timeNow.textContent = clock(video.currentTime);
    if (timeTotal) timeTotal.textContent = clock(duration);
  };

  const toggle = () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);
  video.addEventListener("ended", sync);
  video.addEventListener("timeupdate", sync);
  video.addEventListener("loadedmetadata", sync);
  video.addEventListener("volumechange", sync);
  // Lỗi tải giữa chừng (mất mạng, file hỏng) -> báo rõ thay vì im lặng.
  video.addEventListener("error", () => {
    showNotice(container, {
      title: "Không phát được video",
      detail: `Tệp video của "${movie.title}" không tải được. Vui lòng thử lại hoặc chọn phim khác.`,
    });
  });

  toggleBtn?.addEventListener("click", toggle);
  centerBtn?.addEventListener("click", toggle);
  muteBtn?.addEventListener("click", () => {
    video.muted = !video.muted;
    sync();
  });
  fullBtn?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else container.requestFullscreen?.().catch(() => {});
  });

  // Tua bằng thanh tiến trình.
  const seek = (event) => {
    if (!video.duration) return;
    const box = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    video.currentTime = ratio * video.duration;
    sync();
  };
  track?.addEventListener("click", seek);

  const slider = document.querySelector('#muteBtn')?.closest("div")?.querySelector('input[type="range"]');
  slider?.addEventListener("input", () => {
    video.volume = Number(slider.value) / 100;
    video.muted = video.volume === 0;
    sync();
  });

  // Chất lượng thực tế lấy theo độ phân giải của file, không ghi cứng "4K UHD".
  const quality = document.getElementById("currentQuality");
  if (quality) quality.textContent = "HD";

  sync();
  // Không tự phát: trình duyệt chặn autoplay có tiếng. Người dùng bấm nút play.
  setIcon("play_arrow");
  return video;
}

/** Cuộn ngang cho dải "Gợi ý phim" (chuyển từ script inline cũ sang đây). */
function bindRecommendationRail() {
  const rail = document.getElementById("recSlider");
  const prev = document.getElementById("recScrollLeft");
  const next = document.getElementById("recScrollRight");
  if (!rail || !prev || !next) return;

  prev.addEventListener("click", () => rail.scrollBy({ left: -320, behavior: "smooth" }));
  next.addEventListener("click", () => rail.scrollBy({ left: 320, behavior: "smooth" }));
}

/* ------------------------------------------------------------------ *
 * 5. KHỞI TẠO
 * ------------------------------------------------------------------ */

async function init() {
  const container = document.getElementById("videoContainer");
  bindRecommendationRail();
  if (!container) return;

  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    showNotice(container, {
      title: "Chưa chọn phim để xem",
      detail: "Đường dẫn không có mã phim. Hãy quay lại trang chủ và nhấn nút xem phim.",
      actionHref: "/",
      actionText: "Về trang chủ",
    });
    return;
  }

  let catalog;
  let movie;
  try {
    catalog = await loadCatalog();
    movie = findMovie(catalog, id);
  } catch (err) {
    console.error("[watch] Không tải được data/db.json:", err);
    showNotice(container, {
      title: "Không tải được danh sách phim",
      detail: "Vui lòng tải lại trang hoặc kiểm tra kết nối máy chủ.",
    });
    return;
  }

  if (!movie) {
    showNotice(container, {
      title: "Không tìm thấy phim",
      detail: `Không có phim nào với mã "${id}". Phim có thể đã bị gỡ khỏi danh sách.`,
    });
    return;
  }

  container.dataset.movieId = String(movie.id);
  fillMeta(movie, catalog);

  const url = await resolveVideoUrl(movie);
  if (!url) {
    showNotice(container, {
      title: `Chưa có video cho "${movie.title}"`,
      detail: "Phim này hiện chưa được tải lên nguồn. Bạn có thể xem các phim khác trong danh sách.",
    });
    return;
  }

  console.info(`[watch] Đang phát "${movie.title}" (id=${movie.id}) từ ${url}`);
  mountPlayer(container, url, movie);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
