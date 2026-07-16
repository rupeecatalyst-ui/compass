/**
 * Chanakya Guide — resolve Enterprise Guide Repository entries + tour persistence.
 * UI must not invent guidance; only render resolved structured content.
 */

import {
  CHANAKYA_GUIDE_REPOSITORY,
  CHANAKYA_GUIDE_TOUR_STEPS,
  CHANAKYA_GUIDE_WORKSPACE_META,
} from "@/constants/chanakya-guide";
import type {
  ChanakyaGuideContext,
  ChanakyaGuideEntry,
  ChanakyaGuidePageDef,
  ChanakyaGuideWorkspaceMeta,
  ChanakyaTourState,
  ChanakyaTourStatus,
} from "@/types/chanakya-guide";

const TOUR_STORAGE_KEY = "catalyst.chanakya-guide.tour";

function resolveSection(context: ChanakyaGuideContext): string | undefined {
  return context.section?.trim() || context.moduleId?.trim() || undefined;
}

export function resolveChanakyaGuideWorkspaceMeta(
  context: ChanakyaGuideContext,
): ChanakyaGuideWorkspaceMeta | null {
  const platform = context.platform ?? "catalyst_one";
  return (
    CHANAKYA_GUIDE_WORKSPACE_META.find(
      (m) => m.workspaceId === context.workspaceId && m.platform === platform,
    ) ??
    CHANAKYA_GUIDE_WORKSPACE_META.find((m) => m.workspaceId === context.workspaceId) ??
    null
  );
}

/**
 * Resolve Guide entries from the Enterprise Guide Repository.
 * Always includes `section: "default"` plus section-specific matches when section is set.
 */
export function resolveChanakyaGuideEntries(
  context: ChanakyaGuideContext,
): ChanakyaGuideEntry[] {
  const platform = context.platform ?? "catalyst_one";
  const section = resolveSection(context);
  const workflow = context.workflowContext?.trim();

  const forWorkspace = CHANAKYA_GUIDE_REPOSITORY.filter(
    (e) =>
      e.workspaceId === context.workspaceId &&
      (e.platform === platform || e.platform === "catalyst_one"),
  );

  const sectionMatched = forWorkspace.filter((e) => {
    if (e.section === "default") return true;
    if (section && e.section === section) return true;
    return false;
  });

  const filtered = sectionMatched.filter((e) => {
    if (
      e.workflowContexts?.length &&
      workflow &&
      !e.workflowContexts.includes(workflow)
    ) {
      return false;
    }
    return true;
  });

  // Prefer platform-exact rows when duplicates exist.
  const preferred = filtered.filter((e) => e.platform === platform);
  const pool = preferred.length > 0 ? preferred : filtered;

  return [...pool].sort(
    (a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.id.localeCompare(b.id),
  );
}

/** @deprecated Use resolveChanakyaGuideWorkspaceMeta */
export function resolveChanakyaGuidePage(
  context: ChanakyaGuideContext,
): ChanakyaGuidePageDef | null {
  const meta = resolveChanakyaGuideWorkspaceMeta(context);
  if (!meta) return null;
  return { ...meta, cards: resolveChanakyaGuideEntries(context) };
}

/** @deprecated Use resolveChanakyaGuideEntries */
export function resolveChanakyaGuideCards(
  context: ChanakyaGuideContext,
): ChanakyaGuideEntry[] {
  return resolveChanakyaGuideEntries(context);
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
      stepIndex: Math.max(
        0,
        Math.min(parsed.stepIndex ?? 0, CHANAKYA_GUIDE_TOUR_STEPS.length - 1),
      ),
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

export {
  listChanakyaLoanJourneyStages,
  getChanakyaLoanJourneyPhase,
  resolveChanakyaLoanJourneyStageIndex,
  getChanakyaLoanJourneyProgress,
} from "./resolve-journey";

export { CHANAKYA_GUIDE_TOUR_STEPS, CHANAKYA_GUIDE_REPOSITORY };
