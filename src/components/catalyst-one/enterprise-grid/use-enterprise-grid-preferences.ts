"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EnterpriseGridColumnDef,
  EnterpriseGridPreferences,
  EnterpriseGridViewState,
} from "./types";

function buildDefaultView<T>(
  columns: EnterpriseGridColumnDef<T>[],
  viewName = "Default View",
): EnterpriseGridViewState {
  const ordered = [...columns].sort(
    (a, b) => (a.defaultOrder ?? 100) - (b.defaultOrder ?? 100),
  );
  return {
    id: "default",
    name: viewName,
    scope: "default",
    visibleColumnIds: ordered
      .filter((c) => c.defaultVisible !== false)
      .map((c) => c.id),
    columnOrder: ordered.map((c) => c.id),
    columnWidths: Object.fromEntries(
      ordered.map((c) => [c.id, c.defaultWidth ?? 140]),
    ),
    frozenColumnIds: ordered.filter((c) => c.frozen).map((c) => c.id),
  };
}

/** Merge saved layout with current column defs (add new cols, drop removed). */
function reconcileView(
  saved: EnterpriseGridViewState,
  defaults: EnterpriseGridViewState,
): EnterpriseGridViewState {
  const valid = new Set(defaults.columnOrder);
  const order = [
    ...saved.columnOrder.filter((id) => valid.has(id)),
    ...defaults.columnOrder.filter((id) => !saved.columnOrder.includes(id)),
  ];
  const visible = saved.visibleColumnIds.filter((id) => valid.has(id));
  for (const id of defaults.visibleColumnIds) {
    if (!saved.columnOrder.includes(id) && !visible.includes(id)) {
      visible.push(id);
    }
  }
  const widths = { ...defaults.columnWidths, ...saved.columnWidths };
  const frozen = saved.frozenColumnIds.filter((id) => valid.has(id));
  return {
    ...saved,
    columnOrder: order,
    visibleColumnIds: visible.length ? visible : defaults.visibleColumnIds,
    columnWidths: widths,
    frozenColumnIds: frozen,
  };
}

function readPrefs(
  storageKey: string,
  defaultView: EnterpriseGridViewState,
): EnterpriseGridPreferences {
  if (typeof window === "undefined") {
    return { activeViewId: "default", views: [defaultView] };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { activeViewId: "default", views: [defaultView] };
    const parsed = JSON.parse(raw) as EnterpriseGridPreferences;
    if (!parsed.views?.length) return { activeViewId: "default", views: [defaultView] };
    const views = parsed.views.map((v) =>
      v.id === "default" || v.scope === "default"
        ? reconcileView(v, defaultView)
        : reconcileView(v, defaultView),
    );
    const activeViewId = views.some((v) => v.id === parsed.activeViewId)
      ? parsed.activeViewId
      : "default";
    return { activeViewId, views };
  } catch {
    return { activeViewId: "default", views: [defaultView] };
  }
}

