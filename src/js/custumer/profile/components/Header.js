import { renderSiteHeader } from "../../site-header.js";

export { NAV_ITEMS } from "../../site-header.js";

/** Render header dùng chung cho Profile và Settings. */
export function renderHeader(root, options = {}) {
  return renderSiteHeader(root, options);
}
