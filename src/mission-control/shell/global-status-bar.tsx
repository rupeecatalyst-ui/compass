"use client";

import { useEffect, useState } from "react";
import { MISSION_CONTROL_BUILD } from "../shared/constants";
import type { MissionControlStatusIndicatorModel } from "../shared/types";
import { createMissionControlHealthStub } from "../health";
import { McStatusIndicator } from "./status-indicator";

export function McGlobalStatusBar() {
  const [indicators, setIndicators] = useState<MissionControlStatusIndicatorModel[]>([]);
  const [now, setNow] = useState(() => new Date().toLocaleString());

  useEffect(() => {
    void createMissionControlHealthStub()
      .listSubsystemStatus()
      .then(setIndicators);
    const timer = window.setInterval(() => setNow(new Date().toLocaleString()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="flex h-9 shrink-0 items-center gap-3 overflow-x-auto border-t border-zinc-800 bg-zinc-950 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {indicators.map((indicator) => (
          <McStatusIndicator key={indicator.id} indicator={indicator} compact />
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-500">
        <span className="tabular-nums text-zinc-400">{now}</span>
        <span>Build {MISSION_CONTROL_BUILD}</span>
      </div>
    </footer>
  );
}
