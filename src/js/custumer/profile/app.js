/**
 * app.js — Điều phối trang Cá nhân (/profile).
 *
 * Luồng:
 *   1. Dựng layout tĩnh (header, sidebar, tabs, panel, footer).
 *   2. Nạp dữ liệu qua service → đổ vào store.
 *   3. store phát sự kiện → render lại đúng phần cần đổi.
 *
 * Mọi tương tác (tab, yêu thích, xoá lịch sử, modal, đổi mật khẩu) đều nằm ở đây
 * nên component chỉ lo phần hiển thị.
 */

import { $ } from "./utils.js";
import { icon } from "./icons.js";
import { bindModalDismiss, confirmDialog, toast } from "./ui.js";
import { store, TABS } from "./store.js";
import { requireAuth } from "../auth-session.js";
import {
  clearHistory,
  isSignedIn,
  removeFromCollection,
  removeHistoryItem,
  removeReview,
  toggleFavorite,
  toggleWatchLater,
  signOut,
} from "./service.js";

import { renderHeader } from "./components/Header.js";
import { renderFooter } from "./components/Footer.js";
import { renderProfileHeader } from "./components/ProfileHeader.js";
import { renderStats } from "./components/ProfileStats.js";
import { renderNavigation } from "./components/ProfileNavigation.js";
import { renderBottomNav, renderSidebar } from "./components/ProfileSidebar.js";
import { renderContinueWatching } from "./components/ContinueWatching.js";
import { renderFavoriteMovies } from "./components/FavoriteMovies.js";
import { renderWatchHistory } from "./components/WatchHistory.js";
import { renderReviewList } from "./components/ReviewList.js";
import { mountEditProfileModal } from "./components/EditProfileModal.js";
import { openPasswordModal } from "./components/PasswordModal.js";

/* ------------------------------------------------------------------ *
 * Layout tĩnh
 * ------------------------------------------------------------------ */

const LAYOUT = `
  <div id="mfHeader"></div>

  <main class="mf-main mf-page">
    <div class="mf-container">
      <div data-demo-banner></div>

      <div
        data-page-layout
        style="display:grid;gap:22px;align-items:start"
      >
        <aside data-sidebar class="mf-hide-mobile" style="position:sticky;top:96px"></aside>

        <div style="min-width:0;display:flex;flex-direction:column;gap:20px">
          <div data-profile-header></div>
          <div data-stats></div>
          <nav data-navigation></nav>
          <section data-panel role="tabpanel" aria-live="polite"></section>
        </div>
      </div>
    </div>
  </main>

  <div data-bottom-nav></div>
  <div data-footer></div>
`;

/** Chèn style nhỏ dùng riêng cho trang (không nhét vào style.css toàn cục). */
const PAGE_STYLES = `
  @media (max-width: 1023px){ .mf-hide-mobile{display:none} }
  @media (min-width: 1024px){
    [data-page-layout]{ grid-template-columns: 264px minmax(0,1fr) }
  }
  @media (min-width: 1440px){
    [data-page-layout]{ grid-template-columns: 288px minmax(0,1fr) }
  }
  @media (min-width: 1024px){
    [data-bottom-nav]{ display:none }
    main{ padding-bottom: 40px }
  }
`;

function injectStyles() {
  if (document.getElementById("mf-page-styles")) return;
  const tag = document.createElement("style");
  tag.id = "mf-page-styles";
  tag.textContent = PAGE_STYLES;
  document.head.appendChild(tag);
}

/* ------------------------------------------------------------------ *
 * Render theo state
 * ------------------------------------------------------------------ */

const countsOf = (state) => ({
  history: state.history.length,
  favorites: state.favorites.length,
  watchLater: state.watchLater.length,
  reviews: state.reviews.length,
  continueWatching: state.continueWatching.length,
});

function renderBanner(state) {
  const node = $("[data-demo-banner]");
  if (!node) return;

  if (state.mode === "api") {
    node.innerHTML = "";
    return;
  }

  const signedIn = isSignedIn();
  node.innerHTML = `
    <div
      class="mf-card mf-enter"
      style="display:flex;align-items:center;gap:12px;padding:13px 16px;margin-bottom:20px;border-color:rgba(255,32,40,.28);background:rgba(255,32,40,.06)"
    >
      <span class="mf-stat-ico" style="color:#ff8a8e;background:rgba(255,32,40,.16)">${icon("info", "text-[19px]")}</span>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#d7d9df;flex:1;min-width:0">
        ${
          signedIn
            ? "Chưa kết nối được máy chủ dữ liệu — đang hiển thị dữ liệu mẫu. Mọi thay đổi vẫn được lưu trên máy bạn."
            : "Bạn đang xem hồ sơ mẫu. <a href=\"/login\" class=\"mf-link-brand\">Đăng nhập</a> để đồng bộ dữ liệu thật của tài khoản MovieF."
        }
      </p>
      <button type="button" class="mf-icon-btn" data-dismiss-banner aria-label="Đóng thông báo">${icon("close", "text-[18px]")}</button>
    </div>
  `;

  node.querySelector("[data-dismiss-banner]")?.addEventListener("click", () => {
    node.innerHTML = "";
  });
}

