"use client";

import { useEffect, useState } from "react";
import { CommandShellLoading } from "@/components/design-system/command-shell-loading";
import {
  DetailSlideOver,
  HorizonHeader,
  ParkingLot,
  PlaceholderActionDialog,
  PortfolioOverview,
  QuickNotes,
  RecentProgress,
  TodaysFocus,
  UpcomingMilestones,
  WaitingOn,
} from "./components";
import type { HierarchyActionId } from "./components/HierarchyActionsMenu";
import { InitiativesWorkspace } from "./initiative-workspace";
import { createHorizonWorkspaceProvider } from "./providers";
import type { HorizonSelection, HorizonWorkspaceModel, ModeId } from "./types";

/**
 * Horizon — single-screen Strategic Planning Workspace.
 * Independent of Mission Control and operational dashboards.
 * All interaction stays on /horizon (expand, inline edit, slide-over, modal, menus).
 */
export function HorizonWorkspace() {
  const [model, setModel] = useState<HorizonWorkspaceModel | null>(null);
  const [mode, setMode] = useState<ModeId>("strategic");
  const [selection, setSelection] = useState<HorizonSelection | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createHorizonWorkspaceProvider()
      .getWorkspaceModel()
      .then((page) => {
        if (cancelled) return;
        setModel(page);
        setMode(page.mode);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDetail = (next: HorizonSelection) => {
    setSelection(next);
    setDetailOpen(true);
  };

  const handleAction = (action: HierarchyActionId, next: HorizonSelection) => {
    if (action === "open_detail") {
      openDetail(next);
      return;
    }
    const labels: Record<HierarchyActionId, string> = {
      open_detail: "Open detail",
      add_child: "Add child",
      park: "Send to parking lot",
      mark_waiting: "Mark waiting on",
      placeholder: "Action",
    };
    setDialog({
      title: `${labels[action]} · ${next.title}`,
      description: `Placeholder action for ${next.kind} “${next.title}”. No persistence in this sprint.`,
    });
  };

  if (!model) {
    return <CommandShellLoading label="Preparing Horizon…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Horizon Strategic Planning Workspace">
      <HorizonHeader mode={mode} modes={model.modes} onModeChange={setMode} />
      <PortfolioOverview portfolio={model.portfolio} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <InitiativesWorkspace
          className="rounded-2xl border border-zinc-800/90 bg-zinc-950/50 p-4 md:p-5"
          initiatives={model.initiatives}
          onSelect={openDetail}
          onAction={handleAction}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TodaysFocus
            items={model.todayFocus}
            onSelect={(item) =>
              openDetail({
                id: item.id,
                kind: item.kind,
                title: item.title,
                subtitle: item.initiativeTitle,
              })
            }
          />
          <UpcomingMilestones
            items={model.upcomingMilestones}
            onSelect={(item) =>
              openDetail({
                id: item.id,
                kind: "milestone",
                title: item.title,
                subtitle: item.initiativeTitle,
              })
            }
          />
          <WaitingOn items={model.waitingOn} />
          <ParkingLot items={model.parkingLot} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentProgress entries={model.recentProgress} />
        <QuickNotes notes={model.notes} />
      </div>

      <DetailSlideOver
        selection={selection}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <PlaceholderActionDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
      />

      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-zinc-700">
        Horizon · {mode} mode · single screen · placeholder providers
      </p>
    </div>
  );
}
