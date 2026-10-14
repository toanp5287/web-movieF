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

async function saveHistory(user, movieId, progress, existingId = null) {
  const payload = {
    userId: normalizeId(user.id),
    movieId: normalizeId(movieId),
    progress: Math.max(0, Math.round(progress)),
    watchedAt: new Date().toISOString().slice(0, 19),
  };

  if (existingId) {
    return api.patch(`/histories/${existingId}`, payload);
  }

  return api.post("/histories", payload);
}

async function initWatchHistory() {
  const container = document.querySelector("#videoContainer");
  if (!container) return;

  const movieId =
    new URLSearchParams(window.location.search).get("id") ||
    container.dataset.movieId;
  if (!movieId) return;

  const user = getCurrentUser();
  // Khách chưa đăng nhập vẫn được xem phim bình thường. Trước đây chỗ này gọi
  // redirectToLogin() nên bấm "Xem phim ngay" sẽ bị đá sang /login và không
  // xem được gì. Ghi lịch sử chỉ là tiện ích thêm cho người đã đăng nhập, nên
  // với khách thì bỏ qua thay vì chặn trang.
  if (!user) return;

  let durationSeconds = 0;
  let historyId = null;
  let lastSavedProgress = -1;
  let saveQueued = false;
  let firstToastShown = false;

  try {
    const movie = await api.get(`/movies/${movieId}`);
    durationSeconds = (Number(movie?.duration) || 0) * 60;
  } catch (error) {
    console.error("Lỗi tải phim:", error);
  }

  try {
    const histories = await api.get("/histories");
    const existing = histories.find(
      (item) => sameId(item.userId, user.id) && sameId(item.movieId, movieId),
    );
    historyId = existing?.id ?? null;
    lastSavedProgress = Math.max(0, Number(existing?.progress) || 0);

    const video = document.querySelector("#watchVideo");
    if (video && lastSavedProgress > 0) {
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
  } catch (error) {
    console.error("Lỗi tải lịch sử xem:", error);
  }

  const persist = async (force = false) => {
    if (saveQueued) return;
    saveQueued = true;

    try {
      const next = readProgressSeconds(durationSeconds);
      if (!force && Math.abs(next - lastSavedProgress) < 5) return;

      const saved = await saveHistory(user, movieId, next, historyId);
      historyId = saved?.id ?? historyId;
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

  const video = document.querySelector("#watchVideo");
  if (!video) return;

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