function renderAll() {
  const state = store.state;
  if (!state.ready) return;

  renderBanner(state);
  renderProfileHeader($("[data-profile-header]"), state.profile, {
    onEdit: () => editModal.open(state.profile, onProfileSaved),
    onPassword: openPasswordModal,
    onAvatar: () => editModal.open(state.profile, onProfileSaved),
  });
  renderStats($("[data-stats]"), state.stats, { onSelectTab: (tab) => switchTab(tab) });
  renderNavigation($("[data-navigation]"), { activeTab: state.activeTab, counts: countsOf(state) }, switchTab);
  renderSidebar(
    $("[data-sidebar]"),
    { activeTab: state.activeTab, counts: countsOf(state) },
    { onSelectTab: switchTab, onLogout: handleLogout },
  );
  renderBottomNav($("[data-bottom-nav]"), { activeTab: state.activeTab, counts: countsOf(state) }, switchTab);
  renderPanel();
}

const onProfileSaved = (profile) => {
  store.set({ profile });
  renderProfileHeader($("[data-profile-header]"), store.state.profile, {
    onEdit: () => editModal.open(store.state.profile, onProfileSaved),
    onPassword: openPasswordModal,
    onAvatar: () => editModal.open(store.state.profile, onProfileSaved),
  });
  renderHeader($("#mfHeader"), { activePath: "/profile" });
  toast("Hồ sơ đã được cập nhật.", "success");
};

function renderPanel() {
  const state = store.state;
  const panel = $("[data-panel]");
  if (!panel) return;

  panel.setAttribute("aria-labelledby", `tab-${state.activeTab}`);

  switch (state.activeTab) {
    case "history":
      panel.innerHTML = sectionShell("Lịch sử xem", "Những phim bạn đã xem gần đây.", "history");
      renderWatchHistory($("[data-history-body]"), {
        items: state.history,
        limit: state.historyLimit,
        total: state.history.length,
        canClear: state.history.length > 0,
      });
      break;

    case "favorites":
      panel.innerHTML = sectionShell("Phim yêu thích", `${state.favorites.length} phim đã lưu.`, "heart");
      renderFavoriteMovies(
        $("[data-collection-body]"),
        { movies: state.favorites, collection: "favorites", filter: state.favoriteFilter },
        { onFilter: (filter) => store.set({ favoriteFilter: filter }), onRemoveAll: clearFavorites },
      );
      break;

    case "watchLater":
      panel.innerHTML = sectionShell("Xem sau", `${state.watchLater.length} phim đang chờ bạn.`, "bookmark");
      renderFavoriteMovies(
        $("[data-collection-body]"),
        { movies: state.watchLater, collection: "watchLater", filter: state.favoriteFilter },
        { onFilter: (filter) => store.set({ favoriteFilter: filter }), onRemoveAll: clearWatchLater },
      );
      break;

    case "reviews":
      panel.innerHTML = sectionShell("Đánh giá của bạn", `${state.reviews.length} phim đã đánh giá.`, "star");
      renderReviewList($("[data-review-body]"), state.reviews);
      break;

    default:
      renderOverview(panel);
  }
}

function sectionShell(title, subtitle, iconName) {
  return `
    <div class="mf-card" style="padding:20px" data-section>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px">
        <span class="mf-stat-ico" style="color:#ff8a8e;background:rgba(255,32,40,.14)">${icon(iconName, "text-[19px]")}</span>
        <div style="min-width:0">
          <h2 class="mf-section-title" style="margin:0">${title}</h2>
          <p class="mf-muted" style="margin:3px 0 0;font-size:12.5px">${subtitle}</p>
        </div>
      </div>
      <div data-history-body></div>
      <div data-collection-body></div>
      <div data-review-body></div>
    </div>
  `;
}

