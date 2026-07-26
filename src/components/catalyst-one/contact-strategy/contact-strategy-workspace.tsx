"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/design-system/page-header";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
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
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  CONTACT_STRATEGY_ACTIVITY_OPTIONS,
  CONTACT_STRATEGY_VISIBLE_DAYS,
  activityTypeLabel,
  listActiveContactStrategyActions,
  logContactStrategyAction,
  type ContactStrategyAction,
  type ContactStrategyActivityType,
} from "@/lib/contact-strategy";
import { getRicContactById } from "@/lib/contact-strategy/ric-mock-data";
import type { RicContact } from "@/lib/contact-strategy/ric-types";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";
import { RelationshipIntelligenceCanvas } from "./relationship-intelligence-canvas";
import { StrategicContactPool } from "./strategic-contact-pool";

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function ricCategoryToRole(category: RicContact["category"]): EcmContactRole {
  switch (category) {
    case "CA":
      return "chartered_accountant";
    case "Builder":
      return "builder";
    case "Bank":
    case "NBFC":
      return "lender_employee";
    case "Lawyer":
      return "partner";
    case "Relationship Manager":
      return "employee";
    case "Valuer":
      return "partner";
    case "Customer":
    default:
      return "customer";
  }
}

/** Build a display-only EcmContact from RIC mock for Contact Workspace open. */
function ricToEcmContact(contact: RicContact): EcmContact {
  const now = new Date().toISOString();
  return {
    id: contact.id,
    name: contact.name,
    mobilePrimary: "9000000000",
    personalEmail: undefined,
    officialEmail: undefined,
    city: "Pune",
    state: "Maharashtra",
    country: "IN",
    primaryRole: ricCategoryToRole(contact.category),
    additionalRoles: [],
    roles: [ricCategoryToRole(contact.category)],
    enabled: true,
    status: "active",
    platformAccess: "no_access",
    linkedUserId: null,
    contactScore: contact.relationshipScore,
    createdOn: now,
    createdBy: "ric-mock",
    modifiedOn: now,
    modifiedBy: "ric-mock",
    lastActiveOn: now,
    strategicContact: true,
    roleProfiles: {
      [ricCategoryToRole(contact.category)]: {
        firmName: contact.company,
        designation: contact.businessRole,
        institution: contact.company,
      },
    },
  };
}

/**
 * CO-SPRINT-092 + CO-FOUNDATION-010 — Contact Strategy Workspace.
 * Left: Strategic Contact Pool · Centre: Relationship Intelligence Canvas · Right: Active actions.
 */
export function ContactStrategyWorkspace() {
  const { user } = useAuthContext();
  const { registryVersion } = useEnterpriseRegistry({ hydrateOnMount: true });
  const [tick, setTick] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);
  const [activityType, setActivityType] = useState<ContactStrategyActivityType>("meeting");
  const [notes, setNotes] = useState("");
  const [centreContactId, setCentreContactId] = useState<string | null>(null);
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    const id = window.setInterval(() => refresh(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const activeActions = useMemo(() => {
    return listActiveContactStrategyActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, registryVersion]);

  const openLog = (contact: { id: string; name: string }) => {
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

  const openContactWorkspace = (contactId: string) => {
    const ric = getRicContactById(contactId);
    if (!ric) return;
    const fromRegistry = listOperationalEcmContacts().find(
      (c) => c.name.trim().toLowerCase() === ric.name.trim().toLowerCase(),
    );
    setWorkspaceContact(fromRegistry ?? ricToEcmContact(ric));
    setWorkspaceOpen(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <PageHeader
        title="Contact Strategy"
        description="Strategic relationship engagement — explore the Relationship Intelligence Canvas."
      />

      {/* LEFT 25% · CENTRE 50% · RIGHT 25% */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <StrategicContactPool
          selectedId={centreContactId}
          onSelect={(contact) => setCentreContactId(contact.id)}
        />

        <section className="flex min-h-[420px] flex-col rounded-xl border border-border/70 bg-card">
          <header className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Relationship Intelligence Canvas</h2>
            <p className="text-[11px] text-muted-foreground">
              First-level relationships only · click to recentre · double-click opens Contact Workspace.
            </p>
          </header>
          <div className="min-h-0 flex-1 p-3">
            <RelationshipIntelligenceCanvas
              centreContactId={centreContactId}
              onSelectContact={setCentreContactId}
              onOpenContactWorkspace={openContactWorkspace}
            />
          </div>
        </section>

        {/* RIGHT — existing Active Relationship Actions (intact) */}
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
            const ric = getRicContactById(contactId);
            if (ric) openLog({ id: ric.id, name: ric.name });
          }}
        >
          <header className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Active Relationship Actions</h2>
            <p className="text-[11px] text-muted-foreground">
              Visible for {CONTACT_STRATEGY_VISIBLE_DAYS} days · CHANAKYA guidance area.
            </p>
          </header>
          <div className="border-b border-border/40 bg-violet-500/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
              CHANAKYA
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Nurture strategic relationships deliberately. Log meaningful interactions to keep the
              cycle alive.
            </p>
          </div>
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
          <p className="text-xs text-muted-foreground">{pending?.name}</p>
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

      <ContactWorkspaceModal
        open={workspaceOpen}
        contact={workspaceContact}
        mode="edit"
        actorId={user?.id ?? "ui"}
        onOpenChange={(open) => {
          setWorkspaceOpen(open);
          if (!open) setWorkspaceContact(null);
        }}
        onSaved={() => {
          /* mock / display only */
        }}
      />
    </div>
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
