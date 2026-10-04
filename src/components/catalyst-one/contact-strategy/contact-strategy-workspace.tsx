"use client";

/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Operational relationship-management workspace over canonical registries.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { WhatsAppContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { QuickTaskCreateModal } from "@/components/catalyst-one/tasks/quick-task-create-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/components/providers/auth-provider";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import {
  fetchContactStrategySnapshot,
  saveContactStrategyPlan,
} from "@/lib/contact-strategy/client";
import {
  CONTACT_STRATEGY_ACTIVITY_BANDS,
  CONTACT_STRATEGY_CADENCES,
  CONTACT_STRATEGY_CHANNELS,
  CONTACT_STRATEGY_KPI_CARDS,
  CONTACT_STRATEGY_SUBTITLE,
  CONTACT_STRATEGY_TITLE,
  contactStrategyBandLabel,
  contactStrategyChannelLabel,
} from "@/constants/contact-strategy";
import type {
  ContactStrategyActivityBand,
  ContactStrategyCadence,
  ContactStrategyFilters,
  ContactStrategyKpiId,
  ContactStrategyPreferredChannel,
  ContactStrategyRow,
  ContactStrategySnapshot,
} from "@/types/contact-strategy";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";

function inr(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function daysLabel(days: number | null): string {
  if (days == null) return "No meaningful interaction";
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ContactStrategyWorkspace() {
  const { user } = useAuthContext();
  const [snapshot, setSnapshot] = useState<ContactStrategySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactStrategyFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [centreOpen, setCentreOpen] = useState(true);
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchContactStrategySnapshot(filters);
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Contact Strategy.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => snapshot?.rows.find((row) => row.contactId === selectedId) ?? null,
    [snapshot, selectedId],
  );

  const roles = useMemo(() => {
    const set = new Set((snapshot?.rows ?? []).map((row) => row.contactRole).filter(Boolean));
    return [...set].sort();
  }, [snapshot]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of snapshot?.rows ?? []) {
      if (row.assignedEmployeeId && row.assignedEmployeeName) {
        map.set(row.assignedEmployeeId, row.assignedEmployeeName);
      }
    }
    return [...map.entries()];
  }, [snapshot]);

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of snapshot?.rows ?? []) {
      if (row.companyId && row.companyName) map.set(row.companyId, row.companyName);
    }
    return [...map.entries()];
  }, [snapshot]);

  const openContact360 = (contactId: string) => {
    const fromRegistry = findOperationalEcmContactById(contactId);
    if (!fromRegistry) {
      toast.error("Contact not found in the Enterprise Contact Registry.");
      return;
    }
    setWorkspaceContact(fromRegistry);
    setWorkspaceOpen(true);
  };

  const openComposer = (kind: "call" | "email" | "whatsapp" | "activity" | "task", row: ContactStrategyRow) => {
    setSelectedId(row.contactId);
    setCentreOpen(true);
    setEmailOpen(kind === "email");
    setWhatsappOpen(kind === "whatsapp");
    setActivityOpen(kind === "call" || kind === "activity");
    setTaskOpen(kind === "task");
  };

  const participants = selected
    ? [{ id: selected.contactId, name: selected.contactName, recipientType: "customer" as const }]
    : [];

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-4">
      <PageHeader
        title={CONTACT_STRATEGY_TITLE}
        description={CONTACT_STRATEGY_SUBTITLE}
        className="shrink-0 !mb-0"
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {CONTACT_STRATEGY_KPI_CARDS.map((card) => {
          const active = filters.kpi === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  kpi: prev.kpi === card.id ? null : (card.id as ContactStrategyKpiId),
                }))
              }
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                active
                  ? "border-teal-500/50 bg-teal-500/10"
                  : "border-border/70 bg-card hover:bg-muted/40",
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {snapshot?.kpis[card.id] ?? (loading ? "—" : 0)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-card p-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.q ?? ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Search contact, company, Opportunity or Deal"
            className="h-9 pl-8 text-sm"
            aria-label="Search Contact Strategy"
          />
        </div>
        <FilterSelect
          label="Relationship state"
          value={filters.activityBand ?? "all"}
          onChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              activityBand: v as ContactStrategyActivityBand | "all",
              relationshipState: v as ContactStrategyActivityBand | "all",
            }))
          }
          options={[
            { id: "all", label: "All states" },
            ...CONTACT_STRATEGY_ACTIVITY_BANDS.map((b) => ({ id: b.id, label: b.label })),
          ]}
        />
        <FilterSelect
          label="Contact role"
          value={filters.contactRole ?? "all"}
          onChange={(v) => setFilters((prev) => ({ ...prev, contactRole: v }))}
          options={[{ id: "all", label: "All roles" }, ...roles.map((r) => ({ id: r, label: r }))]}
        />
        <FilterSelect
          label="Assigned employee"
          value={filters.assignedEmployeeId ?? "all"}
          onChange={(v) => setFilters((prev) => ({ ...prev, assignedEmployeeId: v }))}
          options={[
            { id: "all", label: "All employees" },
            ...owners.map(([id, name]) => ({ id, label: name })),
          ]}
        />
        <FilterSelect
          label="Company"
          value={filters.companyId ?? "all"}
          onChange={(v) => setFilters((prev) => ({ ...prev, companyId: v }))}
          options={[
            { id: "all", label: "All companies" },
            ...companies.map(([id, name]) => ({ id, label: name })),
          ]}
        />
        <FilterSelect
          label="Linked transaction"
          value={filters.linkedTransaction ?? "all"}
          onChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              linkedTransaction: v as ContactStrategyFilters["linkedTransaction"],
            }))
          }
          options={[
            { id: "all", label: "Any" },
            { id: "opportunity", label: "Opportunity" },
            { id: "deal", label: "Deal" },
            { id: "none", label: "None" },
          ]}
        />
        <FilterSelect
          label="Next action due"
          value={filters.nextActionDue ?? "all"}
          onChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              nextActionDue: v as ContactStrategyFilters["nextActionDue"],
            }))
          }
          options={[
            { id: "all", label: "Any date" },
            { id: "overdue", label: "Overdue" },
            { id: "today", label: "Today" },
            { id: "upcoming", label: "Upcoming" },
          ]}
        />
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          centreOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]" : "grid-cols-1",
        )}
      >
        <section className="min-h-0 overflow-hidden rounded-xl border border-border/70 bg-card">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading authorised relationship records…</p>
          ) : error ? (
            <div className="space-y-2 p-6">
              <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : !snapshot?.rows.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              No authorised contacts match this view. Adjust filters or open Contacts to add a
              strategic relationship.
            </p>
          ) : (
            <ul className="max-h-[calc(100vh-22rem)] space-y-2 overflow-y-auto p-3">
              {snapshot.rows.map((row) => (
                <li key={row.contactId}>
                  <article
                    className={cn(
                      "rounded-xl border p-3",
                      selectedId === row.contactId
                        ? "border-teal-500/50 bg-teal-500/8"
                        : "border-border/70 bg-background/80",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => {
                          setSelectedId(row.contactId);
                          setCentreOpen(true);
                        }}
                      >
                        <p className="font-semibold leading-snug">{row.contactName}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {row.companyName || "No company"} · {row.contactRole}
                        </p>
                      </button>
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                        {contactStrategyBandLabel(row.relationshipState)} · {row.relationshipScore}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-1 text-[12px] text-muted-foreground sm:grid-cols-2">
                      <div>
                        Last meaningful: {row.lastMeaningfulLabel || "—"} · {daysLabel(row.daysSinceMeaningful)}
                      </div>
                      <div>Assigned: {row.assignedEmployeeName || "Unassigned"}</div>
                      <div>
                        {row.opportunityRef || "No Opportunity"}
                        {row.dealRef ? ` · ${row.dealRef}` : ""}
                      </div>
                      <div>Value: {inr(row.businessValue)}</div>
                      <div>Next: {row.nextAction || "Set a next action"}</div>
                      <div>
                        Due:{" "}
                        {row.nextActionDueOn
                          ? new Date(row.nextActionDueOn).toLocaleDateString("en-IN")
                          : "—"}
                      </div>
                      <div>Cadence: {row.cadence || "Not set"}</div>
                      <div>Channel: {contactStrategyChannelLabel(row.preferredChannel)}</div>
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={() => openContact360(row.contactId)}>
                        Open Contact 360
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openComposer("call", row)}>
                        <Phone className="mr-1 h-3.5 w-3.5" /> Call
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openComposer("email", row)}>
                        <Mail className="mr-1 h-3.5 w-3.5" /> Email
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openComposer("whatsapp", row)}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openComposer("activity", row)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add Activity
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openComposer("task", row)}>
                        Create Task
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {centreOpen ? (
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
            <header className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Action Centre
                </p>
                <h2 className="text-sm font-semibold">{selected?.contactName || "Select a contact"}</h2>
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCentreOpen(false)}>
                Hide
              </Button>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Today’s Priorities
                </h3>
                <ul className="mt-1 space-y-1 text-[12px] text-muted-foreground">
                  {(snapshot?.rows ?? [])
                    .filter(
                      (row) =>
                        row.relationshipState === "needs_attention" ||
                        row.relationshipState === "dormant" ||
                        Boolean(row.upcomingMeetingAt),
                    )
                    .slice(0, 6)
                    .map((row) => (
                      <li key={`pri-${row.contactId}`}>
                        <button type="button" className="text-left hover:text-foreground" onClick={() => setSelectedId(row.contactId)}>
                          {row.contactName} · {contactStrategyBandLabel(row.relationshipState)}
                        </button>
                      </li>
                    ))}
                  {!snapshot?.rows.some(
                    (row) =>
                      row.relationshipState === "needs_attention" ||
                      row.relationshipState === "dormant" ||
                      Boolean(row.upcomingMeetingAt),
                  ) ? (
                    <li>No priority items in the current authorised view.</li>
                  ) : null}
                </ul>
              </section>

              {selected ? (
                <>
                  <section className="space-y-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Relationship Plan
                    </h3>
                    <p>Objective: {selected.relationshipObjective || "Not set"}</p>
                    <p>Cadence: {selected.cadence || "Not set"}</p>
                    <p>Preferred channel: {contactStrategyChannelLabel(selected.preferredChannel)}</p>
                    <p>
                      Next review:{" "}
                      {selected.nextReviewAt
                        ? new Date(selected.nextReviewAt).toLocaleDateString("en-IN")
                        : "Not set"}
                    </p>
                    <p>Assigned owner: {selected.assignedEmployeeName || "Unassigned"}</p>
                  </section>
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent meaningful activities
                    </h3>
                    <ul className="mt-1 space-y-1 text-[12px] text-muted-foreground">
                      {selected.recentMeaningful.length ? (
                        selected.recentMeaningful.map((item) => (
                          <li key={`${item.at}-${item.label}`}>
                            {item.label} · {item.channel} ·{" "}
                            {new Date(item.at).toLocaleDateString("en-IN")}
                          </li>
                        ))
                      ) : (
                        <li>No meaningful interaction recorded yet.</li>
                      )}
                    </ul>
                  </section>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setPlanOpen(true)}>
                      Edit Strategy
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTaskOpen(true)}>
                      Create Task
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setActivityOpen(true)}>
                      Add Activity
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a contact to review the relationship plan and recent meaningful activity.
                </p>
              )}
            </div>
          </aside>
        ) : (
          <div className="lg:hidden" />
        )}
      </div>

      {!centreOpen ? (
        <Button type="button" variant="outline" className="self-end" onClick={() => setCentreOpen(true)}>
          Open Action Centre
        </Button>
      ) : null}

      {selected ? (
        <>
          <EmailContextWorkspace
            open={emailOpen}
            onOpenChange={setEmailOpen}
            opportunityId={selected.opportunityId || selected.contactId}
            dealId={selected.dealId}
            entityId={selected.contactId}
            entityLabel={selected.contactName}
            customerName={selected.contactName}
            opportunityNumber={selected.opportunityRef || undefined}
            dealNumber={selected.dealRef || undefined}
            participants={participants}
          />
          <WhatsAppContextWorkspace
            open={whatsappOpen}
            onOpenChange={setWhatsappOpen}
            entityId={selected.contactId}
            entityLabel={selected.contactName}
            customerName={selected.contactName}
            participants={participants}
          />
          <EnterpriseActivityComposer
            presentation="sheet"
            open={activityOpen}
            onOpenChange={setActivityOpen}
            heading="Add activity"
            composer={{
              contextType: "contact",
              contextId: selected.contactId,
              entityLabel: selected.contactName,
              contactId: selected.contactId,
              customerName: selected.contactName,
            }}
            actorUserId={user?.id ?? "session-user"}
            actorLabel={
              [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "RM"
            }
            onSaved={() => void load()}
          />
          <QuickTaskCreateModal
            open={taskOpen}
            onOpenChange={setTaskOpen}
            context={{
              contactId: selected.contactId,
              opportunityId: selected.opportunityId,
              dealId: selected.dealId,
              borrowerName: selected.contactName,
            }}
          />
          <EditPlanDialog
            open={planOpen}
            row={selected}
            onOpenChange={setPlanOpen}
            onSaved={() => void load()}
          />
        </>
      ) : null}

      <ContactWorkspaceModal
        open={workspaceOpen}
        contact={workspaceContact}
        mode="edit"
        actorId={user?.id ?? "ui"}
        onOpenChange={(open) => {
          setWorkspaceOpen(open);
          if (!open) setWorkspaceContact(null);
        }}
        onSaved={() => void load()}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="w-[10.5rem] space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EditPlanDialog({
  open,
  row,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  row: ContactStrategyRow;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [objective, setObjective] = useState(row.relationshipObjective ?? "");
  const [cadence, setCadence] = useState(row.cadence ?? "monthly");
  const [channel, setChannel] = useState<ContactStrategyPreferredChannel>(
    row.preferredChannel ?? "call",
  );
  const [review, setReview] = useState(row.nextReviewAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setObjective(row.relationshipObjective ?? "");
    setCadence(row.cadence ?? "monthly");
    setChannel(row.preferredChannel ?? "call");
    setReview(row.nextReviewAt?.slice(0, 10) ?? "");
  }, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" allowOutsideClose>
        <DialogHeader>
          <DialogTitle className="text-sm">Edit Strategy · {row.contactName}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            void saveContactStrategyPlan(row.contactId, {
              contactId: row.contactId,
              objective,
              cadence: cadence as ContactStrategyRow["cadence"],
              preferredChannel: channel,
              nextReviewAt: review ? new Date(review).toISOString() : null,
              assignedOwnerUserId: row.assignedEmployeeId,
              assignedOwnerName: row.assignedEmployeeName,
            })
              .then(() => {
                toast.success("Relationship plan saved.");
                onOpenChange(false);
                onSaved();
              })
              .catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : "Unable to save plan.");
              })
              .finally(() => setSaving(false));
          }}
        >
          <div className="space-y-1">
            <Label>Relationship objective</Label>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} />
          </div>
          <FilterSelect
            label="Planned cadence"
            value={cadence || "monthly"}
            onChange={(v) => setCadence(v as ContactStrategyCadence)}
            options={CONTACT_STRATEGY_CADENCES.map((item) => ({ id: item.id, label: item.label }))}
          />
          <FilterSelect
            label="Preferred channel"
            value={channel}
            onChange={(v) => setChannel(v as ContactStrategyPreferredChannel)}
            options={CONTACT_STRATEGY_CHANNELS.map((item) => ({ id: item.id, label: item.label }))}
          />
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Calendar className="h-3 w-3" /> Next review date
            </Label>
            <Input type="date" value={review} onChange={(e) => setReview(e.target.value)} className="h-9" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              Save plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
