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
          <RupeeCatalystLogo size={28} className="shrink-0" />
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
          <RupeeCatalystLogo size={20} />
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
        <RupeeCatalystLogo size={36} />
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
