/**
 * Chanakya Guide Phase 1 — resolve page guidance + tour persistence.
 * No coaching / intelligence engines.
 */

import {
  CHANAKYA_GUIDE_PAGES,
  CHANAKYA_GUIDE_TOUR_STEPS,
} from "@/constants/chanakya-guide";
import type {
  ChanakyaGuideCard,
  ChanakyaGuideContext,
  ChanakyaGuidePageDef,
  ChanakyaTourState,
  ChanakyaTourStatus,
} from "@/types/chanakya-guide";

const TOUR_STORAGE_KEY = "catalyst.chanakya-guide.tour";

export function resolveChanakyaGuidePage(
  context: ChanakyaGuideContext,
): ChanakyaGuidePageDef | null {
  const platform = context.platform ?? "catalyst_one";
  return (
    CHANAKYA_GUIDE_PAGES.find(
      (p) => p.workspaceId === context.workspaceId && p.platform === platform,
    ) ??
    CHANAKYA_GUIDE_PAGES.find((p) => p.workspaceId === context.workspaceId) ??
    null
  );
}

export function resolveChanakyaGuideCards(
  context: ChanakyaGuideContext,
): ChanakyaGuideCard[] {
  const page = resolveChanakyaGuidePage(context);
  if (!page) return [];

  const moduleId = context.moduleId?.trim();
  const workflow = context.workflowContext?.trim();

  return page.cards.filter((card) => {
    if (card.moduleIds?.length && moduleId && !card.moduleIds.includes(moduleId)) {
      return false;
    }
    if (
      card.workflowContexts?.length &&
      workflow &&
      !card.workflowContexts.includes(workflow)
    ) {
      return false;
    }
    return true;
  });
}

export function getDefaultTourState(): ChanakyaTourState {
  return {
    status: "not_started",
    stepIndex: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function loadChanakyaTourState(): ChanakyaTourState {
  if (typeof window === "undefined") return getDefaultTourState();
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return getDefaultTourState();
    const parsed = JSON.parse(raw) as ChanakyaTourState;
    if (!parsed?.status) return getDefaultTourState();
    return {
      status: parsed.status,
      stepIndex: Math.max(0, Math.min(parsed.stepIndex ?? 0, CHANAKYA_GUIDE_TOUR_STEPS.length - 1)),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return getDefaultTourState();
  }
}

export function saveChanakyaTourState(
  patch: Partial<ChanakyaTourState> & { status?: ChanakyaTourStatus },
): ChanakyaTourState {
  const prev = loadChanakyaTourState();
  const next: ChanakyaTourState = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function shouldOfferFirstTimeTour(state?: ChanakyaTourState): boolean {
  const s = state ?? loadChanakyaTourState();
  return s.status === "not_started" || s.status === "paused" || s.status === "in_progress";
}

export { CHANAKYA_GUIDE_TOUR_STEPS };
