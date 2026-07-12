import type { Metadata } from "next";
import { MissionControlShell } from "@/mission-control/shell";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Catalyst One Enterprise Command Center",
};

/**
 * Isolated Mission Control layout — does not use operational DashboardLayout.
 */
export default function MissionControlLayout({ children }: { children: React.ReactNode }) {
  return <MissionControlShell>{children}</MissionControlShell>;
}
