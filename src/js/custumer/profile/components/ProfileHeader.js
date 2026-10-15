/**
 * ProfileHeader.js — Thẻ hồ sơ lớn: avatar + camera, tên, username, email,
 * ngày tham gia, giới thiệu và các nút hành động.
 */

import { escapeHtml, render } from "../utils.js";
import { icon } from "../icons.js";

/**
 * @param {string|HTMLElement} root
 * @param {object} profile  view-model từ service
 * @param {{onEdit:Function, onPassword:Function, onAvatar:Function}} handlers
 */
export function renderProfileHeader(root, profile, handlers = {}) {
  const p = profile || {};
  const info = [
    { icon: "user", text: p.handle },
    { icon: "mail", text: p.email },
  ];

  render(
    root,
    `
    <section
      class="mf-card mf-enter"
      style="position:relative;overflow:hidden;padding:26px"
      aria-label="Thông tin hồ sơ"
    >
      <div
        aria-hidden="true"
        style="position:absolute;right:-90px;top:-110px;width:320px;height:320px;border-radius:999px;background:radial-gradient(circle,rgba(255,32,40,.16),transparent 70%);pointer-events:none"
      ></div>
      <div
        aria-hidden="true"
        style="position:absolute;left:-60px;bottom:-120px;width:260px;height:260px;border-radius:999px;background:radial-gradient(circle,rgba(90,95,255,.10),transparent 70%);pointer-events:none"
      ></div>

      <div data-profile-layout style="position:relative;display:flex;gap:26px;align-items:center;flex-wrap:wrap">
        <div style="position:relative;flex:none">
          <div class="mf-avatar-ring" style="width:116px;height:116px" data-avatar-wrap>
            <img
              src="${p.avatar}"
              alt="Ảnh đại diện của ${escapeHtml(p.fullName || "người dùng")}"
              data-fallback="${p.avatar}"
            />
          </div>
          <button
            type="button"
            class="mf-avatar-cam"
            data-action="change-avatar"
            aria-label="Đổi ảnh đại diện"
            title="Đổi ảnh đại diện"
          >${icon("camera", "text-[16px]")}</button>
        </div>

        <div style="flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h1
              class="mf-truncate"
              style="margin:0;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-.025em;max-width:100%"
              title="${escapeHtml(p.fullName || "")}"
            >${escapeHtml(p.fullName || "Người dùng")}</h1>
            <span class="mf-chip mf-chip-brand">${icon("sparkles", "text-[13px]")} ${escapeHtml(p.role || "Thành viên")}</span>
          </div>

          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            ${info
              .map(
                (item) => `
              <span class="mf-muted" style="display:inline-flex;align-items:center;gap:6px;font-size:13.5px;min-width:0">
                ${icon(item.icon, "text-[16px]")}
                <span class="mf-truncate" style="max-width:260px">${escapeHtml(item.text)}</span>
              </span>`,
              )
              .join("")}
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span class="mf-chip">${icon("calendar", "text-[13px]")} ${escapeHtml(p.joinedLabel || "")}</span>
            ${
              p.phone
                ? `<span class="mf-chip">${icon("phone", "text-[13px]")} ${escapeHtml(p.phone)}</span>`
                : ""
            }
            ${
              p.birthday
                ? `<span class="mf-chip">${icon("cake", "text-[13px]")} ${escapeHtml(p.birthday)}</span>`
                : ""
            }
          </div>

          <p
            class="mf-muted"
            style="margin:2px 0 0;font-size:13.5px;line-height:1.65;max-width:62ch"
          >${escapeHtml(p.bio || "Khám phá thế giới điện ảnh cùng MovieF.")}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;flex:none" data-profile-actions>
          <button type="button" class="mf-btn mf-btn-primary" data-action="edit-profile" style="width:100%">
            ${icon("edit", "text-[18px]")} Chỉnh sửa hồ sơ
          </button>
          <button type="button" class="mf-btn mf-btn-soft" data-action="change-password" style="width:100%">
            ${icon("lock", "text-[18px]")} Đổi mật khẩu
          </button>
        </div>
      </div>
    </section>
  `,
  );

  // Avatar + nút hành động xếp dọc trên mobile, ngang từ tablet trở lên.
  const layout = root.querySelector("[data-profile-layout]");
  const actions = root.querySelector("[data-profile-actions]");
  const wide = window.matchMedia("(min-width: 860px)");
  const apply = () => {
    if (!layout || !actions) return;
    layout.style.flexDirection = wide.matches ? "row" : "column";
    layout.style.alignItems = wide.matches ? "center" : "flex-start";
    actions.style.flexDirection = wide.matches ? "row" : "column";
    actions.style.width = wide.matches ? "auto" : "100%";
  };
  apply();
  wide.addEventListener("change", apply);

  root.querySelector('[data-action="edit-profile"]')?.addEventListener("click", handlers.onEdit);
  root
    .querySelector('[data-action="change-password"]')
    ?.addEventListener("click", handlers.onPassword);
  root
    .querySelector('[data-action="change-avatar"]')
    ?.addEventListener("click", handlers.onAvatar);
}
