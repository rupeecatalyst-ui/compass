import type { Metadata } from "next";
import { HorizonShell } from "@/horizon/shell";

export const metadata: Metadata = {
  title: "Horizon",
  description: "Catalyst One Strategic Planning Workspace",
};

/** Isolated Horizon layout — outside operational dashboard and Mission Control */
export default function HorizonLayout({ children }: { children: React.ReactNode }) {
  return <HorizonShell>{children}</HorizonShell>;
}
