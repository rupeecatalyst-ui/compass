/**
 * Per-employee My Deals Kanban preferences (view, stages, fields, scroll).
 * Presentation only — not a business SSOT.
 */

import {
  MY_DEALS_KANBAN_ALL_FIELD_IDS,
  MY_DEALS_KANBAN_ALL_STAGE_IDS,
  MY_DEALS_KANBAN_DEFAULT_FIELD_IDS,
  MY_DEALS_KANBAN_DEFAULT_STAGE_IDS,
  type MyDealsKanbanFieldId,
} from "@/constants/my-deals-kanban";
import type { MyDealsWorkspaceViewId } from "@/constants/my-deals";

const PREFIX = "catalyst-one:my-deals:kanban-prefs";
const DEFAULT_ORG_SCOPE = "session-org";

export type MyDealsKanbanPrefs = {
  view: MyDealsWorkspaceViewId;
  selectedStageIds: string[];
  visibleOptionalFieldIds: MyDealsKanbanFieldId[];
  boardScrollLeft: number;
  columnScrollTops: Record<string, number>;
};

export function defaultMyDealsKanbanPrefs(): MyDealsKanbanPrefs {
  return {
    view: "kanban",
    selectedStageIds: [...MY_DEALS_KANBAN_DEFAULT_STAGE_IDS],
    visibleOptionalFieldIds: [...MY_DEALS_KANBAN_DEFAULT_FIELD_IDS],
    boardScrollLeft: 0,
    columnScrollTops: {},
  };
}

function resolveOrgScope(organizationId?: string | null): string {
  return organizationId?.trim() || DEFAULT_ORG_SCOPE;
}

/** Namespaced by organisation + authenticated employee. Never a shared browser key. */
function storageKey(organizationId: string | null | undefined, userId: string): string {
  return `${PREFIX}:${resolveOrgScope(organizationId)}:${userId.trim() || "anonymous"}`;
}

function legacyUserOnlyKey(userId: string): string {
  return `${PREFIX}:${userId.trim() || "anonymous"}`;
}

function asFieldId(value: unknown): MyDealsKanbanFieldId | null {
  return MY_DEALS_KANBAN_ALL_FIELD_IDS.includes(value as MyDealsKanbanFieldId)
    ? (value as MyDealsKanbanFieldId)
    : null;
}

export function readMyDealsKanbanPrefs(
  userId: string | null | undefined,
  organizationId?: string | null,
): MyDealsKanbanPrefs {
  const fallback = defaultMyDealsKanbanPrefs();
  if (typeof window === "undefined" || !userId?.trim()) return fallback;
  try {
    const namespaced = window.localStorage.getItem(storageKey(organizationId, userId));
    const raw = namespaced ?? window.localStorage.getItem(legacyUserOnlyKey(userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MyDealsKanbanPrefs>;
    const stages = Array.isArray(parsed.selectedStageIds)
      ? parsed.selectedStageIds.filter((id) => MY_DEALS_KANBAN_ALL_STAGE_IDS.includes(id))
      : fallback.selectedStageIds;
    const fields = Array.isArray(parsed.visibleOptionalFieldIds)
      ? parsed.visibleOptionalFieldIds
          .map(asFieldId)
          .filter((id): id is MyDealsKanbanFieldId => Boolean(id))
      : fallback.visibleOptionalFieldIds;
    return {
      view: parsed.view === "deals" || parsed.view === "kanban" ? parsed.view : fallback.view,
      selectedStageIds: stages,
      visibleOptionalFieldIds: fields,
      boardScrollLeft:
        typeof parsed.boardScrollLeft === "number" && Number.isFinite(parsed.boardScrollLeft)
          ? parsed.boardScrollLeft
          : 0,
      columnScrollTops:
        parsed.columnScrollTops && typeof parsed.columnScrollTops === "object"
          ? Object.fromEntries(
              Object.entries(parsed.columnScrollTops).filter(
                ([, v]) => typeof v === "number" && Number.isFinite(v),
              ),
            )
          : {},
    };
  } catch {
    return fallback;
  }
}

export function rememberMyDealsKanbanPrefs(
  userId: string | null | undefined,
  patch: Partial<MyDealsKanbanPrefs>,
  organizationId?: string | null,
): MyDealsKanbanPrefs {
  const next = { ...readMyDealsKanbanPrefs(userId, organizationId), ...patch };
  if (typeof window === "undefined" || !userId?.trim()) return next;
  try {
    window.localStorage.setItem(storageKey(organizationId, userId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
