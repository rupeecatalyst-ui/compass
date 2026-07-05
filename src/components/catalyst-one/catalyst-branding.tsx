import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalystBrandingProps {
  variant?: "header" | "sidebar" | "compact";
  className?: string;
}

export function CatalystBranding({ variant = "header", className }: CatalystBrandingProps) {
  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-0.5", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sidebar-foreground truncate">Catalyst One</p>
            <p className="text-[10px] text-muted-foreground truncate">Powered by COMPASS</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
        <span className="font-medium text-foreground">Catalyst One</span>
        <span className="hidden sm:inline">·</span>
        <span>Powered by COMPASS</span>
        <span className="hidden md:inline">·</span>
        <span className="hidden md:inline">Rupee Catalyst</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catalyst One
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>Powered by <span className="text-primary font-medium">COMPASS</span></span>
            <span>·</span>
            <span>Powered by <span className="text-accent font-medium">Rupee Catalyst</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
