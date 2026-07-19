"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { createMissionControlSecurityGateway } from "../security";
import { getMissionControlFeatureByRoute } from "../feature-registry";
import { McEnterpriseHeader } from "./enterprise-header";
import { McGlobalStatusBar } from "./global-status-bar";
import { McNavigationRail } from "./navigation-rail";
import { McSecurityGateway } from "./security-gateway";

/**
 * Persistent Mission Control shell.
 * Header + Nav + Status remain mounted; only workspace children change.
 */
export function MissionControlShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/mission-control";
  const [collapsed, setCollapsed] = useState(false);
  const feature = useMemo(() => getMissionControlFeatureByRoute(pathname), [pathname]);
  const gateway = useMemo(() => createMissionControlSecurityGateway(), []);

  const isRadarLanding = pathname === "/mission-control";
  const isBriefing = pathname === "/mission-control/executive-briefing";
  const currentModule = feature?.displayName ?? "Mission Control";
  const workspaceTitle = isRadarLanding
    ? "CHANAKYA Radar"
    : isBriefing
      ? "CHANAKYA Executive Briefing"
      : (feature?.displayName ?? "Command Center");

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <McEnterpriseHeader
        environment="development"
        currentModule={currentModule}
        workspaceTitle={workspaceTitle}
        breadcrumbs={
          isRadarLanding
            ? [
                { label: "Mission Control", href: "/mission-control" },
                { label: "Radar" },
              ]
            : isBriefing
              ? [
                  { label: "Mission Control", href: "/mission-control" },
                  { label: "CHANAKYA" },
                ]
              : [
                  { label: "Mission Control", href: "/mission-control" },
                  { label: currentModule },
                ]
        }
      />
      <div className="flex min-h-0 flex-1">
        <McNavigationRail
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          activeHref={pathname}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-zinc-900/40">
          <McSecurityGateway
            gateway={gateway}
            context={{
              authenticated: true,
              sessionValid: true,
              mfaSatisfied: true,
              roles: [],
              permissions: [],
              deviceTrusted: true,
              maintenanceMode: false,
              emergencyLock: false,
            }}
          >
            <div className="mx-auto w-full max-w-[1600px] p-3 md:p-5">{children}</div>
          </McSecurityGateway>
        </main>
      </div>
      <McGlobalStatusBar />
    </div>
  );
}
