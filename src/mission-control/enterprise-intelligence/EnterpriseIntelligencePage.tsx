"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { EnterpriseIntelligencePlatform } from "./EnterpriseIntelligencePlatform";
import { loadMissionControlCertifiedSnapshot } from "../shared/load-mission-control-snapshot";
import type { MissionControlEnterpriseIntelligencePack } from "@/types/mission-control-enterprise-intelligence";

/**
 * CO-REFINEMENT-004 — Enterprise Intelligence within Mission Control shell.
 * Certified EME snapshot only (same SSOT as Executive Dashboard analytics section).
 */
export function EnterpriseIntelligencePage() {
  const [pack, setPack] = useState<MissionControlEnterpriseIntelligencePack | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadMissionControlCertifiedSnapshot()
      .then((snap) => {
        if (!cancelled) {
          setPack(snap?.intelligence ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPack(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <WorkspaceLoadingState label="Loading Enterprise Intelligence…" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <EnterpriseIntelligencePlatform pack={pack} />
    </div>
  );
}
