import { cn } from "@/lib/utils";
import { RupeeCatalystLogo } from "@/components/branding/rupee-catalyst-logo";

interface CatalystBrandingProps {
  variant?: "header" | "sidebar" | "compact";
  className?: string;
}

export function CatalystBranding({ variant = "header", className }: CatalystBrandingProps) {
  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-0.5", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <RupeeCatalystLogo size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sidebar-foreground truncate">Catalyst One</p>
            <p className="text-[10px] text-muted-foreground truncate">Enterprise Operating System</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
        <span className="inline-flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
            <RupeeCatalystLogo size={16} />
          </span>
          <span className="font-medium text-foreground">Catalyst One</span>
        </span>
        <span className="hidden sm:inline opacity-40">·</span>
        <span>Enterprise Operating System</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <RupeeCatalystLogo size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catalyst One
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/90">Enterprise Operating System</span>
            <span className="opacity-40">·</span>
            <span>Rupee Catalyst</span>
          </div>
        </div>
      </div>
    </div>
  );
}