export function useEnterpriseGridPreferences<T>(
  storageKey: string,
  columns: EnterpriseGridColumnDef<T>[],
) {
  const defaultView = useMemo(() => buildDefaultView(columns), [columns]);

  const [prefs, setPrefs] = useState<EnterpriseGridPreferences>(() =>
    readPrefs(storageKey, defaultView),
  );

  /** Re-load when user-scoped key changes (login / user switch). */
  useEffect(() => {
    setPrefs(readPrefs(storageKey, buildDefaultView(columns)));
    // columns intentionally omitted — signature merge happens via reconcile on read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /** When column defs change, reconcile active layout without wiping personal order. */
  useEffect(() => {
    setPrefs((prev) => {
      const defaults = buildDefaultView(columns);
      const views = prev.views.map((v) => reconcileView(v, defaults));
      return { ...prev, views };
    });
  }, [columns]);

  const persist = useCallback(
    (next: EnterpriseGridPreferences) => {
      setPrefs(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [storageKey],
  );

  const activeView = useMemo(() => {
    return prefs.views.find((v) => v.id === prefs.activeViewId) ?? defaultView;
  }, [prefs, defaultView]);

  const visibleColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    return activeView.columnOrder
      .filter((id) => activeView.visibleColumnIds.includes(id))
      .map((id) => byId.get(id))
      .filter(Boolean) as EnterpriseGridColumnDef<T>[];
  }, [columns, activeView]);

  const updateActiveView = useCallback(
    (patch: Partial<EnterpriseGridViewState>) => {
      const view = { ...activeView, ...patch };
      const views = prefs.views.map((v) => (v.id === view.id ? view : v));
      // Ensure personal edits land on a personal-scoped active view when dragging default
      if (view.id === "default" && view.scope === "default") {
        const personal: EnterpriseGridViewState = {
          ...view,
          id: "personal-layout",
          name: "My layout",
          scope: "personal",
        };
        const nextViews = [
          defaultView,
          ...prefs.views.filter((v) => v.id !== "default" && v.id !== "personal-layout"),
          personal,
        ];
        persist({ activeViewId: personal.id, views: nextViews });
        return;
      }
      persist({ ...prefs, views });
    },
    [activeView, prefs, persist, defaultView],
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      const visible = new Set(activeView.visibleColumnIds);
      if (visible.has(columnId)) visible.delete(columnId);
      else visible.add(columnId);
      updateActiveView({ visibleColumnIds: [...visible] });
    },
    [activeView, updateActiveView],
  );

  const moveColumn = useCallback(
    (columnId: string, direction: "left" | "right") => {
      const order = [...activeView.columnOrder];
      const idx = order.indexOf(columnId);
      if (idx < 0) return;
      const swap = direction === "left" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= order.length) return;
      [order[idx], order[swap]] = [order[swap]!, order[idx]!];
      updateActiveView({ columnOrder: order });
    },
    [activeView, updateActiveView],
  );

  /** Place `sourceId` immediately before `targetId` (or at end if target missing). */
  const reorderColumn = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      const order = [...activeView.columnOrder];
      const from = order.indexOf(sourceId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0) return;
      order.splice(from, 1);
      const insertAt = order.indexOf(targetId);
      order.splice(insertAt < 0 ? order.length : insertAt, 0, sourceId);
      updateActiveView({ columnOrder: order });
    },
    [activeView, updateActiveView],
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      updateActiveView({
        columnWidths: { ...activeView.columnWidths, [columnId]: Math.max(80, width) },
      });
    },
    [activeView, updateActiveView],
  );

  const resetToDefault = useCallback(() => {
    persist({ activeViewId: "default", views: [defaultView] });
  }, [defaultView, persist]);

  const toggleFreezeColumn = useCallback(
    (columnId: string) => {
      const frozen = new Set(activeView.frozenColumnIds);
      if (frozen.has(columnId)) frozen.delete(columnId);
      else frozen.add(columnId);
      updateActiveView({ frozenColumnIds: [...frozen] });
    },
    [activeView, updateActiveView],
  );

  const savePersonalView = useCallback(
    (name: string) => {
      const id = `personal-${Date.now()}`;
      const view: EnterpriseGridViewState = {
        ...activeView,
        id,
        name,
        scope: "personal",
      };
      persist({
        activeViewId: id,
        views: [defaultView, ...prefs.views.filter((v) => v.id !== "default" && v.scope !== "personal"), view],
      });
    },
    [activeView, prefs.views, persist, defaultView],
  );

  return {
    prefs,
    activeView,
    visibleColumns,
    toggleColumn,
    toggleFreezeColumn,
    moveColumn,
    reorderColumn,
    setColumnWidth,
    resetToDefault,
    savePersonalView,
    setActiveViewId: (id: string) => persist({ ...prefs, activeViewId: id }),
  };
}
