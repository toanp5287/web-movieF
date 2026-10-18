import api from "../api.js";

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sameId(left, right) {
  return String(left) === String(right);
}

function normalizeId(id) {
  return /^\d+$/.test(String(id)) ? Number(id) : id;
}

/* ------------------------------------------------------------------ *
 * Lịch sử xem của KHÁCH (localStorage) — tách biệt hoàn toàn với lịch sử
 * tài khoản (API /histories). Chỉ giữ tối đa 3 phim gần nhất, mỗi phim một
 * bản ghi. Được export để trang chủ (home.js) đọc lại.
 * ------------------------------------------------------------------ */

/** Khóa localStorage cho lịch sử xem của người chưa đăng nhập. */
export const GUEST_HISTORY_KEY = "movieF_watchHistory_guest";

/** Số phim tối đa giữ trong lịch sử khách. */
const GUEST_HISTORY_LIMIT = 3;

/**
 * Đọc lịch sử xem của khách. Luôn trả mảng an toàn (dữ liệu hỏng -> []),
 * đã lọc bản ghi thiếu mã phim và sắp xếp mới xem gần nhất lên đầu.
 */
export function readGuestHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || "[]");
    if (!Array.isArray(list)) return [];
    return list
      .filter((item) => item && item.movieId !== undefined && item.movieId !== null)
      .sort(
        (a, b) =>
          new Date(b.watchedAt || 0).getTime() -
          new Date(a.watchedAt || 0).getTime(),
      );
  } catch {
    return [];
  }
}

/**
 * Ghi/cập nhật lịch sử xem của khách.
 *
 * Mỗi phim chỉ có MỘT bản ghi (khớp theo movieId): xem lại cùng phim sẽ cập
 * nhật tiến độ/thời gian và đưa bản ghi lên đầu thay vì tạo bản trùng. Nếu là
 * phim bộ thì lưu kèm episodeId gần nhất để "Tiếp tục xem" mở đúng tập. Chỉ
 * giữ tối đa GUEST_HISTORY_LIMIT phim.
 */
export function saveGuestHistory({ movieId, episodeId = "", progress = 0 }) {
  if (!movieId) return readGuestHistory();

  const row = {
    movieId: normalizeId(movieId),
    episodeId: episodeId ? normalizeId(episodeId) : "",
    progress: Math.max(0, Math.round(Number(progress) || 0)),
    watchedAt: new Date().toISOString().slice(0, 19),
  };

  const rest = readGuestHistory().filter(
    (item) => !sameId(item.movieId, movieId),
  );
  const next = [row, ...rest].slice(0, GUEST_HISTORY_LIMIT);

  try {
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* localStorage bị chặn: bỏ qua, không làm hỏng trang */
  }
  return next;
}

function getEpisodeId() {
  return new URLSearchParams(window.location.search).get("episode") || "";
}

function toast(title) {
  if (typeof Swal === "undefined") return;

  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    customClass: {
      popup:
        "bg-[#111111]! border! border-white/10! rounded-xl! shadow-2xl! w-[300px]!",
      title: "text-white! text-sm! font-semibold!",
      timerProgressBar: "bg-red-600!",
    },
  });
}

function readProgressSeconds(durationSeconds) {
  const video = document.querySelector("#watchVideo");
  if (!video) return 0;

  const byVideo = Number(video.currentTime);
  if (Number.isFinite(byVideo) && byVideo >= 0) return Math.round(byVideo);

  if (!durationSeconds) return 0;

  const bar = document.querySelector("#videoProgressBar");
  const track = document.querySelector("#progressTrackContainer");
  if (!bar || !track) return 0;

  const width = bar.getBoundingClientRect().width;
  const total = track.getBoundingClientRect().width;
  if (!total) return 0;

  const ratio = Math.min(1, Math.max(0, width / total));
  return Math.round(ratio * durationSeconds);
}

