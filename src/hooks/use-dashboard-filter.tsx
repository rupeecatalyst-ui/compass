"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  resolveDashboardDateRange,
  type DashboardDatePreset,
  type DashboardDateRange,
} from "@/lib/dashboard-date-utils";

interface DashboardFilterContextValue {
  preset: DashboardDatePreset;
  customStart: string;
  customEnd: string;
  dateRange: DashboardDateRange;
  setPreset: (preset: DashboardDatePreset) => void;
  setCustomStart: (value: string) => void;
  setCustomEnd: (value: string) => void;
}

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<DashboardDatePreset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(
    () => resolveDashboardDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const value = useMemo(
    () => ({
      preset,
      customStart,
      customEnd,
      dateRange,
      setPreset,
      setCustomStart,
      setCustomEnd,
    }),
    [preset, customStart, customEnd, dateRange],
  );

  return (
    <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>
  );
}

export function useDashboardFilter() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error("useDashboardFilter must be used within DashboardFilterProvider");
  }
  return context;
}