function renderOverview(panel) {
  const state = store.state;
  const total = state.continueWatching.length;

  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <section class="mf-card" style="padding:20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">
          <div style="display:flex;align-items:flex-start;gap:12px;min-width:0">
            <span class="mf-stat-ico" style="color:#ff8a8e;background:rgba(255,32,40,.14)">${icon("play", "text-[19px]", { fill: true })}</span>
            <div style="min-width:0">
              <h2 class="mf-section-title" style="margin:0">Tiếp tục xem</h2>
              <p class="mf-muted" style="margin:3px 0 0;font-size:12.5px">
                ${total ? `${total} phim đang xem dở — tiếp tục ngay không mất tiến trình.` : "Bạn chưa có phim nào đang xem dở."}
              </p>
            </div>
          </div>
          ${
            total
              ? `<button type="button" class="mf-btn mf-btn-soft mf-btn-sm" data-goto-tab="history">
                  ${icon("history", "text-[15px]")} Lịch sử đầy đủ
                </button>`
              : ""
          }
        </div>
        <div data-continue-body></div>
      </section>

      <section class="mf-card" style="padding:20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">
          <div style="display:flex;align-items:flex-start;gap:12px;min-width:0">
            <span class="mf-stat-ico" style="color:#ff8a8e;background:rgba(255,32,40,.14)">${icon("heart", "text-[19px]", { fill: true })}</span>
            <div style="min-width:0">
              <h2 class="mf-section-title" style="margin:0">Phim yêu thích</h2>
              <p class="mf-muted" style="margin:3px 0 0;font-size:12.5px">
                ${state.favorites.length} phim đã lưu.
              </p>
            </div>
          </div>
          ${
            state.favorites.length
              ? `<button type="button" class="mf-btn mf-btn-soft mf-btn-sm" data-goto-tab="favorites">
                  ${icon("grid", "text-[15px]")} Xem tất cả
                </button>`
              : ""
          }
        </div>
        <div data-overview-favorites></div>
      </section>
    </div>
  `;

  renderContinueWatching($("[data-continue-body]"), state.continueWatching.slice(0, 4));
  renderFavoriteMovies(
    $("[data-overview-favorites]"),
    { movies: state.favorites.slice(0, 10), collection: "favorites", filter: "all" },
    { onFilter: () => switchTab("favorites") },
  );
}

/* ------------------------------------------------------------------ *
 * Hành động
 * ------------------------------------------------------------------ */

function switchTab(tabId) {
  if (!TABS.some((tab) => tab.id === tabId)) return;
  if (store.state.activeTab === tabId) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  store.set({ activeTab: tabId, historyLimit: 8 });
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tabId);
  window.history.replaceState(null, "", url);
}

async function handleLogout() {
  const ok = await confirmDialog({
    title: "Đăng xuất?",
    text: "Bạn sẽ cần đăng nhập lại để xem trang cá nhân và lịch sử xem.",
    okText: "Đăng xuất",
  });
  if (!ok) return;

  signOut();
  toast("Đã đăng xuất khỏi MovieF.", "success");
  setTimeout(() => {
    window.location.href = "/";
  }, 700);
}

async function refresh() {
  await store.reload();
}

async function handleToggleFavorite(movieId) {
  const willAdd = await toggleFavorite(movieId);
  await refresh();
  toast(willAdd ? "Đã thêm vào danh sách yêu thích." : "Đã bỏ khỏi danh sách yêu thích.", "success");
}

async function handleToggleWatchLater(movieId) {
  const willAdd = await toggleWatchLater(movieId);
  await refresh();
  toast(willAdd ? "Đã thêm vào danh sách xem sau." : "Đã bỏ khỏi danh sách xem sau.", "success");
}

async function handleRemoveHistory(id, title) {
  const ok = await confirmDialog({
    title: "Xoá khỏi lịch sử?",
    text: `Bạn có chắc muốn xoá "${title}" khỏi lịch sử xem không?`,
    okText: "Xoá",
  });
  if (!ok) return;

  await removeHistoryItem(id);
  await refresh();
  toast(`Đã xoá "${title}" khỏi lịch sử.`, "success");
}

async function handleClearHistory() {
  const ok = await confirmDialog({
    title: "Xoá toàn bộ lịch sử?",
    text: "Toàn bộ phim đã xem sẽ bị xoá và không thể khôi phục.",
    okText: "Xoá tất cả",
  });
  if (!ok) return;

  await clearHistory();
  await refresh();
  toast("Đã xoá toàn bộ lịch sử xem.", "success");
}

async function clearFavorites() {
  const ok = await confirmDialog({
    title: "Xoá danh sách yêu thích?",
    text: "Toàn bộ phim yêu thích sẽ bị xoá khỏi tài khoản của bạn.",
    okText: "Xoá tất cả",
  });
  if (!ok) return;

  for (const movie of [...store.state.favorites]) {
    await removeFromCollection("favorites", movie.id);
  }
  await refresh();
  toast("Đã xoá danh sách yêu thích.", "success");
}

async function clearWatchLater() {
  const ok = await confirmDialog({
    title: "Xoá danh sách xem sau?",
    text: "Toàn bộ phim trong danh sách xem sau sẽ bị xoá.",
    okText: "Xoá tất cả",
  });
  if (!ok) return;

  for (const movie of [...store.state.watchLater]) {
    await removeFromCollection("watchLater", movie.id);
  }
  await refresh();
  toast("Đã xoá danh sách xem sau.", "success");
}

async function handleRemoveReview(id, title) {
  const ok = await confirmDialog({
    title: "Xoá đánh giá?",
    text: `Đánh giá của bạn cho "${title}" sẽ bị xoá.`,
    okText: "Xoá",
  });
  if (!ok) return;

  await removeReview(id);
  await refresh();
  toast("Đã xoá đánh giá.", "success");
}

/* ------------------------------------------------------------------ *
 * Khởi tạo
 * ------------------------------------------------------------------ */

let editModal = null;

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target;

    const goto = target.closest("[data-goto-tab]");
    if (goto) {
      switchTab(goto.dataset.gotoTab);
      return;
    }

    const favBtn = target.closest('[data-action="toggle-favorite"]');
    if (favBtn) {
      handleToggleFavorite(favBtn.dataset.movieId);
      return;
    }

    const laterBtn = target.closest('[data-action="toggle-watch-later"]');
    if (laterBtn) {
      handleToggleWatchLater(laterBtn.dataset.movieId);
      return;
    }

    const historyBtn = target.closest('[data-action="remove-history"]');
    if (historyBtn) {
      handleRemoveHistory(historyBtn.dataset.id, historyBtn.dataset.title);
      return;
    }

    if (target.closest('[data-action="clear-history"]')) {
      handleClearHistory();
      return;
    }

    if (target.closest('[data-action="load-more"]')) {
      store.set({ historyLimit: store.state.historyLimit + 20 });
      return;
    }

    const reviewBtn = target.closest('[data-action="remove-review"]');
    if (reviewBtn) {
      handleRemoveReview(reviewBtn.dataset.id, reviewBtn.dataset.title);
    }
  });

  // Điều hướng bằng bàn phím trong khu vực nội dung.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".mf-poster-group");
    if (card && event.target === card) event.preventDefault();
  });
}

async function init() {
  /* Bảo vệ trang cá nhân: chưa đăng nhập -> về /login kèm thông báo.
     `?demo=1` vẫn xem được hồ sơ mẫu như trước. */
  const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
  if (!demoMode && !requireAuth({ message: "Vui lòng đăng nhập để tiếp tục." })) return;

  injectStyles();
  bindModalDismiss();
  bindGlobalEvents();

  document.body.classList.add("mf-page", "antialiased");
  document.body.style.background = "#0b0d12";
  document.body.style.color = "#fff";

  $("#app").innerHTML = LAYOUT;
  renderHeader($("#mfHeader"), { activePath: "/profile" });
  renderFooter($("[data-footer]"));
  editModal = mountEditProfileModal();

  const requested = new URLSearchParams(window.location.search).get("tab");
  const fromHash = window.location.hash.replace("#", "");
  const initial = TABS.some((tab) => tab.id === requested)
    ? requested
    : TABS.some((tab) => tab.id === fromHash)
      ? fromHash
      : "overview";
  store.set({ activeTab: initial });

  store.subscribe(() => {
    renderStats($("[data-stats]"), store.state.stats, { onSelectTab: switchTab });
    renderNavigation($("[data-navigation]"), { activeTab: store.state.activeTab, counts: countsOf(store.state) }, switchTab);
    renderSidebar(
      $("[data-sidebar]"),
      { activeTab: store.state.activeTab, counts: countsOf(store.state) },
      { onSelectTab: switchTab, onLogout: handleLogout },
    );
    renderBottomNav($("[data-bottom-nav]"), { activeTab: store.state.activeTab, counts: countsOf(store.state) }, switchTab);
    renderPanel();
  });

  await store.reload();
  renderHeader($("#mfHeader"), { activePath: "/profile" });
  renderAll();
}

init();
