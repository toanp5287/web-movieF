/**
 * home.js  (/)
 *
 * Trang chủ có 22 thẻ phim viết cứng, tất cả đều trỏ tới "/movie-detail" mà
 * không có ?id=. Bấm vào thẻ nào cũng mở trang chi tiết chung — trước đây nội
 * dung lại là của Dune. Nay mỗi thẻ được gắn id đúng với phim đó trong
 * data/db.json.
 *
 * Cách khớp dữ liệu:
 *  - Ưu tiên tên file poster của thẻ (ví dụ "dune-2.jpg") vì tiêu đề trên
 *    home.html đã bản địa hoá sang tiếng Việt, còn db.json giữ tiếng Anh.
 *  - Với các thẻ chỉ có nút chữ (không có poster), dùng aria-label của thẻ cha.
 *  - Thẻ nào khớp không được thì BỎ CHẠM vào href và khoá lại (aria-disabled).
 *    Tuyệt đối không dẫn sang /movies: mở nhầm trang danh sách khiến khách
 *    tưởng phim bị lỗi, nên thà không bấm được còn hơn sang sai trang.
 */

import { bindImageFallback, detailUrl, loadCatalog } from "./movie-data.js";

/** Tên file poster trong một khối (ưu tiên background-image, sau đó mới <img>). */
function posterIn(root) {
  if (!root) return "";
  for (const el of root.querySelectorAll("[style*='background-image']")) {
    const m = /url\(["']?([^"')]+)["']?\)/.exec(el.getAttribute("style") || "");
    if (m && m[1].includes("/images/movies/")) return m[1];
  }
  for (const img of root.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src") || "";
    if (src.includes("/images/movies/")) return src;
  }
  return "";
}

/** Tên phim lấy từ aria-label kiểu "Xem chi tiết phim Interstellar (2014)". */
function titleFromLabels(root) {
  if (!root) return "";
  for (const el of root.querySelectorAll("[aria-label]")) {
    const m = /chi\s+tiet\s+phim\s+(.+)/i.exec(el.getAttribute("aria-label") || "");
    if (m) return m[1];
  }
  return "";
}

/** "Interstellar (2014)" -> "interstellar" để so khớp với db.json. */
function normalizeTitle(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(\s*\d{4}\s*\)/g, "") // bỏ năm trong ngoặc
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Tìm phim tương ứng với một thẻ trên home. */
function resolveMovie(anchor, byPoster, byTitle, byId) {
  // 1. Thẻ khai báo thẳng data-movie-id (nút "Xem phim ngay" của banner, thẻ
  //    "Tiếp tục xem"). Đây là nguồn chính xác nhất nên ưu tiên tuyệt đối —
  //    trước đây các nút này không có poster/aria-label riêng nên bị coi là
  //    "không khớp" và bị gỡ href, khiến nút chết hoàn toàn.
  const declared = anchor.getAttribute("data-movie-id");
  if (declared !== null && byId.has(String(declared).trim())) {
    return byId.get(String(declared).trim());
  }

  // 2. Khớp theo tên file poster của thẻ.
  const poster = posterIn(anchor);
  if (poster) {
    const key = poster.split("/").pop().toLowerCase();
    if (byPoster.has(key)) return byPoster.get(key);
  }

  // 3. Thẻ chỉ có nút chữ: dò aria-label trong chính nó rồi trong thẻ cha gần nhất.
  let host = anchor;
  for (let depth = 0; depth < 4; depth++) {
    const title = titleFromLabels(host) || titleFromLabels(anchor);
    if (title) {
      const key = normalizeTitle(title);
      if (byTitle.has(key)) return byTitle.get(key);
    }
    if (!host.parentElement) break;
    host = host.parentElement;
  }
  return null;
}

async function init() {
  // Gồm cả nút "Xem ngay" trỏ /watch: chúng cũng phải mang id để không mở
  // nhầm phim. Thẻ phim ở các mục "Tiếp tục xem" đã đổi sang /movie-detail.
  const anchors = [
    ...document.querySelectorAll('a[href="/movie-detail"]'),
    ...document.querySelectorAll('a[href="/watch"]'),
  ];
  if (!anchors.length) return;

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error("[home] Không tải được data/db.json, giữ nguyên liên kết cũ:", err);
    return;
  }

  // Chỉ dùng phim thực sự hiển thị được (đã lọc trong loadCatalog).
  const byPoster = new Map();
  const byTitle = new Map();
  const byId = new Map();
  for (const m of catalog.movies) {
    if (m.poster) byPoster.set(m.poster.split("/").pop().toLowerCase(), m);
    byTitle.set(normalizeTitle(m.title), m);
    byId.set(String(m.id).trim(), m);
  }

  let linked = 0;
  const unresolved = [];

  for (const anchor of anchors) {
    const isWatch = anchor.getAttribute("href") === "/watch";
    const movie = resolveMovie(anchor, byPoster, byTitle, byId);

    if (!movie) {
      // Không dẫn sang trang khác. Bỏ href và chặn click để không mở sai phim.
      anchor.removeAttribute("href");
      anchor.setAttribute("aria-disabled", "true");
      anchor.classList.add("opacity-50", "cursor-not-allowed");
      anchor.addEventListener("click", (e) => e.preventDefault());
      unresolved.push(anchor.getAttribute("aria-label") || anchor.textContent.trim().slice(0, 40));
      continue;
    }

    anchor.href = isWatch
      ? `/watch?id=${encodeURIComponent(movie.id)}`
      : detailUrl(movie.id);
    anchor.dataset.movieId = String(movie.id);
    linked++;
  }

  bindImageFallback(document);

  if (unresolved.length) {
    console.warn(
      "[home] Không tìm thấy dữ liệu cho các thẻ sau, đã khoá liên kết thay vì chuyển sang trang khác:",
      unresolved,
    );
  }
  console.info(`[home] Đã gắn id cho ${linked}/${anchors.length} liên kết phim.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
