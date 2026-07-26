import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { HorizonShell } from "@/horizon/shell";

export const metadata: Metadata = {
  title: "Horizon",
  description: "Catalyst One Strategic Planning Workspace",
};

/** Isolated Horizon layout — CO-STAB-001 AuthGuard (fail-closed). */
export default function HorizonLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <HorizonShell>{children}</HorizonShell>
    </AuthGuard>
  );
}
