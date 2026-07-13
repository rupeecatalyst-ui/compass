"use client";

import { getEcmRoleDefinition, getEcmRoleLabel, getEnabledEcmRoleMaster } from "@/constants/enterprise-contact-master";
import type { EcmContactRole } from "@/types/enterprise-contact-master";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  teal: "border-teal-200/80 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200",
  indigo:
    "border-indigo-200/80 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200",
  amber:
    "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  rose: "border-rose-200/80 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  slate:
    "border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  violet:
    "border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  sky: "border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
};

interface ContactRoleChipsProps {
  roles: EcmContactRole[];
  selected?: EcmContactRole[];
  onToggle?: (role: EcmContactRole) => void;
  interactive?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function ContactRoleChips({
  roles,
  selected,
  onToggle,
  interactive = false,
  className,
  size = "sm",
}: ContactRoleChipsProps) {
  const master = getEnabledEcmRoleMaster();
  const display = interactive ? master.map((m) => m.code) : roles;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {display.map((code) => {
        const active = interactive ? Boolean(selected?.includes(code)) : true;
        if (!interactive && !roles.includes(code)) return null;
        const tone = getEcmRoleDefinition(code)?.chipTone ?? "slate";
        return (
          <button
            key={code}
            type="button"
            disabled={!interactive}
            onClick={() => onToggle?.(code)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-medium tracking-tight transition-all",
              size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
              interactive && !active && "border-border/80 bg-background text-muted-foreground hover:bg-muted/60",
              active && TONE_CLASS[tone],
              interactive && active && "ring-1 ring-black/5 dark:ring-white/10",
              !interactive && "cursor-default",
            )}
          >
            {active && <Check className="h-3 w-3 shrink-0 opacity-80" aria-hidden />}
            {getEcmRoleLabel(code)}
          </button>
        );
      })}
      {!interactive && roles.length === 0 && (
        <span className="text-xs text-muted-foreground">No roles</span>
      )}
    </div>
  );
}
