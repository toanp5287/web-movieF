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
  watchUrl,
} from "./movie-data.js";
import { renderMovieCards } from "./movie-card.js";
import { initEpisodeList } from "./episode-list.js";
import { episodesInOrder, pickWatchResumeTarget } from "./episode-navigation.js";
import { isSeriesMovie, loadSeriesData } from "./series-data.js";
import api from "../api.js";

const bind = (name, root = document) =>
  root.querySelector(`[data-bind="${name}"]`);
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
  const hasTrailer =
    Boolean(movie.trailer) && (await probeImage(movie.trailer));
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
    setText(
      "country",
      COUNTRY_LABEL[countryKey(movie.country)] || movie.country,
    );
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

  const sort = document.getElementById("review-sort")?.value || "newest";
  const rows = catalog.reviews
    .filter(
      (r) =>
        sameId(r.movieId, movie.id) &&
        String(r.status ?? "visible") === "visible",
    )
    .sort((left, right) => {
      if (sort === "highest") return Number(right.rating) - Number(left.rating);
      if (sort === "lowest") return Number(left.rating) - Number(right.rating);
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
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
                  <div class="flex items-center gap-2 pt-1">
                    ${
                      mine
                        ? ""
                        : `<button
                      type="button"
                      class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                      data-review-report="${escapeHtml(String(r.id))}"
                    >
                      Báo cáo
                    </button>`
                    }
                    ${
                      mine
                        ? `<div class="flex items-center gap-2">
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
                  </div>
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
 * 2b. NÚT "XEM PHIM" CHO PHIM BỘ (chọn tập theo lịch sử xem)
 *
 * URL mở ra: /watch?id=<movieId>&episode=<episodeId> — ĐÚNG định dạng mà
 * liên kết trên thẻ tập dùng (xem episode-list.js), nên việc bấm nút này
 * đi qua đúng luồng trình phát tập của trang xem: phát video của tập, khôi
 * phục vị trí đã lưu, có nút tập trước/tiếp theo và tự chuyển tập.
 * Phim lẻ: không can thiệp — giữ nguyên liên kết /watch?id= có sẵn.
 * ------------------------------------------------------------------ */

/** URL mở đúng một tập, cùng định dạng với liên kết trên thẻ tập. */
function episodeWatchUrl(movieId, episodeId) {
  return `${watchUrl(movieId)}&episode=${encodeURIComponent(String(episodeId))}`;
}

/**
 * Chọn tập mở khi bấm "Xem phim" trên phim bộ.
 *
 * Chỉ ĐỌC dữ liệu mùa/tập và /histories — không tạo/cập nhật lịch sử.
 * Cách chọn tập nằm ở pickWatchResumeTarget (episode-navigation.js):
 * chưa có lịch sử -> Mùa 1 - Tập 1; đang xem dở -> tiếp tục tập đó;
 * đã xem hết -> tập tiếp theo (tập cuối thì mở lại tập cuối).
 *
 * @returns {Promise<{reason: "ok"|"load-error"|"no-episodes",
 *                    item?: {episode: object, season: object}}>}
 */
async function resolveSeriesWatchTarget(movie) {
  let data;
  try {
    data = await loadSeriesData();
  } catch (error) {
    console.error("[movie-detail] Không tải được mùa/tập:", error?.message);
    return { reason: "load-error" };
  }

  const ordered = episodesInOrder(data.seasons, data.episodes, movie.id);
  if (!ordered.length) return { reason: "no-episodes" };

  // Lịch sử xem của ĐÚNG người dùng hiện tại; khách chưa đăng nhập thì bỏ
  // qua và dùng tập mặc định — không lấy lịch sử của người khác.
  const user = getCurrentUser();
  let historyRows = [];
  if (user) {
    try {
      const rows = await api.get("/histories");
      if (Array.isArray(rows)) historyRows = rows;
    } catch (error) {
      // json-server không đọc được -> coi như chưa có lịch sử, vẫn mở được
      // tập mặc định thay vì chặn người dùng.
      console.warn("[movie-detail] Không đọc được lịch sử xem:", error?.message);
    }
  }

  const item = pickWatchResumeTarget(
    ordered,
    historyRows,
    movie.id,
    user?.id ?? null,
  );
  return item ? { reason: "ok", item } : { reason: "no-episodes" };
}

/** Thông báo khi không mở được tập phim (không tạo URL sai). */
function notifyWatchTargetError(reason) {
  if (reason === "load-error") {
    notify("error", "Không tải được danh sách tập phim, vui lòng thử lại.");
    return;
  }
  notify("info", "Phim này chưa có tập nào hợp lệ để xem.");
}

/**
 * Gắn sự kiện cho nút "Xem phim" của phim bộ.
 *
 * Bấm nút: chọn tập theo lịch sử rồi điều hướng tới tập đó — cùng một liên
 * kết mà bấm ảnh/nút phát của một tập trong danh sách tập tạo ra. Chưa chọn
 * xong thì không đi đâu cả; không có tập hợp lệ thì hiện thông báo thay vì
 * dẫn tới URL sai. Song song đó cập nhật href thật để chuột giữa / sao chép
 * liên kết vẫn mở đúng tập. Phim lẻ giữ nguyên hành vi liên kết có sẵn.
 */
function bindWatchButton(movie) {
  const watch = bind("watch");
  if (!watch || !isSeriesMovie(movie)) return;

  let resolving = false;

  watch.addEventListener("click", async (event) => {
    event.preventDefault();
    if (resolving) return;

    resolving = true;
    try {
      const target = await resolveSeriesWatchTarget(movie);
      if (target.reason !== "ok") {
        notifyWatchTargetError(target.reason);
        return;
      }
      window.location.href = episodeWatchUrl(movie.id, target.item.episode.id);
    } catch (error) {
      console.error("[movie-detail] Lỗi khi mở tập phim:", error);
      notify("error", "Không thể mở tập phim, vui lòng thử lại.");
    } finally {
      resolving = false;
    }
  });

  // Cập nhật href sau khi tra xong (không chặn người dùng — click vẫn tự chọn
  // tập lại từ đầu). Không có tập hợp lệ thì bỏ href để không tạo URL sai.
  resolveSeriesWatchTarget(movie)
    .then((target) => {
      if (target.reason === "ok") {
        watch.href = episodeWatchUrl(movie.id, target.item.episode.id);
      } else {
        watch.removeAttribute("href");
      }
    })
    .catch(() => {
      // Để nguyên href nền; bấm nút sẽ tự xử lý lại và báo lỗi nếu cần.
    });
}

/* ------------------------------------------------------------------ *
 * 3. KHỞI TẠO
 * ------------------------------------------------------------------ */

/** Phim đang hiển thị, dùng lại khi ảnh diễn viên dò xong. */
let currentMovie = null;
let currentCatalog = null;
let selectedRating = 5;
/** Chỉ có giá trị khi người dùng bấm Sửa (chế độ "edit"); null = chế độ "add". */
let editingReviewId = null;
/** Chống bấm Gửi/Cập nhật nhiều lần khi request trước chưa xong. */
let isReviewSubmitting = false;

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
    icon.style.fontVariationSettings =
      value <= selectedRating ? "'FILL' 1" : "'FILL' 0";
  });
  const label = document.getElementById("rating-label");
  if (label) label.textContent = REVIEW_TEXT[selectedRating];
}

/**
 * Quản lý trạng thái form bình luận — tách bạch hai chế độ:
 *  - "add" : form trống, nút "Gửi bình luận". Là trạng thái mặc định khi tải
 *    trang, sau khi gửi thành công và sau khi hủy/chỉnh sửa xong.
 *  - "edit": chỉ bật khi người dùng bấm nút Sửa trên bình luận của chính mình;
 *    hiển thị nội dung cũ trong form, nút "Cập nhật đánh giá" và nút "Hủy".
 * Trạng thái sửa KHÔNG TỰ BẬT khi tải trang hay sau khi gửi bình luận mới.
 */
function setComposerMode(mode, review = null) {
  const isEdit = mode === "edit" && Boolean(review);
  editingReviewId = isEdit ? review.id : null;

  const comment = document.getElementById("comment-input");
  if (comment) comment.value = isEdit ? review.comment || "" : "";
  setStars(isEdit ? review.rating || 5 : 5);

  const submit = document.getElementById("submit-comment");
  if (submit) submit.textContent = isEdit ? "Cập nhật đánh giá" : "Gửi bình luận";

  const cancel = document.getElementById("cancel-comment");
  if (cancel) cancel.hidden = !isEdit;
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

function refreshReviewBlocks(movie, catalog) {
  renderRating(movie, catalog);
  renderRatingSummary(movie, catalog);
  renderReviews(movie, catalog);
}

function bindReviewSort(movie, catalog) {
  const sort = document.getElementById("review-sort");
  if (!sort || sort.dataset.bound === "true") return;

  sort.dataset.bound = "true";
  sort.addEventListener("change", () => renderReviews(movie, catalog));
}

function bindReviewActions(movie, catalog) {
  const list = bind("reviews");
  if (!list) return;

  list.addEventListener("click", async (event) => {
    const reportBtn = event.target.closest("[data-review-report]");
    if (reportBtn) {
      const user = getCurrentUser();
      if (!user) {
        notify("info", "Vui lòng đăng nhập để báo cáo bình luận.");
        return;
      }

      const review = catalog.reviews.find((r) =>
        sameId(r.id, reportBtn.dataset.reviewReport),
      );
      if (!review) return;
      if (sameId(review.userId, user.id)) {
        notify("info", "Bạn không thể báo cáo bình luận của chính mình.");
        return;
      }

      const reason = window.prompt(
        "Nhập lý do báo cáo bình luận:\nVí dụ: spam, xúc phạm, nội dung không phù hợp.",
      );
      if (!reason || !reason.trim()) return;

      try {
        const reports = await api.get("/reviewReports");
        const existed = reports.some(
          (report) =>
            sameId(report.userId, user.id) &&
            sameId(report.reviewId, review.id),
        );
        if (existed) {
          notify("info", "Bạn đã báo cáo bình luận này trước đó.");
          return;
        }

        await api.post("/reviewReports", {
          userId: normalizeId(user.id),
          reviewId: normalizeId(review.id),
          movieId: normalizeId(movie.id),
          reason: reason.trim(),
          status: "pending",
          createdAt: new Date().toISOString().slice(0, 10),
        });
        notify("success", "Đã gửi báo cáo bình luận.");
      } catch (error) {
        console.error("[movie-detail] Báo cáo review lỗi:", error);
        notify("error", "Không thể gửi báo cáo, vui lòng thử lại.");
      }
      return;
    }

    const editBtn = event.target.closest("[data-review-edit]");
    if (editBtn) {
      const user = getCurrentUser();
      const review = catalog.reviews.find((r) =>
        sameId(r.id, editBtn.dataset.reviewEdit),
      );
      if (!review) return;
      if (!user || !sameId(review.userId, user.id)) {
        notify("info", "Bạn chỉ có thể sửa đánh giá của chính mình.");
        return;
      }
      setComposerMode("edit", review);
      document.getElementById("comment-input")?.focus();
      document
        .getElementById("comment-input")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const removeBtn = event.target.closest("[data-review-delete]");
    if (!removeBtn) return;

    const user = getCurrentUser();
    const review = catalog.reviews.find((r) =>
      sameId(r.id, removeBtn.dataset.reviewDelete),
    );
    if (!review) return;
    if (!user || !sameId(review.userId, user.id)) {
      notify("info", "Bạn chỉ có thể xoá đánh giá của chính mình.");
      return;
    }

    const ok = window.confirm("Bạn có chắc muốn xoá đánh giá này?");
    if (!ok) return;

    try {
      await api.delete(`/reviews/${review.id}`);
      catalog.reviews = catalog.reviews.filter((r) => !sameId(r.id, review.id));
      // Đang sửa đúng bình luận vừa xoá thì thoát chế độ sửa, không tự nạp
      // bình luận khác vào form.
      if (editingReviewId && sameId(editingReviewId, review.id)) {
        setComposerMode("add");
      }
      refreshReviewBlocks(movie, catalog);
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
  const cancel = document.getElementById("cancel-comment");
  const comment = document.getElementById("comment-input");
  if (!stars.length || !submit || !comment) return;

  stars.forEach((btn) => {
    btn.addEventListener("click", () => {
      setStars(btn.getAttribute("data-rating"));
    });
  });

  // Tải trang luôn ở chế độ thêm mới — không tự pre-fill hay bật "Cập nhật";
  // người dùng có thể bình luận nhiều lần, mỗi lần gửi là một bản ghi mới.
  setComposerMode("add");

  cancel?.addEventListener("click", () => {
    setComposerMode("add");
    comment.focus();
  });

  submit.addEventListener("click", async () => {
    if (isReviewSubmitting) return;

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

    isReviewSubmitting = true;
    submit.disabled = true;
    try {
      if (editingReviewId) {
        const target = catalog.reviews.find((r) =>
          sameId(r.id, editingReviewId),
        );
        if (!target || !sameId(target.userId, user.id)) {
          notify("error", "Không tìm thấy đánh giá của bạn để cập nhật.");
          setComposerMode("add");
          return;
        }
        const updated = await api.patch(`/reviews/${editingReviewId}`, payload);
        catalog.reviews = catalog.reviews.map((r) =>
          sameId(r.id, editingReviewId) ? { ...r, ...updated } : r,
        );
        notify("success", "Đã cập nhật đánh giá.");
      } else {
        const created = await api.post("/reviews", payload);
        if (created?.id != null) catalog.reviews.unshift(created);
        notify("success", "Đã gửi bình luận.");
      }

      refreshReviewBlocks(movie, catalog);
      // Gửi xong hay cập nhật xong đều về trạng thái bình thường (chế độ
      // thêm mới, form trống) — không kẹt lại ở chế độ sửa.
      setComposerMode("add");
    } catch (error) {
      console.error("[movie-detail] Lưu review lỗi:", error);
      notify("error", "Không thể lưu đánh giá, vui lòng thử lại.");
    } finally {
      isReviewSubmitting = false;
      submit.disabled = false;
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
  bindWatchButton(movie);
  renderRating(movie, catalog);
  renderRatingSummary(movie, catalog);
  renderSpecs(movie);
  renderCast(movie, catalog);
  renderReviews(movie, catalog);
  bindReviewSort(movie, catalog);
  bindReviewActions(movie, catalog);
  bindReviewComposer(movie, catalog);
  renderRelated(movie, catalog);

  // Chức năng 2: chỉ phim bộ có mùa/tập; lỗi dữ liệu không làm trang crash.
  try {
    await initEpisodeList(movie);
  } catch (error) {
    console.error("[movie-detail] Lỗi khi render danh sách tập:", error);
  }

  bindImageFallback(document);
  window.scrollTo({ top: 0, behavior: "instant" });

  console.info(`[movie-detail] Đã hiển thị phim #${movie.id} — ${movie.title}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
