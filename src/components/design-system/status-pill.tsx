import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  dot?: boolean;
}

export function StatusPill({ className, variant, dot = true, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-primary": variant === "default",
            "bg-success": variant === "success",
            "bg-warning": variant === "warning",
            "bg-destructive": variant === "error",
            "bg-info": variant === "info",
            "bg-muted-foreground": variant === "muted",
          })}
        />
      )}
      {children}
    </span>
  );
}
