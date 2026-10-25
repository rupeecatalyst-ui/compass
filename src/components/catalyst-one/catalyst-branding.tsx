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
          <div className="flex h-9 max-w-[7.5rem] shrink-0 items-center rounded-md bg-white px-1 ring-1 ring-black/5 dark:ring-white/15">
            <RupeeCatalystLogo size={28} />
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
          <span className="flex h-6 max-w-[6rem] items-center rounded bg-white px-0.5 ring-1 ring-black/5 dark:ring-white/15">
            <RupeeCatalystLogo size={18} />
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
        <div className="flex h-11 max-w-[9rem] items-center rounded-xl bg-white px-1.5 ring-1 ring-black/5 dark:ring-white/15">
          <RupeeCatalystLogo size={36} />
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
