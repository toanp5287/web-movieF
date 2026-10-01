/**
 * movie-detail.js  (/movie-detail?id=<id>)
 *
 * Trước đây toàn bộ trang chi tiết viết cứng nội dung Dune: Part Two, nên dù
 * bấm phim nào thì tên/poster/môt tả/đạo diễn/diễn viên vẫn là của Dune.
 * Nay trang đọc id từ query string và gắn dữ liệu thật từ data/db.json.
 *
 * - Có id hợp lệ : hiện đúng phim tương ứng.
 * - Thiếu id     : hiện thông báo "chưa chọn phim", không lộ nội dung phim nào.
 * - Id sai      : hiện thông báo "không tìm thấy phim".
 */

import {
  AVATARS_RESOLVED,
  POSTER_FALLBACK,
  actorImage,
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
  probeImage,
  qualityLabel,
  ratingCount,
  sameId,
} from "./movie-data.js";
import { renderMovieCards } from "./movie-card.js";
import api from "../api.js";

const bind = (name, root = document) => root.querySelector(`[data-bind="${name}"]`);
const REVIEW_TEXT = {
  1: "1/5 - Không thích",
  2: "2/5 - Tạm được",
  3: "3/5 - Khá ổn",
  4: "4/5 - Rất hay",
  5: "5/5 - Cực phẩm đỉnh cao",
};

const setText = (name, value) => {
  const el = bind(name);
  if (el) el.textContent = value;
  return el;
};

const setHtml = (name, value) => {
  const el = bind(name);
  if (el) el.innerHTML = value;
  return el;
};

/** Ẩn/hiện một khối theo điều kiện có nội dung hay không. */
const setVisible = (name, visible) => {
  const el = bind(name);
  if (el) el.hidden = !visible;
  return el;
};

/** Bỏ ẩn nội dung phim sau khi đã xác nhận id hợp lệ. */
function showMovieBody() {
  const body = document.querySelector('[data-metric="movie-body"]');
  if (body) body.classList.remove("hidden");
  const panel = document.querySelector('[data-metric="movie-not-found"]');
  if (panel) panel.classList.add("hidden");
}

/* ------------------------------------------------------------------ *
 * 1. TRẠNG THÁI KHÔNG TÌM THẤY PHIM
 * ------------------------------------------------------------------ */

