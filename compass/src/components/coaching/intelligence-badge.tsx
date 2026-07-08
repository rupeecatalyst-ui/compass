import { Sparkles } from "lucide-react";
import { INTELLIGENCE_ATTRIBUTION } from "@/config/coaching";
import { cn } from "@/lib/utils";

interface IntelligenceBadgeProps {
  className?: string;
  compact?: boolean;
}

export function IntelligenceBadge({ className, compact = false }: IntelligenceBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] text-primary",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-xs",
        className,
      )}
    >
      <Sparkles className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span className="font-medium tracking-wide">{INTELLIGENCE_ATTRIBUTION}</span>
    </div>
  );
}
