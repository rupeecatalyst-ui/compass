"use client";

import { useCallback, useMemo, useState } from "react";
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

export function useEnterpriseGridPreferences<T>(
  storageKey: string,
  columns: EnterpriseGridColumnDef<T>[],
) {
  const defaultView = useMemo(() => buildDefaultView(columns), [columns]);

  const [prefs, setPrefs] = useState<EnterpriseGridPreferences>(() => {
    if (typeof window === "undefined") {
      return { activeViewId: "default", views: [defaultView] };
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return { activeViewId: "default", views: [defaultView] };
      const parsed = JSON.parse(raw) as EnterpriseGridPreferences;
      if (!parsed.views?.length) return { activeViewId: "default", views: [defaultView] };
      return parsed;
    } catch {
      return { activeViewId: "default", views: [defaultView] };
    }
  });

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

  const toggleColumn = useCallback(
    (columnId: string) => {
      const view = { ...activeView };
      const visible = new Set(view.visibleColumnIds);
      if (visible.has(columnId)) visible.delete(columnId);
      else visible.add(columnId);
      view.visibleColumnIds = [...visible];
      const views = prefs.views.map((v) => (v.id === view.id ? view : v));
      persist({ ...prefs, views });
    },
    [activeView, prefs, persist],
  );

  const moveColumn = useCallback(
    (columnId: string, direction: "left" | "right") => {
      const order = [...activeView.columnOrder];
      const idx = order.indexOf(columnId);
      if (idx < 0) return;
      const swap = direction === "left" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= order.length) return;
      [order[idx], order[swap]] = [order[swap]!, order[idx]!];
      const view = { ...activeView, columnOrder: order };
      const views = prefs.views.map((v) => (v.id === view.id ? view : v));
      persist({ ...prefs, views });
    },
    [activeView, prefs, persist],
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const view = {
        ...activeView,
        columnWidths: { ...activeView.columnWidths, [columnId]: Math.max(80, width) },
      };
      const views = prefs.views.map((v) => (v.id === view.id ? view : v));
      persist({ ...prefs, views });
    },
    [activeView, prefs, persist],
  );

  const resetToDefault = useCallback(() => {
    persist({ activeViewId: "default", views: [defaultView] });
  }, [defaultView, persist]);

  const toggleFreezeColumn = useCallback(
    (columnId: string) => {
      const frozen = new Set(activeView.frozenColumnIds);
      if (frozen.has(columnId)) frozen.delete(columnId);
      else frozen.add(columnId);
      const view = { ...activeView, frozenColumnIds: [...frozen] };
      const views = prefs.views.map((v) => (v.id === view.id ? view : v));
      persist({ ...prefs, views });
    },
    [activeView, prefs, persist],
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
        views: [...prefs.views.filter((v) => v.scope !== "personal" || v.id === "default"), view, ...prefs.views.filter((v) => v.id === "default")],
      });
    },
    [activeView, prefs.views, persist],
  );

  return {
    prefs,
    activeView,
    visibleColumns,
    toggleColumn,
    toggleFreezeColumn,
    moveColumn,
    setColumnWidth,
    resetToDefault,
    savePersonalView,
    setActiveViewId: (id: string) => persist({ ...prefs, activeViewId: id }),
  };
}
