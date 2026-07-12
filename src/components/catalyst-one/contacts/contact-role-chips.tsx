"use client";

import { getEcmRoleLabel, getEnabledEcmRoleMaster } from "@/constants/enterprise-contact-master";
import type { EcmContactRole } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";

interface ContactRoleChipsProps {
  roles: EcmContactRole[];
  selected?: EcmContactRole[];
  onToggle?: (role: EcmContactRole) => void;
  interactive?: boolean;
  className?: string;
}

export function ContactRoleChips({
  roles,
  selected,
  onToggle,
  interactive = false,
  className,
}: ContactRoleChipsProps) {
  const master = getEnabledEcmRoleMaster();
  const display = interactive ? master.map((m) => m.code) : roles;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {display.map((code) => {
        const active = interactive ? Boolean(selected?.includes(code)) : true;
        if (!interactive && !roles.includes(code)) return null;
        return (
          <button
            key={code}
            type="button"
            disabled={!interactive}
            onClick={() => onToggle?.(code)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
              !interactive && "cursor-default",
            )}
          >
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
