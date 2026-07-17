"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  EiDateComparisonMode,
  EiDrillTarget,
  EiCrossFilterState,
} from "@/types/executive-intelligence-capabilities";

export type { EiCrossFilterState };

interface EiVizInteractionContextValue {
  filters: EiCrossFilterState;
  setFilter: (key: keyof EiCrossFilterState, value: string | undefined) => void;
  clearFilters: () => void;
  drillStack: EiDrillTarget[];
  drillDown: (target: EiDrillTarget) => void;
  drillUp: () => void;
  dateMode: EiDateComparisonMode;
  setDateMode: (mode: EiDateComparisonMode) => void;
  compareEnabled: boolean;
  setCompareEnabled: (v: boolean) => void;
}

const EiVizInteractionContext = createContext<EiVizInteractionContextValue | null>(null);

export function EiVizInteractionProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<EiCrossFilterState>({});
  const [drillStack, setDrillStack] = useState<EiDrillTarget[]>([]);
  const [dateMode, setDateMode] = useState<EiDateComparisonMode>("vs_prior");
  const [compareEnabled, setCompareEnabled] = useState(true);

  const setFilter = useCallback((key: keyof EiCrossFilterState, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setDrillStack([]);
  }, []);

  const drillDown = useCallback((target: EiDrillTarget) => {
    setDrillStack((s) => [...s, target]);
    if (target.dimension === "stage") setFilters((f) => ({ ...f, stageId: target.key }));
    if (target.dimension === "product") setFilters((f) => ({ ...f, product: target.key }));
    if (target.dimension === "region") setFilters((f) => ({ ...f, region: target.key }));
    if (target.dimension === "lender") setFilters((f) => ({ ...f, lender: target.key }));
    if (target.dimension === "rm") setFilters((f) => ({ ...f, rm: target.key }));
  }, []);

  const drillUp = useCallback(() => {
    setDrillStack((s) => {
      if (s.length === 0) return s;
      const next = s.slice(0, -1);
      const last = next[next.length - 1];
      setFilters(() => {
        if (!last) return {};
        const f: EiCrossFilterState = {};
        if (last.dimension === "stage") f.stageId = last.key;
        if (last.dimension === "product") f.product = last.key;
        if (last.dimension === "region") f.region = last.key;
        if (last.dimension === "lender") f.lender = last.key;
        if (last.dimension === "rm") f.rm = last.key;
        return f;
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setFilter,
      clearFilters,
      drillStack,
      drillDown,
      drillUp,
      dateMode,
      setDateMode,
      compareEnabled,
      setCompareEnabled,
    }),
    [
      filters,
      setFilter,
      clearFilters,
      drillStack,
      drillDown,
      drillUp,
      dateMode,
      compareEnabled,
    ],
  );

  return (
    <EiVizInteractionContext.Provider value={value}>{children}</EiVizInteractionContext.Provider>
  );
}

export function useEiVizInteraction() {
  const ctx = useContext(EiVizInteractionContext);
  if (!ctx) {
    throw new Error("useEiVizInteraction must be used within EiVizInteractionProvider");
  }
  return ctx;
}

/** Optional hook when shell may render outside provider (tests). */
export function useEiVizInteractionOptional() {
  return useContext(EiVizInteractionContext);
}
