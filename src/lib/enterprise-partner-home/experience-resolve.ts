/**
 * CO-WP-103.20 — Enterprise Experience Engine resolve helpers.
 *
 * Catalyst One evaluates Visibility · Audience · Scheduling · Priority
 * before Partner Home projection. Companion apps render the result only.
 */

import type { PartnerHomeExperienceScheduleDto } from "@/types/enterprise-partner-gateway";

export type ExperienceGovernedLike = {
  audience?: string | null;
  priority?: number;
  sortOrder?: number;
  visibilityRule?: string | null;
  schedule?: PartnerHomeExperienceScheduleDto | null;
  /** Hero legacy alias */
  publishWindow?: PartnerHomeExperienceScheduleDto | null;
  deepLink?: string | null;
  personalisationKey?: string | null;
};

export type ExperienceResolveContext = {
  now?: Date;
  /** Audience tags for the bound partner (e.g. wealth_partners, partner type). */
  audiences: string[];
  /**
   * Visibility rule keys currently satisfied by the Experience Engine.
   * Items with a non-null visibilityRule require membership here.
   */
  satisfiedVisibilityRules?: ReadonlySet<string> | readonly string[];
};

export function resolveSchedule(
  item: ExperienceGovernedLike,
): PartnerHomeExperienceScheduleDto | null {
  return item.schedule ?? item.publishWindow ?? null;
}

export function isWithinExperienceSchedule(
  schedule: PartnerHomeExperienceScheduleDto | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!schedule) return true;
  const t = now.getTime();
  if (schedule.startsAt) {
    const start = Date.parse(schedule.startsAt);
    if (Number.isFinite(start) && t < start) return false;
  }
  if (schedule.endsAt) {
    const end = Date.parse(schedule.endsAt);
    if (Number.isFinite(end) && t > end) return false;
  }
  return true;
}

export function matchesExperienceAudience(
  audience: string | null | undefined,
  audiences: readonly string[],
): boolean {
  if (audience == null || audience === "") return true;
  return audiences.includes(audience);
}

export function matchesExperienceVisibility(
  visibilityRule: string | null | undefined,
  satisfied?: ReadonlySet<string> | readonly string[],
): boolean {
  if (visibilityRule == null || visibilityRule === "") return true;
  if (!satisfied) return false;
  if (satisfied instanceof Set) return satisfied.has(visibilityRule);
  return (satisfied as readonly string[]).includes(visibilityRule);
}

export function compareExperiencePriority(
  a: ExperienceGovernedLike,
  b: ExperienceGovernedLike,
): number {
  const pa = a.priority ?? 0;
  const pb = b.priority ?? 0;
  if (pb !== pa) return pb - pa;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

export function isExperienceItemEligible(
  item: ExperienceGovernedLike,
  ctx: ExperienceResolveContext,
): boolean {
  const now = ctx.now ?? new Date();
  if (!isWithinExperienceSchedule(resolveSchedule(item), now)) return false;
  if (!matchesExperienceAudience(item.audience, ctx.audiences)) return false;
  if (!matchesExperienceVisibility(item.visibilityRule, ctx.satisfiedVisibilityRules)) {
    return false;
  }
  return true;
}

/** Attach CO-WP-103.20 governance defaults for seed → DTO projection. */
export function withExperienceGovernance<T extends ExperienceGovernedLike>(
  item: T,
): T & {
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  deepLink: string;
  personalisationKey: string | null;
} {
  const schedule = resolveSchedule(item);
  return {
    ...item,
    audience: item.audience ?? null,
    priority: item.priority ?? 0,
    sortOrder: item.sortOrder ?? 0,
    visibilityRule: item.visibilityRule ?? null,
    schedule,
    deepLink: typeof item.deepLink === "string" ? item.deepLink : "",
    personalisationKey: item.personalisationKey ?? null,
  };
}

/**
 * Filter + sort Experience packages for Partner Home projection.
 * Single SSOT path — do not re-implement in companion UI.
 */
export function resolveExperiencePackage<T extends ExperienceGovernedLike>(
  items: readonly T[],
  ctx: ExperienceResolveContext,
): Array<
  T & {
    audience: string | null;
    priority: number;
    sortOrder: number;
    visibilityRule: string | null;
    schedule: PartnerHomeExperienceScheduleDto | null;
    deepLink: string;
    personalisationKey: string | null;
  }
> {
  return items
    .map((item) => withExperienceGovernance(item))
    .filter((item) => isExperienceItemEligible(item, ctx))
    .sort(compareExperiencePriority);
}