async function saveHistory(
  user,
  movieId,
  episodeId,
  progress,
  existingId = null,
) {
  const payload = {
    userId: normalizeId(user.id),
    movieId: normalizeId(movieId),
    progress: Math.max(0, Math.round(progress)),
    watchedAt: new Date().toISOString().slice(0, 19),
  };

  if (episodeId) payload.episodeId = normalizeId(episodeId);

  if (existingId) {
    return api.patch(`/histories/${existingId}`, payload);
  }

  return api.post("/histories", payload);
}

async function initWatchHistory() {
  const container = document.querySelector("#videoContainer");
  const video = document.querySelector("#watchVideo");
  // Chỉ chạy ở trang xem phim. Module này còn được home.js import để đọc lịch
  // sử khách, nên thoát sớm khi không có <video> để không gọi API/localStorage
  // thừa ở trang khác.
  if (!container || !video) return;

  const movieId =
    new URLSearchParams(window.location.search).get("id") ||
    container.dataset.movieId;
  const episodeId = getEpisodeId();
  if (!movieId) return;

  const user = getCurrentUser();

  let durationSeconds = 0;
  let historyId = null;
  let lastSavedProgress = -1;
  let saveQueued = false;
  let firstToastShown = false;

  if (user) {
    try {
      const movie = await api.get(`/movies/${movieId}`);
      durationSeconds = (Number(movie?.duration) || 0) * 60;
    } catch (error) {
      console.error("Lỗi tải phim:", error);
    }

    try {
      const histories = await api.get("/histories");
      const existing = (Array.isArray(histories) ? histories : []).find(
        (item) =>
          sameId(item.userId, user.id) &&
          sameId(item.movieId, movieId) &&
          sameId(item.episodeId || "", episodeId),
      );
      historyId = existing?.id ?? null;
      lastSavedProgress = Math.max(0, Number(existing?.progress) || 0);
    } catch (error) {
      console.error("Lỗi tải lịch sử xem:", error);
    }
  } else {
    // Khách: đọc lịch sử từ localStorage (dedup theo phim, tối đa 3).
    const existing = readGuestHistory().find((item) =>
      sameId(item.movieId, movieId),
    );
    lastSavedProgress = Math.max(0, Number(existing?.progress) || 0);
  }

  if (lastSavedProgress > 0) {
    video.addEventListener(
      "loadedmetadata",
      () => {
        const cap =
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.max(0, video.duration - 1)
            : lastSavedProgress;
        video.currentTime = Math.min(lastSavedProgress, cap);
      },
      { once: true },
    );
  }

  const persist = async (force = false) => {
    if (saveQueued) return;
    saveQueued = true;

    try {
      const next = readProgressSeconds(durationSeconds);
      if (!force && Math.abs(next - lastSavedProgress) < 5) return;

      if (user) {
        const saved = await saveHistory(
          user,
          movieId,
          episodeId,
          next,
          historyId,
        );
        historyId = saved?.id ?? historyId;
      } else {
        saveGuestHistory({ movieId, episodeId, progress: next });
      }
      lastSavedProgress = next;

      if (!firstToastShown && next > 0) {
        firstToastShown = true;
        await toast("Đã lưu vào lịch sử xem");
      }
    } catch (error) {
      console.error("Lỗi cập nhật tiến độ:", error);
    } finally {
      saveQueued = false;
    }
  };

  let autosaveTimer = null;

  const startAutosave = () => {
    if (autosaveTimer) return;
    autosaveTimer = window.setInterval(() => {
      persist(false);
    }, 10000);
  };

  const stopAutosave = () => {
    if (!autosaveTimer) return;
    window.clearInterval(autosaveTimer);
    autosaveTimer = null;
  };

  video.addEventListener("play", startAutosave);
  video.addEventListener("pause", () => {
    stopAutosave();
    persist(true);
  });
  video.addEventListener("ended", () => {
    stopAutosave();
    persist(true);
  });
  video.addEventListener("seeked", () => persist(false));

  window.addEventListener("beforeunload", () => {
    stopAutosave();
    persist(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persist(true);
    }
  });
}

initWatchHistory();
