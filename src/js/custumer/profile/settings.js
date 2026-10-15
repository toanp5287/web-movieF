/**
 * settings.js — Khởi tạo trang Cài đặt (/settings).
 */

import { $ } from "./utils.js";
import { bindModalDismiss, confirmDialog, toast } from "./ui.js";
import { loadSettings, signOut } from "./service.js";
import { renderHeader } from "./components/Header.js";
import { renderFooter } from "./components/Footer.js";
import { renderSettings, persistSetting } from "./components/Settings.js";
import { openPasswordModal } from "./components/PasswordModal.js";

const LAYOUT = `
  <div id="mfHeader"></div>
  <main class="mf-main mf-page">
    <div class="mf-container">
      <div style="max-width:820px;margin-inline:auto" data-settings-root></div>
    </div>
  </main>
  <div data-footer></div>
`;

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
    window.location.href = "/login";
  }, 700);
}

async function init() {
  bindModalDismiss();

  document.body.classList.add("mf-page", "antialiased");
  document.body.style.background = "#0b0d12";
  document.body.style.color = "#fff";

  $("#app").innerHTML = LAYOUT;
  renderHeader($("#mfHeader"), { activePath: "/settings" });
  renderFooter($("[data-footer]"));

  const settings = await loadSettings();

  renderSettings($("[data-settings-root]"), settings, {
    signedIn: Boolean(localStorage.getItem("currentUser")),
    onToggle: (key, value) => persistSetting(key, value),
    onChangePassword: openPasswordModal,
    onLogout: handleLogout,
  });
}

init();
