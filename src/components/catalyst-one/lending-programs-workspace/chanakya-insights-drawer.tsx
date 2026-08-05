"use client";

/**
 * CO-LW-004 — CHANAKYA Insights drawer (collapsed by default; optional pin).
 */

import { useEffect, useState } from "react";
import {
  Calendar,
  MessageCircle,
  Phone,
  Pin,
  PinOff,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LENDING_PROGRAMS_CHANAKYA_PIN_KEY } from "@/constants/lending-programs-workspace";
import type {
  LendingProgramsLivePipeline,
  LendingProgramsTeamMember,
} from "@/types/lending-programs-workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusLabel: string | null;
  productMode?: boolean;
  team: LendingProgramsTeamMember[];
  pipeline: LendingProgramsLivePipeline | null;
  onOpenContact: () => void;
  onCreateOpportunity: () => void;
};

export function ChanakyaInsightsDrawer({
  open,
  onOpenChange,
  focusLabel,
  productMode,
  team,
  pipeline,
  onOpenContact,
  onCreateOpportunity,
}: Props) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(LENDING_PROGRAMS_CHANAKYA_PIN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (pinned) onOpenChange(true);
  }, [pinned, onOpenChange]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    try {
      localStorage.setItem(LENDING_PROGRAMS_CHANAKYA_PIN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) onOpenChange(true);
  };

  const insights: string[] = [];
  if (!focusLabel) {
    insights.push(
      productMode
        ? "Select a product family to review programmes, lenders, and live pipeline."
        : "Select a lender to load programmes, relationship team, and live pipeline.",
    );
  } else {
    insights.push(`Focus: ${focusLabel}.`);
    if (pipeline && pipeline.dealCount > 0) {
      insights.push(
        `${pipeline.dealCount} live deal(s) · ${pipeline.opportunityHints} opportunity hint(s).`,
      );
    } else {
      insights.push("No live deals in this context yet.");
    }
    if (team.length === 0) {
      insights.push(
        productMode
          ? "Focus an eligible lender to enable relationship actions."
          : "Relationship team empty — capture Sales Contact on Identify Lender.",
      );
    } else {
      insights.push(`${team.length} relationship contact(s) available.`);
    }
  }

  const primaryMobile = team.find((t) => t.mobile)?.mobile;
  const visible = open || pinned;

  return (
    <aside
      className={cn(
        "fixed right-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-[min(100%,20rem)] flex-col border-l border-border bg-card shadow-lg transition-transform duration-200",
        visible ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
      data-surface="lp-chanakya-drawer"
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
          CHANAKYA Insights
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title={pinned ? "Unpin drawer" : "Pin drawer"}
            onClick={togglePin}
          >
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={pinned}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            Insights
          </h3>
          <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
            {insights.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            Next actions
          </h3>
          <ul className="space-y-0.5 text-[11px] text-muted-foreground">
            <li>· Confirm programme fit before login</li>
            <li>· Keep Sales Contact mobile current</li>
            <li>· Refresh Snapshot after publishes</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            Quick Actions
          </h3>
          <div className="grid gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 justify-start gap-1.5 text-[11px]"
              disabled={!primaryMobile}
              onClick={() => {
                if (!primaryMobile) return;
                window.open(`tel:${primaryMobile.replace(/\D/g, "")}`, "_self");
              }}
            >
              <Phone className="h-3 w-3" />
              Call
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 justify-start gap-1.5 text-[11px]"
              disabled={!primaryMobile}
              onClick={() => {
                if (!primaryMobile) return;
                const digits = primaryMobile.replace(/\D/g, "");
                window.open(
                  `https://wa.me/91${digits.slice(-10)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 justify-start gap-1.5 text-[11px]"
              onClick={onOpenContact}
            >
              <UserRound className="h-3 w-3" />
              Open Contact
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 justify-start gap-1.5 text-[11px]"
              onClick={onCreateOpportunity}
            >
              <Plus className="h-3 w-3" />
              Create Opportunity
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 justify-start gap-1.5 text-[11px]"
              onClick={() =>
                toast.message("Schedule Meeting", {
                  description: "Use Action Center / Tasks — ETE remains task SSOT.",
                })
              }
            >
              <Calendar className="h-3 w-3" />
              Schedule Meeting
            </Button>
          </div>
        </section>
      </div>
    </aside>
  );
}
