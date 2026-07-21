"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/design-system/page-header";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { listOperationalEcmContacts } from "@/lib/enterprise-registry";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import {
  CONTACT_STRATEGY_ACTIVITY_OPTIONS,
  CONTACT_STRATEGY_VISIBLE_DAYS,
  activityTypeLabel,
  listActiveContactStrategyActions,
  listContactIdsWithActiveActions,
  logContactStrategyAction,
  type ContactStrategyAction,
  type ContactStrategyActivityType,
} from "@/lib/contact-strategy";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

/**
 * CO-SPRINT-092 — Contact Strategy Workspace.
 * Left: available strategic contacts · Right: active relationship actions (30 days).
 */
export function ContactStrategyWorkspace() {
  const { registryVersion } = useEnterpriseRegistry({ hydrateOnMount: true });
  const [tick, setTick] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<EcmContact | null>(null);
  const [activityType, setActivityType] = useState<ContactStrategyActivityType>("meeting");
  const [notes, setNotes] = useState("");

  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    const id = window.setInterval(() => refresh(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const strategicAvailable = useMemo(() => {
    const busy = listContactIdsWithActiveActions();
    return listOperationalEcmContacts().filter(
      (c) => c.strategicContact && c.enabled && c.status !== "archived" && !busy.has(c.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryVersion, tick]);

  const activeActions = useMemo(() => {
    return listActiveContactStrategyActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, registryVersion]);

  const openLog = (contact: EcmContact) => {
    setPending(contact);
    setActivityType("meeting");
    setNotes("");
  };

  const saveLog = () => {
    if (!pending) return;
    logContactStrategyAction({
      contactId: pending.id,
      contactName: pending.name,
      activityType,
      notes,
      loggedBy: "RM",
    });
    toast.success(`${pending.name} · ${activityTypeLabel(activityType)} logged.`);
    setPending(null);
    refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <PageHeader
        title="Contact Strategy"
        description="Strategic relationship engagement — available contacts on the left, active cycles on the right."
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {/* LEFT — available strategic contacts */}
        <section className="flex min-h-[420px] flex-col rounded-xl border border-border/70 bg-card">
          <header className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Strategic Contacts</h2>
            <p className="text-[11px] text-muted-foreground">
              Drag a card to the right panel to log a relationship action.
            </p>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {strategicAvailable.map((contact) => (
              <StrategicContactCard
                key={contact.id}
                contact={contact}
                onDragStart={() => undefined}
                onOpen={() => openLog(contact)}
              />
            ))}
            {strategicAvailable.length === 0 && (
              <p className="px-2 py-10 text-center text-xs text-muted-foreground">
                No open strategic contacts. Mark contacts as Strategic in the Contact Registry.
              </p>
            )}
          </div>
        </section>

        {/* RIGHT — active relationship actions */}
        <section
          className={cn(
            "flex min-h-[420px] flex-col rounded-xl border border-border/70 bg-card transition-colors",
            dragOver && "border-primary/50 bg-primary/5",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const contactId = e.dataTransfer.getData("text/plain");
            const contact = strategicAvailable.find((c) => c.id === contactId);
            if (contact) openLog(contact);
          }}
        >
          <header className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Active Relationship Actions</h2>
            <p className="text-[11px] text-muted-foreground">
              Visible for {CONTACT_STRATEGY_VISIBLE_DAYS} days, then the contact returns to the left.
            </p>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {activeActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
            {activeActions.length === 0 && (
              <p className="px-2 py-10 text-center text-xs text-muted-foreground">
                {dragOver ? "Drop here to log an interaction" : "No active relationship cycles."}
              </p>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">Log relationship interaction</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {pending?.name}
            {pending?.roles?.length ? ` · ${pending.roles.join(", ")}` : ""}
          </p>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Activity</Label>
              <Select
                value={activityType}
                onValueChange={(v) => setActivityType(v as ContactStrategyActivityType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_STRATEGY_ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[72px] text-xs"
                placeholder="Brief note about this interaction…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={saveLog}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StrategicContactCard({
  contact,
  onOpen,
}: {
  contact: EcmContact;
  onDragStart?: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", contact.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDoubleClick={onOpen}
      className="cursor-grab rounded-lg border border-border/70 bg-background/80 p-3 active:cursor-grabbing"
    >
      <p className="text-sm font-semibold leading-snug">{contact.name}</p>
      <div className="mt-1.5">
        <ContactRoleChips roles={contact.roles} className="max-w-full" />
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Open Relationship
      </p>
    </article>
  );
}

function ActionCard({ action }: { action: ContactStrategyAction }) {
  const remaining = daysRemaining(action.expiresAt);
  return (
    <article className="rounded-lg border border-border/70 bg-background/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{action.contactName}</p>
        <span className="shrink-0 rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {activityTypeLabel(action.activityType)}
        </span>
      </div>
      {action.notes ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{action.notes}</p>
      ) : null}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Logged{" "}
        {new Date(action.loggedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })}
        {" · "}
        {remaining === 0 ? "Expires today" : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}
      </p>
    </article>
  );
}
