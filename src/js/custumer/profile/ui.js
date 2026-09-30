/**
 * ui.js — Các trợ giúp UI dùng chung: toast, hộp thoại xác nhận, modal, drawer.
 * Không phụ thuộc thư viện ngoài, tự đóng khi bấm ra ngoài / nhấn ESC.
 */

import { $, $$, escapeHtml, lockScroll, render, unlockScroll } from "./utils.js";
import { icon } from "./icons.js";

/* ------------------------------------------------------------------ *
 * TOAST
 * ------------------------------------------------------------------ */

let toastHost = null;

function ensureToastHost() {
  if (toastHost && document.body.contains(toastHost)) return toastHost;
  toastHost = document.createElement("div");
  toastHost.className = "mf-toast-wrap";
  toastHost.setAttribute("role", "status");
  toastHost.setAttribute("aria-live", "polite");
  document.body.appendChild(toastHost);
  return toastHost;
}

const TOAST_ICON = { success: "checkCircle", error: "alert", info: "info" };

/**
 * @param {string} message
 * @param {"success"|"error"|"info"} [type]
 */
export function toast(message, type = "success") {
  const host = ensureToastHost();
  const tone = ["success", "error", "info"].includes(type) ? type : "info";

  const node = document.createElement("div");
  node.className = `mf-toast is-${tone}`;
  const toneColor =
    tone === "error" ? "#ff7a7f" : tone === "success" ? "#4ade80" : "#9ca0aa";
  node.innerHTML = `
    <span class="mf-stat-ico" style="width:30px;height:30px;border-radius:9px;flex:none;color:${toneColor}">${icon(TOAST_ICON[tone], "text-[18px]")}</span>
    <p style="margin:4px 0 0;line-height:1.5">${escapeHtml(message)}</p>
  `;

  host.appendChild(node);
  const remove = () => {
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 240);
  };
  node.addEventListener("click", remove);
  setTimeout(remove, 3600);
}

/* ------------------------------------------------------------------ *
 * HỘP THOẠI XÁC NHẬN
 * ------------------------------------------------------------------ */

let confirmHost = null;

