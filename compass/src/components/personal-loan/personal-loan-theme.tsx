"use client";

import { cn } from "@/lib/utils";

export function PersonalLoanTheme({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        // Royal Blue + Electric Cyan accent experiment (scoped to this page only).
        ["--primary" as any]: "#3b82f6",
        ["--primary-foreground" as any]: "#041024",
        ["--accent" as any]: "#22d3ee",
        ["--accent-foreground" as any]: "#031a22",
        ["--ring" as any]: "#3b82f6",
        ["--glow" as any]: "rgba(59, 130, 246, 0.40)",
      }}
    >
      {children}
    </div>
  );
}

