/**
 * CO-WP-102B — Permanent Wealth Partner BAT / UAT isolation SSOT.
 *
 * Demo partners must never enter commissions, KPIs, rankings,
 * marketing, or operational analytics. Partner login remains allowed.
 */

export const WEALTH_PARTNER_BAT_DEMO_CODE = "WPDEMO001" as const;

export const WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME = "Wealth Partner Demo" as const;

export const WEALTH_PARTNER_BAT_USER_EMAIL = "wp-bat@rupeecatalyst.com" as const;

/** Codes reserved for BAT / UAT / Regression companions (extend as needed). */
export const WEALTH_PARTNER_BAT_ISOLATED_CODES = [
  WEALTH_PARTNER_BAT_DEMO_CODE,
] as const;

export type WealthPartnerBatIsolatedCode =
  (typeof WEALTH_PARTNER_BAT_ISOLATED_CODES)[number];

export const WEALTH_PARTNER_BAT_ISOLATION_PROFILE = {
  kind: "bat_uat_demo",
  purpose: "BAT / UAT / Regression",
  excludeFromCommissions: true,
  excludeFromPerformanceDashboards: true,
  excludeFromRankings: true,
  excludeFromBusinessKpis: true,
  excludeFromMarketingCommunications: true,
  excludeFromOperationalAnalytics: true,
  ownsNoBusinessHistory: true,
} as const;

export function isBatIsolatedWealthPartnerCode(
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  return (WEALTH_PARTNER_BAT_ISOLATED_CODES as readonly string[]).includes(
    code.trim().toUpperCase(),
  );
}

export function isBatIsolatedWealthPartnerProfile(
  profileJson: unknown,
): boolean {
  if (!profileJson || typeof profileJson !== "object" || Array.isArray(profileJson)) {
    return false;
  }
  const isolation = (profileJson as Record<string, unknown>).batIsolation;
  if (!isolation || typeof isolation !== "object" || Array.isArray(isolation)) {
    return false;
  }
  const kind = String((isolation as Record<string, unknown>).kind || "");
  return kind === "bat_uat_demo" || kind === "bat_demo";
}

export function isBatIsolatedWealthPartner(input: {
  code?: string | null;
  profileJson?: unknown;
}): boolean {
  return (
    isBatIsolatedWealthPartnerCode(input.code) ||
    isBatIsolatedWealthPartnerProfile(input.profileJson)
  );
}

/** Prisma `where` fragment — exclude BAT demo partners from operational lists. */
export function wealthPartnerBatExclusionWhere(): {
  NOT: { code: { in: string[]; mode: "insensitive" } };
} {
  return {
    NOT: {
      code: {
        in: [...WEALTH_PARTNER_BAT_ISOLATED_CODES],
        mode: "insensitive",
      },
    },
  };
}
