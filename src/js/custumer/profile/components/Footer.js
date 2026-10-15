/**
 * Footer.js — Chân trang MovieF.
 */

import { NAV_ITEMS } from "./Header.js";
import { icon } from "../icons.js";

const FOOTER_LINKS = [
  { label: "Trang chủ", href: "/" },
  { label: "Giới thiệu", href: "/" },
  { label: "Điều khoản sử dụng", href: "/" },
  { label: "Chính sách bảo mật", href: "/" },
  { label: "Trợ giúp", href: "/" },
];

export function renderFooter(root) {
  root.innerHTML = `
    <footer
      style="background:#0e1015;border-top:1px solid rgba(255,255,255,.07);margin-top:40px"
    >
      <div class="mf-container" style="padding-top:40px;padding-bottom:32px">
        <div
          style="display:grid;gap:32px;grid-template-columns:1fr"
          data-footer-grid
        >
          <div style="max-width:360px">
            <a href="/" style="display:inline-flex;align-items:center;gap:9px;text-decoration:none">
              <span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#ff2028,#a50f16);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 10px 24px -14px rgba(255,32,40,.9)">${icon("clapper", "text-[18px]")}</span>
              <span style="font-weight:800;font-size:19px;letter-spacing:-.03em;color:#fff">Movie<span style="color:#ff2028">F</span></span>
            </a>
            <p class="mf-muted" style="font-size:13.5px;line-height:1.7;margin:14px 0 0">
              Khám phá thế giới điện ảnh cùng MovieF.
            </p>
          </div>

          <nav aria-label="Liên kết MovieF">
            <h3 style="margin:0 0 14px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#fff;font-weight:700">MovieF</h3>
            <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px">
              ${FOOTER_LINKS.map(
                (link) =>
                  `<li><a class="mf-link" href="${link.href}">${link.label}</a></li>`,
              ).join("")}
            </ul>
          </nav>

          <nav aria-label="Danh mục phim">
            <h3 style="margin:0 0 14px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#fff;font-weight:700">Khám phá</h3>
            <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px">
              ${NAV_ITEMS.slice(1)
                .map(
                  (item) =>
                    `<li><a class="mf-link" href="${item.href}">${item.label}</a></li>`,
                )
                .join("")}
            </ul>
          </nav>
        </div>

        <div class="mf-divider" style="margin:32px 0 20px"></div>

        <div
          style="display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center"
          data-footer-bottom
        >
          <p class="mf-muted" style="margin:0;font-size:12.5px">
            © 2025 MovieF. Bản quyền thuộc về MovieF Entertainment.
          </p>
          <p class="mf-muted" style="margin:0;font-size:12px;opacity:.7">
            Dữ liệu trang demo được dựng sẵn để bạn xem trước giao diện.
          </p>
        </div>
      </div>
    </footer>
  `;

  // Bố cục 3 cột từ tablet trở lên, 1 cột trên mobile.
  const grid = root.querySelector("[data-footer-grid]");
  const bottom = root.querySelector("[data-footer-bottom]");
  const wide = window.matchMedia("(min-width: 900px)");
  const apply = () => {
    if (!grid || !bottom) return;
    grid.style.gridTemplateColumns = wide.matches ? "1.4fr 1fr 1fr" : "1fr";
    bottom.style.flexDirection = wide.matches ? "row" : "column";
    bottom.style.justifyContent = wide.matches ? "space-between" : "center";
  };
  apply();
  wide.addEventListener("change", apply);
}
