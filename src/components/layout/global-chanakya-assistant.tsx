"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ChanakyaGuidePanel, ChanakyaTourDialog } from "@/components/catalyst-one/chanakya-guide";
import { useGlobalChanakya } from "@/components/layout/global-chanakya-provider";
import { Button } from "@/components/ui/button";
import { resolveGlobalChanakyaAssistant } from "@/lib/chanakya-assistant/resolve-context";
import {
  loadChanakyaTourState,
  saveChanakyaTourState,
} from "@/lib/chanakya-guide";
import type { ChanakyaTourState } from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";

/**
 * Permanent global header control — 💜 CHANAKYA
 * Opens the platform AI drawer without resizing the workspace.
 */
export function GlobalChanakyaButton({
  className,
  density = "default",
}: {
  className?: string;
  density?: "default" | "compact";
}) {
  const { openAssistant } = useGlobalChanakya();

  return (
    <Button
      type="button"
      variant="ghost"
      size={density === "compact" ? "sm" : "sm"}
      className={cn(
        "gap-1.5 font-semibold text-violet-800 hover:bg-violet-500/10 hover:text-violet-950 dark:text-violet-200 dark:hover:text-violet-50",
        density === "compact" ? "h-8 px-2 text-[11px]" : "h-9 px-2.5 text-xs",
        className,
      )}
      onClick={openAssistant}
      aria-label="Open CHANAKYA assistant"
    >
      <span aria-hidden>💜</span>
      CHANAKYA
    </Button>
  );
}

/**
 * Single platform drawer — overlays content; does not shrink workspace width.
 * Context is resolved from the current route + active opportunity automatically.
 */
export function GlobalChanakyaDrawer() {
  const pathname = usePathname() || "/";
  const { open, setOpen } = useGlobalChanakya();
  const [tourOpen, setTourOpen] = useState(false);
  const [tour, setTour] = useState<ChanakyaTourState>(() => ({
    status: "not_started",
    stepIndex: 0,
    updatedAt: new Date(0).toISOString(),
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTour(loadChanakyaTourState());
  }, []);

  /** Re-resolve when drawer opens so opportunity context is fresh. */
  useEffect(() => {
    if (open) setTick((t) => t + 1);
  }, [open, pathname]);

  const resolved = useMemo(() => {
    void tick;
    return resolveGlobalChanakyaAssistant(pathname);
  }, [pathname, tick]);

  const openTour = () => {
    const next = saveChanakyaTourState({ status: "in_progress", stepIndex: 0 });
    setTour(next);
    setOpen(false);
    setTourOpen(true);
  };

  return (
    <>
      <ChanakyaGuidePanel
        open={open}
        onOpenChange={setOpen}
        context={resolved.guideContext}
        advisorTitle={resolved.advisorTitle}
        onOpenTour={openTour}
        overlayOnly
      />
      <ChanakyaTourDialog
        open={tourOpen}
        onOpenChange={setTourOpen}
        tour={tour}
        onTourChange={setTour}
      />
    </>
  );
}

/** Compact Mission Control trigger (dark chrome). */
export function GlobalChanakyaMcButton({ className }: { className?: string }) {
  const { openAssistant } = useGlobalChanakya();
  return (
    <button
      type="button"
      title="CHANAKYA"
      aria-label="Open CHANAKYA assistant"
      onClick={openAssistant}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-violet-500/35 bg-violet-500/10 px-2 py-1.5 text-[11px] font-semibold text-violet-100 transition-colors hover:bg-violet-500/20",
        className,
      )}
    >
      <span aria-hidden>💜</span>
      CHANAKYA
    </button>
  );
}

export function GlobalChanakyaTourHint() {
  return (
    <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <BookOpen className="h-3 w-3" />
      Guided tour available inside CHANAKYA
    </p>
  );
}
