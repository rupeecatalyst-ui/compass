/**
 * CO-ADMIN-004 — Production Reset feature flags.
 * Default OFF — Super Admin must enable explicitly before any mutate path.
 */

export const PRODUCTION_RESET_ENABLED_ENV = "PRODUCTION_RESET_ENABLED" as const;
export const NEXT_PUBLIC_PRODUCTION_RESET_ENABLED_ENV =
  "NEXT_PUBLIC_PRODUCTION_RESET_ENABLED" as const;

/** Feature permission key (Roles & Permissions / Super Admin gate). */
export const PRODUCTION_RESET_FEATURE_PERMISSION =
  "admin.system_tools.production_reset" as const;

export const PRODUCTION_RESET_TYPED_CONFIRMATION =
  "RESET PRODUCTION DATA" as const;

function readFlag(...names: string[]): boolean {
  for (const name of names) {
    const raw =
      typeof process !== "undefined" ? process.env[name]?.trim().toLowerCase() : undefined;
    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") return true;
    if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
  }
  return false;
}

/** Server gate — execute / dry-run mutate analysis require this ON. */
export function isProductionResetEnabled(): boolean {
  return readFlag(
    PRODUCTION_RESET_ENABLED_ENV,
    NEXT_PUBLIC_PRODUCTION_RESET_ENABLED_ENV,
  );
}

/** Client visibility of wizard (still disabled until server flag allows runs). */
export function isProductionResetUiEnabled(): boolean {
  return readFlag(NEXT_PUBLIC_PRODUCTION_RESET_ENABLED_ENV, PRODUCTION_RESET_ENABLED_ENV);
}
