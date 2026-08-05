import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** `registry` = CO-UX-016 compact Enterprise Registry chrome */
  density?: "default" | "registry";
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  density = "default",
}: PageHeaderProps) {
  const compact = density === "registry";
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between",
        compact ? "gap-1.5" : "gap-4",
        className,
      )}
    >
      <div className={cn(compact ? "space-y-0" : "space-y-1")}>
        <h1
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-sm md:text-[15px]" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "hidden text-[11px] sm:block" : "text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>{actions}</div>
      )}
    </div>
  );
}