function showNotFound(title, reason) {
  const body = document.querySelector('[data-metric="movie-body"]');
  const panel = document.querySelector('[data-metric="movie-not-found"]');
  if (body) body.classList.add("hidden");
  if (panel) panel.classList.remove("hidden");

  const t = document.querySelector('[data-metric="not-found-title"]');
  if (t) t.textContent = title;
  const r = document.querySelector('[data-metric="not-found-reason"]');
  if (r) r.textContent = reason;

  document.title = `${title} · MovieF`;
  // Dọn sạch tiêu đề phim cũ khỏi tab trình duyệt
  document.querySelectorAll("[data-bind='title']").forEach((el) => {
    el.textContent = title;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ------------------------------------------------------------------ *
 * 2. CÁC KHỐI NỘI DUNG
 * ------------------------------------------------------------------ */

/** Poster + nền ảnh lớn. */
async function renderMedia(movie) {
  const poster = bind("poster");
  if (poster) {
    poster.src = movie.poster || POSTER_FALLBACK;
    poster.alt = `Poster phim ${movie.title}`;
    poster.dataset.fallback = POSTER_FALLBACK;
    poster.removeAttribute("data-alt");
  }

  // db.json trỏ backdrop tới các file "-bg.jpg" chưa tồn tại, nên chỉ dùng khi
  // kiểm tra thật sự là ảnh; bằng không giữ nền chung của trang.
  const backdrop = bind("backdrop");
  if (backdrop && movie.backdrop && (await probeImage(movie.backdrop))) {
    backdrop.style.backgroundImage = `url("${movie.backdrop}")`;
  }

  // Tương tự với trailer: db.json có đường dẫn nhưng file thường không tồn tại,
  // nút "Trailer" chỉ hiện khi xác minh được media thật.
  const hasTrailer = Boolean(movie.trailer) && (await probeImage(movie.trailer));
  setVisible("trailer", hasTrailer);
}

/** Tên phim, năm, thể loại, đạo diễn, diễn viên, mô tả. */
function renderHeadline(movie, catalog) {
  document.title = `${movie.title}${movie.year ? ` (${movie.year})` : ""} · MovieF`;

  setText("title", movie.year ? `${movie.title} (${movie.year})` : movie.title);

  // db.json chỉ có một tên phim nên không hiện tên gốc riêng.
  setVisible("original-title", false);

  const quality = qualityLabel(movie);
  setText("quality", quality);
  setVisible("quality-badge", Boolean(quality));

  setText("year", movie.year ? String(movie.year) : "");
  setVisible("sep-1", Boolean(movie.year));

  const duration = formatDuration(movie.duration);
  setText("duration", duration || "");
  setVisible("sep-2", Boolean(movie.year && duration));

  setText("country", movie.country || "");
  if (movie.country) {
    setText("country", COUNTRY_LABEL[countryKey(movie.country)] || movie.country);
  }

  // Thể loại: chỉ hiện khi db.json có genre khớp bảng `genres`.
  const genres = genreNames(movie, catalog.genres);
  const genresEl = setHtml(
    "genres",
    genres
      .map(
        (name) =>
          `<span class="px-3 py-1 rounded-md bg-surface-container-high text-on-surface font-title-sm text-title-sm">${escapeHtml(
            name,
          )}</span>`,
      )
      .join(""),
  );
  if (genresEl) genresEl.hidden = genres.length === 0;

  // Đạo diễn + diễn viên chính
  const rows = [];
  if (movie.director) {
    rows.push(
      `<span class="text-on-surface-variant">Đạo diễn:</span> ${escapeHtml(movie.director)}`,
    );
  }
  if (movie.actors.length) {
    rows.push(
      `<span class="text-on-surface-variant">Diễn viên chính:</span> ${escapeHtml(
        movie.actors.join(", "),
      )}`,
    );
  }
  const credits = setHtml("credits", rows.join("<br />"));
  if (credits) credits.hidden = rows.length === 0;

  // Mô tả: phim chưa có nội dung thì ẩn hẳn khối, không in dòng báo thiếu.
  const desc = setText("description", movie.description || "");
  if (desc) desc.hidden = !movie.description;

  // Nút hành động
  const watch = bind("watch");
  if (watch) watch.href = `/watch?id=${encodeURIComponent(movie.id)}`;

  const favBtn = document.getElementById("favorite-toggle");
  if (favBtn) favBtn.dataset.movieId = String(movie.id);
}

/** Ánh xạ quốc gia trong db.json (đều là "USA"/"Japan") sang tên tiếng Việt. */
const COUNTRY_LABEL = { USA: "Mỹ", JAPAN: "Nhật Bản" };
const countryKey = (value) => String(value).trim().toUpperCase();

/** Điểm đánh giá lấy từ bảng `reviews`. */
function renderRating(movie, catalog) {
  const avg = averageRating(movie, catalog.reviews);
  const count = ratingCount(movie, catalog.reviews);
  setVisible("rating", avg !== null);
  if (avg === null) return;

  // reviews dùng thang 1-5, giao diện hiển thị thang 10.
  setText("rating-score", (avg * 2).toFixed(1));
  setText("rating-count", `(${count} lượt đánh giá)`);
}

/** Khối "Điểm đánh giá khán giả" + thanh phân bố sao. */
function renderRatingSummary(movie, catalog) {
  const box = bind("rating-summary");
  if (!box) return;
  const avg = averageRating(movie, catalog.reviews);
  const count = ratingCount(movie, catalog.reviews);

  const scoreEl = box.querySelector('[data-bind="summary-score"]');
  if (scoreEl) scoreEl.textContent = avg === null ? "--" : avg.toFixed(1);

  const noteEl = box.querySelector('[data-bind="summary-note"]');
  if (noteEl) {
    noteEl.textContent =
      avg === null
        ? "Chưa có đánh giá nào cho phim này"
        : `Dựa trên ${count} lượt đánh giá trong thư viện`;
  }

  const starsEl = box.querySelector('[data-bind="summary-stars"]');
  if (starsEl) {
    const filled = avg === null ? 0 : Math.round(avg);
    starsEl.innerHTML = Array.from({ length: 5 }, (_, i) => {
      const state = i < filled ? "star" : "star_outline";
      const style = i < filled ? " FILL 1" : "";
      return `<span class="material-symbols-outlined text-2xl" style="font-variation-settings: &quot;${style.trim()}&quot;">${state}</span>`;
    }).join("");
  }

  const barsEl = box.querySelector('[data-bind="summary-bars"]');
  if (barsEl) {
    const counts = [5, 4, 3, 2, 1].map(
      (star) =>
        catalog.reviews.filter(
          (r) => sameId(r.movieId, movie.id) && Number(r.rating) === star,
        ).length,
    );
    const max = Math.max(1, ...counts);
    barsEl.innerHTML = counts
      .map(
        (n, i) => `
                  <div class="flex items-center gap-3 w-full">
                    <span class="font-label-md text-label-md text-on-surface-variant w-8">${5 - i} sao</span>
                    <div class="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden">
                      <div class="h-full bg-secondary rounded-full" style="width: ${(n / max) * 100}%"></div>
                    </div>
                    <span class="font-label-md text-label-md text-on-surface-variant w-6 text-right">${n}</span>
                  </div>`,
      )
      .join("");
  }
}

/** Diễn viên & đạo diễn: ảnh thật nếu có, không thì dùng avatar chữ cái đầu. */
function renderCast(movie, catalog) {
  const grid = bind("cast");
  if (!grid) return;

  const people = [];
  if (movie.director) people.push({ name: movie.director, role: "Đạo diễn" });
  movie.actors.forEach((name) => people.push({ name, role: "Diễn viên" }));

  if (!people.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-on-surface-variant font-body-sm text-body-sm py-6">Chưa có thông tin diễn viên cho phim này.</p>`;
    return;
  }

  grid.innerHTML = people
    .map(
      ({ name, role }) => `
            <div class="flex flex-col items-center text-center p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group">
              <div class="w-24 h-24 rounded-full overflow-hidden mb-3 shadow-lg shadow-black/40">
                <img
                  alt="Ảnh ${escapeHtml(name)}"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  data-fallback="${actorImage(catalog, name)}"
                  decoding="async"
                  loading="lazy"
                  src="${actorImage(catalog, name)}"
                />
              </div>
              <h3 class="font-title-sm text-title-sm text-on-surface font-semibold truncate w-full">${escapeHtml(name)}</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant truncate w-full mt-0.5">${escapeHtml(role)}</p>
            </div>`,
    )
    .join("");
}

/** Bình luận lấy từ bảng `reviews` (chỉ nhận status = visible). */
function renderReviews(movie, catalog) {
  const list = bind("reviews");
  if (!list) return;

  const rows = catalog.reviews.filter(
    (r) => sameId(r.movieId, movie.id) && String(r.status ?? "visible") === "visible",
  );
  const sessionUser = getCurrentUser();

  if (!rows.length) {
    list.innerHTML = `<div class="p-5 rounded-xl bg-surface-container-low flex flex-col items-center text-center gap-2">
              <span class="material-symbols-outlined text-3xl text-on-surface-variant/50">rate_review</span>
              <p class="font-title-sm text-title-sm text-on-surface">Chưa có bình luận nào</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Hãy là người đầu tiên viết cảm nhận về phim này.</p>
            </div>`;
    return;
  }

  list.innerHTML = rows
    .map((r) => {
      const user = catalog.users?.find((u) => sameId(u.id, r.userId));
      const name = user?.fullname || user?.username || "Người dùng";
      const rating = Number(r.rating) || 0;
      const mine = Boolean(sessionUser) && sameId(sessionUser.id, r.userId);
      return `
                <div class="p-5 rounded-xl bg-surface-container-low flex flex-col gap-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <img
                        alt="Ảnh đại diện ${escapeHtml(name)}"
                        class="w-10 h-10 rounded-full object-cover bg-surface-container-high"
                        data-fallback="/images/avatar/default.svg"
                        decoding="async"
                        loading="lazy"
                        src="/images/avatar/default.svg"
                      />
                      <div>
                        <h4 class="font-title-sm text-title-sm text-on-surface font-semibold">${escapeHtml(name)}</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                          <div class="flex text-secondary text-sm">
                            ${Array.from({ length: 5 }, (_, i) => {
                              const filled = i < Math.round(rating);
                              return `<span class="material-symbols-outlined text-sm" style="font-variation-settings: &quot;${filled ? "FILL 1" : ""}&quot;">star</span>`;
                            }).join("")}
                          </div>
                          <span class="font-label-md text-label-md text-on-surface-variant">${rating}/5</span>
                        </div>
                      </div>
                    </div>
                    <span class="font-label-md text-label-md text-on-surface-variant">${escapeHtml(
                      formatDate(r.createdAt),
                    )}</span>
                  </div>
                  <p class="font-body-md text-body-md text-on-surface leading-relaxed">${escapeHtml(r.comment || "")}</p>
                  ${
                    mine
                      ? `<div class="flex items-center gap-2 pt-1">
                           <button
                             type="button"
                             class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                             data-review-edit="${escapeHtml(String(r.id))}"
                           >
                             Sửa
                           </button>
                           <button
                             type="button"
                             class="px-3 py-1.5 rounded-lg bg-error/20 text-error font-label-md text-label-md hover:bg-error/30 transition-colors"
                             data-review-delete="${escapeHtml(String(r.id))}"
                           >
                             Xoá
                           </button>
                         </div>`
                      : ""
                  }
                </div>`;
    })
    .join("");
}

/** "2026-09-12" -> "12/09/2026" */
function formatDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Phim tương tự — dùng chung thẻ phim với trang /movies. */
function renderRelated(movie, catalog) {
  const grid = bind("related");
  if (!grid) return;
  const related = findRelated(catalog, movie, 5);
  if (!related.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-on-surface-variant font-body-sm text-body-sm py-6">Chưa có phim nào tương tự.</p>`;
    return;
  }
  renderMovieCards(grid, related, catalog, { showDuration: false });
}

/** Thông số nhỏ: chất lượng / lượt xem / ngày thêm (đều lấy từ db.json). */
function renderSpecs(movie) {
  setText("spec-quality", qualityLabel(movie) || "--");
  setText("spec-views", formatViews(movie.views));
  setText("spec-created", formatDate(movie.createdAt) || "--");
}

/* ------------------------------------------------------------------ *
 * 3. KHỞI TẠO
 * ------------------------------------------------------------------ */

/** Phim đang hiển thị, dùng lại khi ảnh diễn viên dò xong. */
let currentMovie = null;
let currentCatalog = null;
let selectedRating = 5;
let editingReviewId = null;

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeId(id) {
  return /^\d+$/.test(String(id)) ? Number(id) : id;
}

function setStars(rating) {
  selectedRating = Math.min(5, Math.max(1, Number(rating) || 5));
  document.querySelectorAll(".star-btn").forEach((btn) => {
    const value = Number(btn.getAttribute("data-rating"));
    const icon = btn.querySelector(".material-symbols-outlined");
    if (!icon) return;
    icon.style.fontVariationSettings = value <= selectedRating ? "'FILL' 1" : "'FILL' 0";
  });
  const label = document.getElementById("rating-label");
  if (label) label.textContent = REVIEW_TEXT[selectedRating];
}

function fillComposerFromReview(review) {
  editingReviewId = review?.id ?? null;
  const comment = document.getElementById("comment-input");
  if (comment) comment.value = review?.comment || "";
  setStars(review?.rating || 5);

  const submit = document.getElementById("submit-comment");
  if (submit) submit.textContent = review ? "Cập nhật đánh giá" : "Gửi bình luận";
}

function notify(icon, title) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
    return;
  }
  window.alert(title);
}

function findMyReview(movie, catalog) {
  const user = getCurrentUser();
  if (!user) return null;
  return (
    catalog.reviews.find(
      (r) =>
        sameId(r.movieId, movie.id) &&
        sameId(r.userId, user.id) &&
        String(r.status ?? "visible") === "visible",
    ) || null
  );
}

function refreshReviewBlocks(movie, catalog) {
  renderRating(movie, catalog);
  renderRatingSummary(movie, catalog);
  renderReviews(movie, catalog);
}

function bindReviewActions(movie, catalog) {
  const list = bind("reviews");
  if (!list) return;

  list.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-review-edit]");
    if (editBtn) {
      const review = catalog.reviews.find((r) => sameId(r.id, editBtn.dataset.reviewEdit));
      if (!review) return;
      fillComposerFromReview(review);
      document.getElementById("comment-input")?.focus();
      document.getElementById("comment-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const removeBtn = event.target.closest("[data-review-delete]");
    if (!removeBtn) return;

    const review = catalog.reviews.find((r) => sameId(r.id, removeBtn.dataset.reviewDelete));
    if (!review) return;

    const ok = window.confirm("Bạn có chắc muốn xoá đánh giá này?");
    if (!ok) return;

    try {
      await api.delete(`/reviews/${review.id}`);
      catalog.reviews = catalog.reviews.filter((r) => !sameId(r.id, review.id));
      refreshReviewBlocks(movie, catalog);
      fillComposerFromReview(findMyReview(movie, catalog));
      notify("success", "Đã xoá đánh giá.");
    } catch (error) {
      console.error("[movie-detail] Xoá review lỗi:", error);
      notify("error", "Không thể xoá đánh giá, vui lòng thử lại.");
    }
  });
}

