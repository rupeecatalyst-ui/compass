/**
 * CO-UX-016 / CO-UX-DATAGRID-001 — Enterprise Registry Workspace layout SSOT.
 * Presentation only — does not change registry ownership, APIs, or permissions.
 *
 * Full-workspace data grid contract:
 *  • No fixed content max-width on registry routes
 *  • Side margins 16–24px only
 *  • Compact header
 *  • Grid fills remaining viewport; sticky header + frozen first column preserved
 */

/** App topbar is h-14 (3.5rem). Registry desks fill remaining viewport. */
export const ENTERPRISE_REGISTRY_VIEWPORT_CLASS =
  "flex h-[calc(100vh-3.5rem)] w-full max-w-none flex-col gap-0 overflow-hidden";

/**
 * CO-LW-003 — Document scroll for operational multi-panel desks.
 * No viewport height lock; page scrolls naturally.
 */
export const ENTERPRISE_REGISTRY_DOCUMENT_VIEWPORT_CLASS =
  "flex w-full max-w-none min-h-0 flex-col gap-0";

/** CO-UX-DATAGRID-001 — 16px mobile / 20px md / 24px lg side margins. */
export const ENTERPRISE_REGISTRY_CONTENT_PAD_CLASS =
  "flex min-h-0 w-full max-w-none flex-1 flex-col gap-1 overflow-hidden px-4 py-1.5 md:px-5 md:py-2 lg:px-6";

export const ENTERPRISE_REGISTRY_DOCUMENT_CONTENT_PAD_CLASS =
  "flex w-full max-w-none min-h-0 flex-1 flex-col gap-1 px-4 py-1.5 md:px-5 md:py-2 lg:px-6";

export const ENTERPRISE_REGISTRY_HEADER_CLASS =
  "flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 pb-0.5";

export const ENTERPRISE_REGISTRY_TITLE_CLASS =
  "truncate text-sm font-semibold tracking-tight md:text-[15px]";

export const ENTERPRISE_REGISTRY_SUBTITLE_CLASS =
  "hidden text-[11px] text-muted-foreground sm:inline";

export const ENTERPRISE_REGISTRY_COUNT_CLASS =
  "text-[11px] tabular-nums text-muted-foreground";

export const ENTERPRISE_REGISTRY_ACTION_BTN_CLASS =
  "h-7 gap-1 px-2 text-[11px]";

export const ENTERPRISE_REGISTRY_CONTROL_H_CLASS = "h-7 rounded-sm text-[11px]";

/**
 * CO-UX-DATAGRID-001 — Fluid table width (no forced 1280px min that causes H-scroll).
 * Column widths still come from grid preferences; frozen columns stay sticky.
 */
export const ENTERPRISE_REGISTRY_TABLE_MIN_WIDTH_CLASS = "w-full min-w-0";

/**
 * Routes that host Enterprise Registry data grids — full viewport width, shell-owned margins.
 * Presentation routing only.
 */
export const ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES = [
  "/contacts",
  "/customers",
  "/my-opportunities",
  "/my-deals",
  "/lenders",
  "/wealth-partners",
  "/document-center",
  "/admin/lender-registry",
  "/admin/wealth-partner-registry",
  "/admin/product-library",
  "/admin/product-lender-matrix",
  "/admin/enterprise-assets/registry",
  "/admin/foundation-libraries/registry",
  "/admin/reference-masters",
  "/admin/enterprise-mdm",
  "/accounting",
] as const;

/** Exact paths that are registry desks (not prefix-only). */
export const ENTERPRISE_REGISTRY_FULL_WIDTH_EXACT_PATHS = ["/pipeline"] as const;

/**
 * Registries that use layoutMode="document" (natural page scroll).
 * Must remain full-width but must NOT lock main overflow.
 * CO-DOCS-BAT-001 — Document Center is an operational multi-panel desk, not a locked grid.
 */
export const ENTERPRISE_REGISTRY_DOCUMENT_SCROLL_PATH_PREFIXES = [
  "/lenders",
  "/document-center",
] as const;

export function isEnterpriseRegistryFullWidthPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || pathname;
  if ((ENTERPRISE_REGISTRY_FULL_WIDTH_EXACT_PATHS as readonly string[]).includes(path)) {
    return true;
  }
  return ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isEnterpriseRegistryDocumentScrollPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || pathname;
  return ENTERPRISE_REGISTRY_DOCUMENT_SCROLL_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Concise counter copy — e.g. Contacts (29), not "CONTACT REGISTRY · 29 INDIVIDUALS".
 */
export function formatEnterpriseRegistryCounter(
  noun: string,
  count: number,
  options?: { ofTotal?: number },
): string {
  const label = noun.trim() || "Records";
  if (options?.ofTotal != null && options.ofTotal !== count) {
    return `${label} (${count} of ${options.ofTotal})`;
  }
  return `${label} (${count})`;
}
