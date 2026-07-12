/**
 * Mission Control visual pattern tokens.
 * Stabilization: shared class strings — no visual redesign.
 */

/** Section / panel eyebrow label */
export const MC_SECTION_EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500";

/** Page / workspace hero eyebrow (accent color applied by caller) */
export const MC_PAGE_EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.2em]";

/** Standard section title under eyebrow */
export const MC_SECTION_TITLE = "mt-1 text-sm font-semibold text-zinc-50";

/** Supporting copy under section title */
export const MC_SECTION_DESCRIPTION = "mt-1 text-xs text-zinc-500";

/** Dense panel surface */
export const MC_PANEL =
  "rounded-xl border border-zinc-800 bg-zinc-950/70 p-4";

/** Compact panel (slightly tighter padding) */
export const MC_PANEL_COMPACT =
  "rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5";

/** Hero / workspace header surface */
export const MC_HERO =
  "rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5 shadow-sm shadow-black/20 md:p-6";

/** Inner list / tile cell */
export const MC_TILE =
  "rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5";

/** Compact tile */
export const MC_TILE_COMPACT =
  "rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2";

/** Inert / disabled placeholder action control */
export const MC_PLACEHOLDER_ACTION =
  "rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400";

/** Interactive secondary control */
export const MC_GHOST_CONTROL =
  "rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40";
