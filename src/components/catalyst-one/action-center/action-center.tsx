"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  FileStack,
  FileUp,
  Mail,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ACTION_CENTER_CATALOG,
  LOAN_REFERENCE_ACTION_IDS,
} from "@/constants/enterprise-action-center";
import type {
  ActionCenterActionId,
  ActionCenterContext,
  ActionCenterEntityType,
} from "@/types/enterprise-action-center";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<ActionCenterActionId, typeof Mail>> = {
  send_email: Mail,
  email_lender: Mail,
  email_customer: Mail,
  email_partner: Mail,
  email_source: Mail,
  send_whatsapp: MessageCircle,
  whatsapp_lender: MessageCircle,
  whatsapp_customer: MessageCircle,
  send_sms: MessageCircle,
  schedule_meeting: BriefcaseBusiness,
  internal_chat: MessageCircle,
  share_documents: FileUp,
  request_documents: FileStack,
  add_activity: Mic,
  view_activity: History,
  upload_documents: FileUp,
  ask_chanakya: Sparkles,
  open_credit_workbench: FileStack,
  open_loan_workspace: BriefcaseBusiness,
  add_contact: Plus,
  edit_contact: Pencil,
};

const GROUP_LABEL: Record<string, string> = {
  navigation: "Navigate",
  communication: "Communication",
  documents: "Documents",
  workflow: "Workflow",
  intelligence: "Intelligence",
  commercial: "Commercial",
};

/**
 * Hidden until clicked — never permanently consumes screen space.
 */
export type ActionCenterReadinessNotice = {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ActionCenter({
  context,
  enabledActionIds,
  onAction,
  className,
  readinessNotices,
}: {
  context: ActionCenterContext;
  enabledActionIds?: ActionCenterActionId[];
  onAction: (id: ActionCenterActionId) => void;
  className?: string;
  /** CO-DWS-001 — non-blocking readiness (e.g. Accounting Ready). */
  readinessNotices?: ActionCenterReadinessNotice[];
}) {
  const [open, setOpen] = useState(false);

  const actions = useMemo(() => {
    const enabled = new Set(
      enabledActionIds ??
        (context.entityType === "loan"
          ? [...LOAN_REFERENCE_ACTION_IDS]
          : ACTION_CENTER_CATALOG.filter((a) =>
              a.entityTypes.includes(context.entityType as ActionCenterEntityType),
            ).map((a) => a.id)),
    );

    return ACTION_CENTER_CATALOG.filter((a) =>
      a.entityTypes.includes(context.entityType),
    ).map((a) => ({
      ...a,
      available: enabled.has(a.id),
      reason: enabled.has(a.id) ? undefined : "Coming soon for this workspace",
    }));
  }, [context.entityType, enabledActionIds]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof actions>();
    for (const a of actions) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    const order = [
      "navigation",
      "communication",
      "documents",
      "workflow",
      "intelligence",
      "commercial",
    ];
    return order
      .filter((g) => map.has(g))
      .map((g) => [g, map.get(g)!] as const);
  }, [actions]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-teal-500",
            className,
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Action Center
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[90] w-[300px] border-border/70 p-0 shadow-xl"
        sideOffset={8}
      >
        <div className="border-b border-border/60 bg-gradient-to-r from-teal-500/10 to-transparent px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800 dark:text-teal-200">
            Action Center
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{context.entityLabel}</p>
        </div>
        {readinessNotices && readinessNotices.length > 0 ? (
          <div
            className="space-y-1.5 border-b border-amber-500/25 bg-amber-500/5 px-3 py-2"
            data-dws="action-center-readiness"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
              Readiness
            </p>
            {readinessNotices.map((notice) => (
              <div key={notice.title} className="space-y-0.5">
                <p className="text-[11px] font-semibold text-foreground">⚠ {notice.title}</p>
                <p className="text-[10px] leading-snug text-muted-foreground">{notice.detail}</p>
                {notice.actionLabel && notice.onAction ? (
                  <button
                    type="button"
                    className="text-[10px] font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                    onClick={(e) => {
                      e.preventDefault();
                      notice.onAction?.();
                      setOpen(false);
                    }}
                  >
                    {notice.actionLabel}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto py-1">
          {groups.map(([group, items], gi) => (
            <div key={group}>
              {gi > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {GROUP_LABEL[group] ?? group}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {items.map((item) => {
                  const Icon = ICONS[item.id] ?? MoreHorizontal;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      disabled={!item.available}
                      className="cursor-pointer gap-2.5 px-3 py-2"
                      onSelect={() => {
                        if (!item.available) return;
                        onAction(item.id);
                      }}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-teal-700 group-focus:text-accent-foreground dark:text-teal-300" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{item.label}</span>
                        <span className="block text-[10px] leading-snug text-muted-foreground group-focus:text-accent-foreground/85">
                          {item.available ? item.description : item.reason}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

