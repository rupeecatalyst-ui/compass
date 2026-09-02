"use client";

import {
  CalendarClock,
  Mail,
  MessageCircle,
  Phone,
  Plus,
} from "lucide-react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { Button } from "@/components/ui/button";
import { DEAL_PRIORITY_KANBAN_LABELS } from "@/constants/lender-pipeline";
import type { MyDealsKanbanFieldId } from "@/constants/my-deals-kanban";
import { primaryMyDealsKanbanAlert } from "@/lib/my-deals/kanban-alerts";
import { nextStageLabelForDeal } from "@/lib/my-deals/kanban-board";
import { resolveMyDealsKanbanCta } from "@/lib/my-deals/kanban-cta";
import {
  kanbanActionAvailability,
  resolveKanbanDealParticipants,
} from "@/lib/my-deals/kanban-participants";
import type { DealRegistryRow } from "@/types/deal-registry";
import { cn } from "@/lib/utils";
import type { MyDealsKanbanComposerKind } from "./my-deals-kanban-composer";

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

function OptionalLine({
  show,
  label,
  value,
}: {
  show: boolean;
  label: string;
  value: string | null | undefined;
}) {
  if (!show) return null;
  const display = present(value);
  if (!display) return null;
  return (
    <p className="truncate text-[10px] text-zinc-400">
      <span className="text-zinc-500">{label}: </span>
      {display}
    </p>
  );
}

export function MyDealsKanbanCard({
  row,
  columnId,
  visibleFields,
  onOpenDeal,
  onOpenHref,
  onComposer,
}: {
  row: DealRegistryRow;
  columnId: string;
  visibleFields: ReadonlySet<MyDealsKanbanFieldId>;
  onOpenDeal: (row: DealRegistryRow) => void;
  onOpenHref: (href: string) => void;
  onComposer: (kind: MyDealsKanbanComposerKind, row: DealRegistryRow) => void;
}) {
  const participants = resolveKanbanDealParticipants(row);
  const call = kanbanActionAvailability(participants, "call");
  const email = kanbanActionAvailability(participants, "email");
  const whatsapp = kanbanActionAvailability(participants, "whatsapp");
  const alert = primaryMyDealsKanbanAlert(row);
  const cta = resolveMyDealsKanbanCta(row, columnId);
  const nextStage = nextStageLabelForDeal(row);
  const has = (id: MyDealsKanbanFieldId) => visibleFields.has(id);

  return (
    <article
      className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-2.5 shadow-sm"
      data-deal-id={row.enterpriseDealId || row.id}
      data-surface="my-deals-kanban-card"
    >
      <h3 className="truncate text-sm font-semibold leading-tight text-zinc-50">
        {row.borrowerName}
      </h3>
      <div className="mt-1 flex min-w-0 items-center gap-1.5">
        <LenderLogo
          lender={row.selectedLender}
          seedKey={row.lenderId}
          size="md"
        />
        <p className="truncate text-[12px] font-medium text-zinc-200">
          {present(row.selectedLender) ?? "Lender not specified"}
        </p>
      </div>
      <p className="mt-1 truncate text-[11px] text-zinc-300">{row.product}</p>
      <p className="truncate text-[12px] font-semibold tabular-nums text-teal-200">
        {row.loanAmountLabel}
      </p>

      {alert.primary ? (
        <div className="mt-1.5 flex items-start justify-between gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-1">
          <p className="min-w-0 text-[10px] font-medium leading-snug text-amber-100">
            {alert.primary.label}
          </p>
          {alert.extraCount > 0 ? (
            <span className="shrink-0 text-[10px] text-amber-300">+{alert.extraCount} alerts</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1.5 space-y-0.5">
        <OptionalLine
          show={has("assignedRcEmployee")}
          label="RC employee"
          value={row.assignedRm}
        />
        <OptionalLine show={has("nextStage")} label="Next" value={nextStage} />
        <OptionalLine
          show={has("priority")}
          label="Priority"
          value={DEAL_PRIORITY_KANBAN_LABELS[row.priority] ?? row.priority}
        />
        <OptionalLine
          show={has("daysInStage")}
          label="Days in stage"
          value={row.tatDays > 0 ? String(row.tatDays) : null}
        />
        <OptionalLine show={has("slaStatus")} label="SLA" value={row.slaStatus} />
        <OptionalLine show={has("businessSource")} label="Source" value={row.source} />
        <OptionalLine
          show={has("lastUpdated")}
          label="Updated"
          value={row.lastModifiedLabel || row.lastActivityLabel}
        />
        <OptionalLine
          show={has("latestActivity")}
          label="Activity"
          value={row.lastActivityLabel}
        />
        <OptionalLine show={has("dealId")} label="Deal" value={row.dealId} />
        <OptionalLine
          show={has("opportunityId")}
          label="Opportunity"
          value={row.opportunityNumber}
        />
        <OptionalLine
          show={has("lenderContact")}
          label="Lender contact"
          value={row.lenderContactName}
        />
        <OptionalLine
          show={has("sourceContact")}
          label="Source contact"
          value={row.sourceContactName}
        />
        <OptionalLine
          show={has("expectedDates")}
          label="Expected"
          value={row.expectedDateLabel || (row.nextFollowUp !== "—" ? row.nextFollowUp : null)}
        />
        <OptionalLine show={has("createdDate")} label="Created" value={row.dateCreatedLabel} />
        <OptionalLine
          show={has("documentStatus")}
          label="Documents"
          value={row.documentsPending > 0 ? `${row.documentsPending} pending` : null}
        />
        <OptionalLine
          show={has("taskStatus")}
          label="Tasks"
          value={row.tasksPending > 0 ? `${row.tasksPending} pending` : null}
        />
        <OptionalLine
          show={has("confirmationStatus")}
          label="Confirmation"
          value={row.confirmationStatus}
        />
        <OptionalLine
          show={has("accountingStatus")}
          label="Accounting"
          value={row.accountingStatus}
        />
        <OptionalLine show={has("invoiceStatus")} label="Invoice" value={row.invoiceStatus} />
        <OptionalLine show={has("paymentStatus")} label="Payment" value={row.paymentStatus} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <ActionChip
          label="Call"
          icon={Phone}
          disabled={!call.available}
          title={call.reason}
          onClick={() => onComposer("call", row)}
        />
        <ActionChip
          label="Email"
          icon={Mail}
          disabled={!email.available}
          title={email.reason}
          onClick={() => onComposer("email", row)}
        />
        <ActionChip
          label="WhatsApp"
          icon={MessageCircle}
          disabled={!whatsapp.available}
          title={whatsapp.reason}
          onClick={() => onComposer("whatsapp", row)}
        />
        <ActionChip
          label="Activity"
          icon={Plus}
          onClick={() => onComposer("activity", row)}
        />
        <ActionChip
          label="Follow-up"
          icon={CalendarClock}
          onClick={() => onComposer("followup", row)}
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="mt-2 h-7 w-full text-[11px]"
        disabled={!cta.href}
        title={cta.disabledReason}
        onClick={() => {
          if (cta.href) onOpenHref(cta.href);
          else onOpenDeal(row);
        }}
      >
        {cta.label}
      </Button>
    </article>
  );
}

function ActionChip({
  label,
  icon: Icon,
  disabled,
  title,
  onClick,
}: {
  label: string;
  icon: typeof Phone;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? title : label}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[10px]",
        disabled
          ? "cursor-not-allowed border-zinc-800 text-zinc-600"
          : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