function ensureConfirmHost() {
  if (confirmHost && document.body.contains(confirmHost)) return confirmHost;

  confirmHost = document.createElement("div");
  confirmHost.className = "mf-modal mf-modal-sm";
  confirmHost.id = "mfConfirm";
  confirmHost.setAttribute("role", "dialog");
  confirmHost.setAttribute("aria-modal", "true");
  confirmHost.innerHTML = `
    <div class="mf-modal-card" role="document">
      <div style="padding:22px 22px 6px;display:flex;gap:14px;align-items:flex-start">
        <span id="mfConfirmIcon" class="mf-stat-ico" style="width:42px;height:42px;border-radius:12px;background:rgba(255,32,40,.14);color:#ff7a7f;flex:none">${icon("alert")}</span>
        <div style="min-width:0">
          <h3 id="mfConfirmTitle" class="mf-section-title">Xác nhận</h3>
          <p id="mfConfirmText" class="mf-muted" style="margin:6px 0 0;font-size:13.5px;line-height:1.55"></p>
        </div>
      </div>
      <div style="padding:18px 22px 22px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
        <button type="button" class="mf-btn mf-btn-soft mf-btn-sm" data-confirm="cancel">Huỷ bỏ</button>
        <button type="button" class="mf-btn mf-btn-primary mf-btn-sm" data-confirm="ok">Xác nhận</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmHost);

  confirmHost.addEventListener("click", (event) => {
    if (event.target === confirmHost) closeModal(confirmHost);
  });
  return confirmHost;
}

/**
 * Hộp thoại xác nhận (thay cho confirm() để đồng bộ giao diện).
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = "Xác nhận",
  text = "",
  okText = "Xác nhận",
  cancelText = "Huỷ bỏ",
  tone = "danger",
} = {}) {
  const host = ensureConfirmHost();
  $("#mfConfirmTitle", host).textContent = title;
  $("#mfConfirmText", host).textContent = text;

  const okBtn = $("[data-confirm='ok']", host);
  okBtn.textContent = okText;
  okBtn.className = `mf-btn mf-btn-sm ${tone === "danger" ? "mf-btn-danger" : "mf-btn-primary"}`;

  return new Promise((resolve) => {
    const finish = (value) => {
      document.removeEventListener("keydown", onKey, true);
      okBtn.removeEventListener("click", onOk);
      $("[data-confirm='cancel']", host).removeEventListener("click", onCancel);
      closeModal(host);
      resolve(value);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(false);
      }
    };

    okBtn.addEventListener("click", onOk);
    $("[data-confirm='cancel']", host).addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey, true);

    openModal(host);
  });
}

/* ------------------------------------------------------------------ *
 * MODAL
 * ------------------------------------------------------------------ */

const restoreFocusMap = new WeakMap();

export function openModal(modal) {
  if (!modal) return;
  restoreFocusMap.set(modal, document.activeElement);
  modal.classList.add("is-open");
  lockScroll(modal.id || "modal");
  const focusable = modal.querySelector("input, textarea, select, button");
  focusable?.focus?.();
}

export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  unlockScroll(modal.id || "modal");
  restoreFocusMap.get(modal)?.focus?.();
}

/** Gắp đóng bằng ESC + bấm ra ngoài cho mọi modal có class `mf-modal`. */
export function bindModalDismiss(root = document) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = $$(".mf-modal.is-open", root).pop();
    if (open) closeModal(open);
  });

  document.addEventListener("mousedown", (event) => {
    const open = $$(".mf-modal.is-open", root);
    open.forEach((modal) => {
      if (event.target === modal) closeModal(modal);
    });
  });
}

/* ------------------------------------------------------------------ *
 * DROPDOWN
 * ------------------------------------------------------------------ */

/**
 * Dropdown đóng khi bấm ra ngoài, nhấn ESC hoặc chọn 1 mục.
 * @param {{trigger:HTMLElement, menu:HTMLElement, onSelect?:(value:string)=>void, itemSelector?:string}} config
 */
export function bindDropdown({ trigger, menu, onSelect, itemSelector = "[data-menu-value]" }) {
  if (!trigger || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  };

  const close = () => setOpen(false);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const next = menu.hidden;
    setOpen(next);
    if (next) menu.querySelector(itemSelector)?.focus?.();
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && menu.hidden) {
      event.preventDefault();
      setOpen(true);
      menu.querySelector(itemSelector)?.focus?.();
    }
  });

  menu.addEventListener("click", (event) => {
    const item = event.target.closest(itemSelector);
    if (!item) return;
    close();
    trigger.focus();
    onSelect?.(item.dataset.menuValue);
  });

  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      close();
      trigger.focus();
    }
  });

  setOpen(false);
}

/* ------------------------------------------------------------------ *
 * EMPTY STATE
 * ------------------------------------------------------------------ */

export function emptyState({ icon: iconName, title, description, actionLabel, actionHref }) {
  return `
    <div class="mf-enter" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:52px 20px">
      <span class="mf-stat-ico" style="width:58px;height:58px;border-radius:999px;background:rgba(255,255,255,.04);font-size:26px">${icon(iconName)}</span>
      <h4 class="mf-section-title">${escapeHtml(title)}</h4>
      <p class="mf-muted" style="max-width:360px;font-size:13.5px;line-height:1.6;margin:0">${escapeHtml(description)}</p>
      ${
        actionHref
          ? `<a class="mf-btn mf-btn-primary mf-btn-sm" style="margin-top:6px" href="${actionHref}">${icon("play")} ${escapeHtml(actionLabel)}</a>`
          : ""
      }
    </div>
  `;
}

/** Skeleton dùng chung, giúp lúc chờ dữ liệu không bị "vỡ" layout. */
export function skeletonGrid(count = 8, className = "") {
  return `<div class="${className}">${Array.from({ length: count })
    .map(
      () => `<div class="mf-skeleton" style="width:100%;aspect-ratio:2/3;border-radius:14px"></div>`,
    )
    .join("")}</div>`;
}

export { render };
