/**
 * CF-CHANAKYA-002 — select a personalized CHANAKYA greeting.
 */

import {
  CHANAKYA_GREETING_LIBRARY,
  getChanakyaGreetingById,
} from "@/constants/chanakya-greeting-library";
import type {
  ChanakyaGreetingContext,
  ChanakyaGreetingDefinition,
  ChanakyaGreetingSelection,
  ChanakyaGreetingSelectionInput,
} from "@/types/chanakya-greeting";
import { getChanakyaGreetingEngineConfig } from "./config";
import {
  clearUsedChanakyaGreetings,
  getStickyChanakyaGreeting,
  listUsedChanakyaGreetingIds,
  markChanakyaGreetingUsed,
  setStickyChanakyaGreeting,
} from "./session-store";
import { resolveChanakyaGreetingMoment } from "./time-of-day";

function normalizeName(firstName: string): string {
  const trimmed = firstName.trim();
  if (!trimmed) return "there";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function renderChanakyaGreetingPattern(pattern: string, firstName: string): string {
  return pattern.replace(/\{name\}/gi, normalizeName(firstName));
}

function scoreCandidate(
  def: ChanakyaGreetingDefinition,
  moment: ReturnType<typeof resolveChanakyaGreetingMoment>,
  preferredTones: string[],
  timeAware: boolean,
): number {
  let score = Math.max(1, def.weight);
  if (timeAware && def.moments.includes(moment)) score += 4;
  if (timeAware && def.moments.includes("any") && !def.moments.includes(moment)) score += 0;
  const toneRank = preferredTones.indexOf(def.tone);
  if (toneRank >= 0) score += (preferredTones.length - toneRank) * 1.5;
  return score;
}

function pickWeighted(candidates: { def: ChanakyaGreetingDefinition; score: number }[]): ChanakyaGreetingDefinition {
  const total = candidates.reduce((sum, c) => sum + c.score, 0);
  let cursor = Math.random() * total;
  for (const c of candidates) {
    cursor -= c.score;
    if (cursor <= 0) return c.def;
  }
  return candidates[candidates.length - 1]!.def;
}

function filterLibrary(opts: {
  context: ChanakyaGreetingContext;
  moment: ReturnType<typeof resolveChanakyaGreetingMoment>;
  disabledIds: Set<string>;
  usedIds: Set<string>;
  timeAware: boolean;
}): ChanakyaGreetingDefinition[] {
  const { context, moment, disabledIds, usedIds, timeAware } = opts;
  return CHANAKYA_GREETING_LIBRARY.filter((def) => {
    if (!def.enabled) return false;
    if (disabledIds.has(def.id)) return false;
    if (usedIds.has(def.id)) return false;
    // Exact context preferred later; accept generic as always-valid fallback metadata.
    if (!def.contexts.includes(context) && !def.contexts.includes("generic")) return false;
    if (!timeAware) return true;
    return def.moments.includes(moment) || def.moments.includes("any");
  });
}

/**
 * Select a greeting for CHANAKYA UI surfaces.
 * Time-aware + session anti-repeat + sticky per surfaceKey.
 */
export function selectChanakyaGreeting(
  input: ChanakyaGreetingSelectionInput,
): ChanakyaGreetingSelection {
  const config = getChanakyaGreetingEngineConfig();
  const context = input.context ?? "generic";
  const now = input.now ?? new Date();
  const moment = resolveChanakyaGreetingMoment(now);
  const name = normalizeName(input.firstName);

  if (!config.enabled) {
    const text = renderChanakyaGreetingPattern(config.fallbackPattern, name);
    return {
      greetingId: "fallback",
      text,
      moment,
      context,
      pattern: config.fallbackPattern,
    };
  }

  if (input.surfaceKey && !input.forceRefresh) {
    const sticky = getStickyChanakyaGreeting(input.surfaceKey);
    if (sticky) {
      return {
        greetingId: sticky.greetingId,
        text: sticky.text,
        moment,
        context,
        pattern: getChanakyaGreetingById(sticky.greetingId)?.pattern ?? sticky.text,
      };
    }
  }

  const disabledIds = new Set(config.disabledGreetingIds);
  let usedIds = new Set(config.sessionAware ? listUsedChanakyaGreetingIds() : []);

  let pool = filterLibrary({ context, moment, disabledIds, usedIds, timeAware: config.timeAware });

  // Exact context first if enough candidates
  const exact = pool.filter((d) => d.contexts.includes(context));
  if (exact.length >= 3) pool = exact;

  if (pool.length === 0 && config.sessionAware) {
    clearUsedChanakyaGreetings();
    usedIds = new Set();
    pool = filterLibrary({ context, moment, disabledIds, usedIds, timeAware: config.timeAware });
  }

  if (pool.length === 0) {
    pool = filterLibrary({
      context: "generic",
      moment,
      disabledIds,
      usedIds: new Set(),
      timeAware: false,
    });
  }

  if (pool.length === 0) {
    const text = renderChanakyaGreetingPattern(config.fallbackPattern, name);
    return {
      greetingId: "fallback",
      text,
      moment,
      context,
      pattern: config.fallbackPattern,
    };
  }

  const scored = pool.map((def) => ({
    def,
    score: scoreCandidate(def, moment, config.preferredTones, config.timeAware),
  }));
  const chosen = pickWeighted(scored);
  const text = renderChanakyaGreetingPattern(chosen.pattern, name);

  if (config.sessionAware) markChanakyaGreetingUsed(chosen.id);
  if (input.surfaceKey) setStickyChanakyaGreeting(input.surfaceKey, chosen.id, text);

  return {
    greetingId: chosen.id,
    text,
    moment,
    context,
    pattern: chosen.pattern,
  };
}

export function countChanakyaGreetingLibrary(): number {
  return CHANAKYA_GREETING_LIBRARY.filter((d) => d.enabled).length;
}
