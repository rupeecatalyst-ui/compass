"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalLoadingProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
}

export function GlobalLoading({
  className,
  message = "Loading...",
  fullScreen = false,
}: GlobalLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullScreen && "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
