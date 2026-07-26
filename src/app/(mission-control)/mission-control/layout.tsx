import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MissionControlShell } from "@/mission-control/shell";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Catalyst One Enterprise Command Center",
};

/**
 * Isolated Mission Control layout — does not use operational DashboardLayout.
 * CO-STAB-001 — fail-closed AuthGuard (same enterprise gate as dashboard).
 */
export default function MissionControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MissionControlShell>{children}</MissionControlShell>
    </AuthGuard>
  );
}
