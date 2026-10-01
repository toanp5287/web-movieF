/**
 * Settings.js — Trang Cài đặt: thông báo, phát lại, quyền riêng tư, giao diện
 * và các hành động tài khoản (đổi mật khẩu, đăng xuất).
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";
import { saveSettings } from "../service.js";

const SECTIONS = [
  {
    id: "notifications",
    title: "Thông báo",
    description: "Chọn những cập nhật bạn muốn nhận từ MovieF.",
    icon: "bell",
    items: [
      { key: "notifyNewMovie", label: "Phim mới", description: "Thông báo khi có phim mới được thêm vào MovieF." },
      { key: "notifyNewEpisode", label: "Tập mới", description: "Thông báo khi phim bộ bạn theo dõi có tập mới." },
      { key: "emailDigest", label: "Email tổng hợp", description: "Nhận email tổng hợp phim nổi bật mỗi tuần." },
    ],
  },
  {
    id: "playback",
    title: "Phát lại",
    description: "Tuỳ chỉnh trải nghiệm xem phim của bạn.",
    icon: "play",
    items: [
      { key: "autoplay", label: "Tự động phát tập tiếp theo", description: "Tự chuyển sang tập tiếp theo khi xem phim bộ." },
      { key: "autoHd", label: "Tự chọn chất lượng cao nhất", description: "Tự động chọn 4K/FHD dựa trên tốc độ mạng." },
    ],
  },
  {
    id: "privacy",
    title: "Quyền riêng tư",
    description: "Kiểm soát người khác nhìn thấy gì về bạn.",
    icon: "shield",
    items: [
      { key: "profilePublic", label: "Hồ sơ công khai", description: "Cho phép người dùng khác xem hồ sơ của bạn." },
      { key: "showWatchHistory", label: "Hiển thị lịch sử xem", description: "Hiển thị phim đã xem trên hồ sơ công khai." },
    ],
  },
  {
    id: "appearance",
    title: "Giao diện & trợ năng",
    description: "Điều chỉnh hiển thị cho phù hợp với bạn.",
    icon: "palette",
    items: [
      { key: "reduceMotion", label: "Giảm hiệu ứng chuyển động", description: "Hạn chế hoạt ảnh để dễ chịu hơn." },
    ],
  },
];

const toggleMarkup = (item, value) => `
  <div style="display:flex;align-items:center;gap:16px;padding:15px 0">
    <div style="min-width:0;flex:1">
      <p style="margin:0;font-size:14px;font-weight:600;color:#fff">${escapeHtml(item.label)}</p>
      <p class="mf-muted" style="margin:4px 0 0;font-size:12.5px;line-height:1.5">${escapeHtml(item.description)}</p>
    </div>
    <button
      type="button"
      class="mf-switch"
      role="switch"
      data-setting="${escapeHtml(item.key)}"
      aria-checked="${value ? "true" : "false"}"
      aria-label="${escapeHtml(item.label)}"
    ></button>
  </div>`;

function sectionMarkup(section, settings) {
  return `
    <section class="mf-card" style="padding:20px">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:6px">
        <span class="mf-stat-ico">${icon(section.icon, "text-[19px]")}</span>
        <div style="min-width:0">
          <h2 class="mf-section-title" style="margin:0">${escapeHtml(section.title)}</h2>
          <p class="mf-muted" style="margin:3px 0 0;font-size:12.5px">${escapeHtml(section.description)}</p>
        </div>
      </div>
      <div>
        ${section.items
          .map(
            (item, index) =>
              `${index ? `<div class="mf-divider" style="margin:0"></div>` : ""}${toggleMarkup(item, settings[item.key])}`,
          )
          .join("")}
      </div>
    </section>`;
}

/**
 * @param {string|HTMLElement} root
 * @param {object} settings
 * @param {{onToggle:(key:string,value:boolean)=>void, onChangePassword:Function, onLogout:Function}} handlers
 */
export function renderSettings(root, settings = {}, handlers = {}) {
  const signedIn = Boolean(handlers.signedIn);

  render(
    root,
    `
    <div style="display:flex;flex-direction:column;gap:18px">
      <header style="display:flex;flex-direction:column;gap:6px">
        <h1 class="mf-section-title" style="margin:0;font-size:24px">Cài đặt</h1>
        <p class="mf-muted" style="margin:0;font-size:13.5px">Quản lý thông báo, quyền riêng tư và bảo mật tài khoản MovieF.</p>
      </header>

      ${SECTIONS.map((section) => sectionMarkup(section, settings)).join("")}

      <section class="mf-card" id="mf-security" style="padding:20px;scroll-margin-top:90px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
          <span class="mf-stat-ico">${icon("lock", "text-[19px]")}</span>
          <div style="min-width:0">
            <h2 class="mf-section-title" style="margin:0">Bảo mật tài khoản</h2>
            <p class="mf-muted" style="margin:3px 0 0;font-size:12.5px">Đổi mật khẩu hoặc đăng xuất khỏi thiết bị này.</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="mf-btn mf-btn-primary mf-btn-sm" data-action="change-password">
            ${icon("key", "text-[16px]")} Đổi mật khẩu
          </button>
          <button type="button" class="mf-btn mf-btn-danger mf-btn-sm" data-action="logout">
            ${icon("logout", "text-[16px]")} Đăng xuất
          </button>
        </div>
        ${
          signedIn
            ? ""
            : `<p class="mf-muted" style="margin:12px 0 0;font-size:12.5px">
                Bạn đang xem ở chế độ khách. <a class="mf-link-brand" href="/login">Đăng nhập</a> để thay đổi cài đặt tài khoản thật.
              </p>`
        }
      </section>
    </div>
  `,
  );

  root.querySelectorAll("[data-setting]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-checked") !== "true";
      button.setAttribute("aria-checked", String(next));
      handlers.onToggle?.(button.dataset.setting, next);
    });
  });

  root.querySelector('[data-action="change-password"]')?.addEventListener("click", () => handlers.onChangePassword?.());
  root.querySelector('[data-action="logout"]')?.addEventListener("click", () => handlers.onLogout?.());
}

/** Lưu cài đặt rồi thông báo cho người dùng. */
export async function persistSetting(key, value) {
  try {
    await saveSettings({ [key]: value });
    toast("Đã lưu cài đặt.", "success");
  } catch (error) {
    console.error("[settings] Lỗi lưu cài đặt:", error);
    toast("Không lưu được cài đặt. Vui lòng thử lại.", "error");
  }
}
