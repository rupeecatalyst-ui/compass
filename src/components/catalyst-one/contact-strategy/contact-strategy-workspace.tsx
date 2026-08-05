"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/design-system/page-header";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { Button } from "@/components/ui/button";
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
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  CONTACT_STRATEGY_ACTIVITY_OPTIONS,
  activityTypeLabel,
  listActiveContactStrategyActions,
  logContactStrategyAction,
  type ContactStrategyAction,
  type ContactStrategyActivityType,
} from "@/lib/contact-strategy";
import { listConversationActivitiesByContext as listEcieActivities } from "@/lib/enterprise-conversation-intelligence";
import {
  getNetworkContactById,
  listNetworkFirstLevel,
} from "@/lib/contact-strategy/live-registry";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";
import { RelationshipIntelligenceCanvas } from "./relationship-intelligence-canvas";
import { StrategicContactPool } from "./strategic-contact-pool";

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

/**
 * CO-UX-013 / CO-UX-014 — Contact Strategy / Network Workspace.
 * Left: live Contact Registry · Centre: graph · Right: inspector + inline Activity Composer.
 */
export function ContactStrategyWorkspace() {
  const { user } = useAuthContext();
  const { registryVersion } = useEnterpriseRegistry({ hydrateOnMount: true });
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);
  const [activityType, setActivityType] = useState<ContactStrategyActivityType>("meeting");
  /** Last chosen cycle type for optional relationship-cycle stamp after ECIE save. */
  const [cycleActivityType, setCycleActivityType] =
    useState<ContactStrategyActivityType>("meeting");
  const [centreContactId, setCentreContactId] = useState<string | null>(null);
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const composerAnchorRef = useRef<HTMLDivElement | null>(null);

  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    const id = window.setInterval(() => refresh(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const activeActions = useMemo(() => {
    return listActiveContactStrategyActions().filter((action) =>
      centreContactId ? action.contactId === centreContactId : false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, registryVersion, centreContactId]);

  const recentActivities = useMemo(() => {
    if (!centreContactId) return [];
    return listEcieActivities("contact", centreContactId).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, centreContactId]);

  const selected = useMemo(() => {
    if (!centreContactId) return null;
    return getNetworkContactById(centreContactId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreContactId, registryVersion]);

  const neighbourCount = useMemo(() => {
    if (!centreContactId) return 0;
    return listNetworkFirstLevel(centreContactId).neighbours.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreContactId, registryVersion]);

  const focusComposer = (contact: { id: string; name: string }) => {
    setCentreContactId(contact.id);
    setCycleActivityType(activityType);
    window.requestAnimationFrame(() => {
      composerAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openLog = (contact: { id: string; name: string }) => {
    setPending(contact);
    setActivityType("meeting");
  };

  const confirmCycleType = () => {
    if (!pending) return;
    setCycleActivityType(activityType);
    setCentreContactId(pending.id);
    setPending(null);
    toast.message("Use Meeting Notes & Conversations below to capture the discussion.");
    window.requestAnimationFrame(() => {
      composerAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openContactWorkspace = (contactId: string) => {
    const fromRegistry = findOperationalEcmContactById(contactId);
    if (!fromRegistry) {
      toast.error("Contact not found in the Enterprise Contact Registry.");
      return;
    }
    setWorkspaceContact(fromRegistry);
    setWorkspaceOpen(true);
  };

  const onActivitySaved = () => {
    if (!centreContactId || !selected) {
      refresh();
      return;
    }
    // Optional relationship-cycle stamp only — notes/transcript SSOT remains ECIE.
    const latest = listEcieActivities("contact", centreContactId)[0];
    logContactStrategyAction({
      contactId: centreContactId,
      contactName: selected.name,
      activityType: cycleActivityType,
      notes: latest?.transcriptText?.slice(0, 240) || latest?.bodyText?.slice(0, 240),
      loggedBy:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.email ||
        "RM",
    });
    refresh();
  };

  const inspectorOpen = Boolean(centreContactId && selected);

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[28rem] flex-col gap-2">
      <PageHeader
        title="Contact Strategy"
        description="Live Enterprise relationship network — Contact Registry + ECM relationships only."
        className="shrink-0 !mb-0"
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          inspectorOpen
            ? "lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(18rem,24rem)]"
            : "lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]",
        )}
      >
        <StrategicContactPool
          selectedId={centreContactId}
          onSelect={(contact) => setCentreContactId(contact.id)}
          registryVersion={registryVersion}
        />

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Network Graph</h2>
              <p className="truncate text-[11px] text-muted-foreground">
                First-level live relationships · click to recentre · double-click opens Contact
                Workspace
              </p>
            </div>
            {selected ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 text-xs"
                onClick={() => focusComposer({ id: selected.id, name: selected.name })}
              >
                Meeting notes
              </Button>
            ) : null}
          </header>
          <div className="min-h-0 flex-1 p-2">
            <RelationshipIntelligenceCanvas
              centreContactId={centreContactId}
              onSelectContact={setCentreContactId}
              onOpenContactWorkspace={openContactWorkspace}
              registryVersion={registryVersion}
            />
          </div>
        </section>

        {inspectorOpen && selected ? (
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
            <header className="shrink-0 border-b border-border/60 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Selected entity
              </p>
              <h2 className="mt-0.5 text-sm font-semibold leading-snug">{selected.name}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {selected.category} · {selected.businessRole}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{selected.company}</p>
            </header>
            <div className="space-y-2 border-b border-border/50 px-3 py-2.5 text-[11px] text-muted-foreground">
              <p>
                Linked relationships ·{" "}
                <span className="font-semibold text-foreground">{neighbourCount}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => openContactWorkspace(selected.id)}
                >
                  Open Contact
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => openLog({ id: selected.id, name: selected.name })}
                >
                  Log cycle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setCentreContactId(null)}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
              <div ref={composerAnchorRef}>
                <EnterpriseActivityComposer
                  presentation="inline"
                  heading="Meeting Notes & Conversations"
                  composer={{
                    contextType: "contact",
                    contextId: selected.id,
                    entityLabel: selected.name,
                    contactId: selected.id,
                    customerName: selected.name,
                  }}
                  actorUserId={user?.id ?? "session-user"}
                  actorLabel={
                    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
                    user?.email ||
                    "RM"
                  }
                  onSaved={onActivitySaved}
                />
              </div>

              {recentActivities.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent conversation activities
                  </p>
                  {recentActivities.map((activity) => (
                    <article
                      key={activity.id}
                      className="rounded-lg border border-border/60 bg-background/70 p-2"
                    >
                      <p className="text-[11px] font-medium leading-snug">{activity.title}</p>
                      <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                        {(activity.transcriptText || activity.bodyText || "").trim() || "—"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}

              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Active cycles for this contact
              </p>
              {activeActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
              {activeActions.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No active relationship cycles for this contact.
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">Log relationship cycle</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {pending?.name} — choose cycle type, then capture notes with the Activity Composer.
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
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirmCycleType}>
              Continue to notes
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
          refresh();
        }}
      />
    </div>
  );
}

function ActionCard({ action }: { action: ContactStrategyAction }) {
  const remaining = daysRemaining(action.expiresAt);
  return (
    <article className="rounded-lg border border-border/70 bg-background/80 p-2.5">
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
        {remaining === 0
          ? "Expires today"
          : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}
      </p>
    </article>
  );
}