function bindReviewComposer(movie, catalog) {
  const stars = document.querySelectorAll(".star-btn");
  const submit = document.getElementById("submit-comment");
  const comment = document.getElementById("comment-input");
  if (!stars.length || !submit || !comment) return;

  stars.forEach((btn) => {
    btn.addEventListener("click", () => {
      setStars(btn.getAttribute("data-rating"));
    });
  });

  fillComposerFromReview(findMyReview(movie, catalog));

  submit.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) {
      notify("info", "Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }

    const content = comment.value.trim();
    if (!content) {
      notify("warning", "Vui lòng nhập nội dung đánh giá.");
      comment.focus();
      return;
    }

    const payload = {
      userId: normalizeId(user.id),
      movieId: normalizeId(movie.id),
      rating: selectedRating,
      comment: content,
      status: "visible",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    try {
      if (editingReviewId) {
        const updated = await api.patch(`/reviews/${editingReviewId}`, payload);
        catalog.reviews = catalog.reviews.map((r) =>
          sameId(r.id, editingReviewId) ? { ...r, ...updated } : r,
        );
        notify("success", "Đã cập nhật đánh giá.");
      } else {
        const created = await api.post("/reviews", payload);
        catalog.reviews.unshift(created);
        editingReviewId = created?.id ?? null;
        notify("success", "Đã gửi đánh giá.");
      }

      refreshReviewBlocks(movie, catalog);
      fillComposerFromReview(findMyReview(movie, catalog));
    } catch (error) {
      console.error("[movie-detail] Lưu review lỗi:", error);
      notify("error", "Không thể lưu đánh giá, vui lòng thử lại.");
    }
  });
}

