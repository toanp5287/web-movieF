/**
 * icons.js — Bảng icon dùng chung (Material Symbols Outlined, đã có sẵn ở
 * toàn bộ website MovieF nên không thêm dependency mới).
 *
 * Dùng:  icon("play")            -> span glyph mặc định
 *        icon("heart", "size-4", { fill: true })  -> glyph đã đổ đầy
 */

export const GLYPHS = {
  play: "play_arrow",
  pause: "pause",
  search: "search",
  bell: "notifications",
  menu: "menu",
  close: "close",
  user: "person",
  users: "group",
  camera: "photo_camera",
  edit: "edit",
  lock: "lock",
  shield: "shield",
  key: "key",
  film: "movie",
  clapper: "movie_filter",
  heart: "favorite",
  bookmark: "bookmark",
  clock: "schedule",
  star: "star",
  settings: "settings",
  logout: "logout",
  mail: "mail",
  phone: "call",
  calendar: "calendar_month",
  check: "check",
  checkCircle: "check_circle",
  trash: "delete",
  trashOutline: "delete_outline",
  chevronRight: "chevron_right",
  chevronDown: "expand_more",
  chevronLeft: "chevron_left",
  eye: "visibility",
  eyeOff: "visibility_off",
  eyeShow: "visibility",
  eyeHide: "visibility_off",
  info: "info",
  alert: "error",
  plus: "add",
  sparkles: "auto_awesome",
  flame: "local_fire_department",
  award: "workspace_premium",
  trend: "trending_up",
  history: "history",
  list: "playlist_play",
  grid: "grid_view",
  monitor: "monitor",
  palette: "palette",
  globe: "language",
  zap: "bolt",
  ticket: "confirmation_number",
  share: "share",
  more: "more_horiz",
  volume: "volume_up",
  hd: "high_quality",
  quality: "4k",
  dot: "fiber_manual_record",
  download: "download",
  upload: "upload",
  trash2: "delete_sweep",
  refresh: "refresh",
  login: "login",
  smile: "mood",
  cake: "cake",
  fingerprint: "fingerprint",
  mailOpen: "mark_email_read",
};

/**
 * @param {keyof typeof GLYPHS | string} name
 * @param {string} className  class cho thẻ <span>
 * @param {{ fill?: boolean, color?: string }} options
 */
export function icon(name, className = "", options = {}) {
  const glyph = GLYPHS[name] || name;
  const styles = [
    options.fill ? "font-variation-settings:'FILL' 1" : "",
    options.color ? `color:${options.color}` : "",
  ]
    .filter(Boolean)
    .join(";");
  const style = styles ? ` style="${styles}"` : "";
  return `<span class="material-symbols-outlined select-none leading-none ${className}" aria-hidden="true"${style}>${glyph}</span>`;
}

/** Icon đã đổ đầy (heart, star khi active). */
export const iconFilled = (name, className = "") => icon(name, className, { fill: true });
