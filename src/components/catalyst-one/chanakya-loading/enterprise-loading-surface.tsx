"use client";

/**
 * CO-UX-008 — Controlled loading gate for async workspace data.
 * Level 1 (&lt;500ms): no overlay — children render immediately when ready.
 * Never artificially delays the user.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChanakyaLoadingExperience } from "./chanakya-loading-experience";
import {
  CHANAKYA_LOADING_COMPLETION_MS,
  CHANAKYA_LOADING_LEVEL1_MS,
} from "@/constants/chanakya-loading/timing";
import type {
  ChanakyaLoadingDensity,
  ChanakyaLoadingLiveSignals,
  ChanakyaLoadingModule,
} from "@/types/chanakya-loading";

export type EnterpriseLoadingSurfaceProps = {
  loading: boolean;
  module?: ChanakyaLoadingModule;
  statusLabel?: string;
  density?: ChanakyaLoadingDensity;
  signals?: ChanakyaLoadingLiveSignals | null;
  useEbiSignals?: boolean;
  children: ReactNode;
  className?: string;
};

export function EnterpriseLoadingSurface({
  loading,
  module = "enterprise",
  statusLabel,
  density = "panel",
  signals,
  useEbiSignals = true,
  children,
  className,
}: EnterpriseLoadingSurfaceProps) {
  const startedAt = useRef<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  useEffect(() => {
    if (loading) {
      startedAt.current = performance.now();
      setShowOverlay(true);
      setOverlayLoading(true);
      return;
    }

    const started = startedAt.current;
    const elapsed = started != null ? performance.now() - started : 0;
    startedAt.current = null;

    // Level 1 — load finished before 500ms: no loading chrome, no artificial wait.
    if (elapsed < CHANAKYA_LOADING_LEVEL1_MS || !showOverlay) {
      setOverlayLoading(false);
      setShowOverlay(false);
      return;
    }

    setOverlayLoading(false);
    const id = window.setTimeout(() => setShowOverlay(false), CHANAKYA_LOADING_COMPLETION_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showOverlay intentional snapshot on load end
  }, [loading]);

  if (!showOverlay) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      <ChanakyaLoadingExperience
        module={module}
        statusLabel={statusLabel}
        density={density}
        loading={overlayLoading}
        signals={signals}
        useEbiSignals={useEbiSignals}
      />
    </div>
  );
}
