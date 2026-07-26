/**
 * CO-OPS-001 — Build Information (Administrator operational panel).
 * Manual "What's New" changelog — update per release.
 */
export type BuildWhatsNewEntry = {
  version: string;
  date: string;
  items: string[];
};

/** Application display name for Build Information (independent of env branding). */
export const BUILD_INFORMATION_APP_NAME = "Catalyst One" as const;

/**
 * Operational build number. Override at build via NEXT_PUBLIC_BUILD_NUMBER.
 * Increment intentionally for each certified release / deploy milestone.
 */
export const BUILD_INFORMATION_BUILD_NUMBER = "1" as const;

/** Manually curated release notes for the Build Information panel. */
export const BUILD_INFORMATION_WHATS_NEW: BuildWhatsNewEntry[] = [
  {
    version: "0.9.0-internal",
    date: "2026-07-23",
    items: [
      "CO-ARCH-003 Phase 0 — Opportunity-centric F0′ constitution + glossary (schema review pending).",
      "CO-P0-006 Wave 1 — Enterprise Deal primary create (Postgres required before UI success).",
      "CO-OPS-001.1 — Release Health, Copy Build Information, Certification Status, admin footer.",
      "CO-OPS-001 — Administrator Build Information panel (Admin Console → System).",
      "CO-P0-002 — Enterprise Deal Registry operational cutover (local Phase B).",
      "Enterprise Deal Registry integrity CRUD validation for local pilot.",
    ],
  },
];

/** Known Supabase project refs → display names (never expose connection strings). */
export const BUILD_INFORMATION_PROJECT_NAMES: Record<string, string> = {
  unpjfzvlokovobxgvazo: "Catalyst One Platform (Pilot)",
  swbrjrrapwdtgkpdbphe: "Historical scaffold (do not use)",
  lspghyjozleqovrtdxqe: "Historical RCLIP interim (do not use)",
};
