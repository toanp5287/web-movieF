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
  const bar = document.querySelector("#videoProgressBar");
  const track = document.querySelector("#progressTrackContainer");
  if (!bar || !track || !durationSeconds) return 0;

  const width = bar.getBoundingClientRect().width;
  const total = track.getBoundingClientRect().width;
  if (!total) return 0;

  const ratio = Math.min(1, Math.max(0, width / total));
  return Math.round(ratio * durationSeconds);
}

async function saveHistory(user, movieId, progress) {
  const histories = await api.get("/histories");
  const existing = histories.find(
    (item) => sameId(item.userId, user.id) && sameId(item.movieId, movieId),
  );

  const payload = {
    userId: normalizeId(user.id),
    movieId: normalizeId(movieId),
    progress: Math.max(Number(existing?.progress) || 0, Math.round(progress)),
    watchedAt: new Date().toISOString().slice(0, 19),
  };

  if (existing) {
    return api.patch(`/histories/${existing.id}`, payload);
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

  try {
    const movie = await api.get(`/movies/${movieId}`);
    durationSeconds = (Number(movie?.duration) || 0) * 60;
  } catch (error) {
    console.error("Lỗi tải phim:", error);
  }

  try {
    await saveHistory(user, movieId, readProgressSeconds(durationSeconds));
    await toast("Đã lưu vào lịch sử xem");
  } catch (error) {
    console.error("Lỗi lưu lịch sử xem:", error);
  }

  const track = document.querySelector("#progressTrackContainer");
  track?.addEventListener("click", () => {
    requestAnimationFrame(() => {
      saveHistory(user, movieId, readProgressSeconds(durationSeconds)).catch(
        (error) => console.error("Lỗi cập nhật tiến độ:", error),
      );
    });
  });
}

initWatchHistory();