// Ảnh diễn viên được dò ở nền để trang hiện nhanh; có ảnh thật thì vẽ lại khối cast.
window.addEventListener(AVATARS_RESOLVED, () => {
  if (!currentMovie || !currentCatalog) return;
  renderCast(currentMovie, currentCatalog);
  bindImageFallback(bind("cast"));
});

async function init() {
  const requestedId = new URLSearchParams(window.location.search).get("id");

  if (requestedId === null || String(requestedId).trim() === "") {
    showNotFound(
      "Chưa chọn phim",
      "Đường dẫn không có mã phim. Hãy chọn một phim từ danh sách để xem thông tin chi tiết.",
    );
    return;
  }

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error("[movie-detail] Không tải được data/db.json:", err);
    showNotFound(
      "Không tải được dữ liệu",
      "Không đọc được data/db.json. Vui lòng chạy `npm run dev` để bật máy chủ dữ liệu rồi tải lại trang.",
    );
    return;
  }

  const movie = findMovie(catalog, requestedId);
  if (!movie) {
    showNotFound(
      "Không tìm thấy phim",
      `Thư viện không có phim với mã “${requestedId}”. Phim này có thể đã bị gỡ bỏ hoặc đường dẫn không đúng.`,
    );
    return;
  }

  currentMovie = movie;
  currentCatalog = catalog;

  showMovieBody();
  await renderMedia(movie);
  renderHeadline(movie, catalog);
  renderRating(movie, catalog);
  renderRatingSummary(movie, catalog);
  renderSpecs(movie);
  renderCast(movie, catalog);
  renderReviews(movie, catalog);
  bindReviewActions(movie, catalog);
  bindReviewComposer(movie, catalog);
  renderRelated(movie, catalog);

  bindImageFallback(document);
  window.scrollTo({ top: 0, behavior: "instant" });

  console.info(`[movie-detail] Đã hiển thị phim #${movie.id} — ${movie.title}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
