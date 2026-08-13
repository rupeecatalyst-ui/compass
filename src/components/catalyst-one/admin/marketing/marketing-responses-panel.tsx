"use client";

/**
 * CO-MARKETING-MKT-12 — Qualification queue, routing, and ENE handoff notification.
 * Unqualified responses cannot create Contacts or Opportunities.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_QUALIFICATION_BUSINESS_STATES,
  MARKETING_QUALIFICATION_STATE_LABELS,
  MARKETING_ROUTING_CRITERION_FIELDS,
  MARKETING_ROUTING_CRITERION_LABELS,
  MARKETING_ROUTING_MODES,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type {
  MarketingNotificationAttempt,
  MarketingNotificationPolicy,
  MarketingQualificationPublicDto,
  MarketingRoutingPolicy,
} from "@/types/enterprise-marketing-qualification";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingResponsesPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<MarketingQualificationPublicDto[]>([]);
  const [policies, setPolicies] = useState<MarketingRoutingPolicy[]>([]);
  const [notificationPolicies, setNotificationPolicies] = useState<MarketingNotificationPolicy[]>([]);
  const [attempts, setAttempts] = useState<MarketingNotificationAttempt[]>([]);
  const [routingPolicyId, setRoutingPolicyId] = useState("");
  const [notificationPolicyId, setNotificationPolicyId] = useState("");
  const [mode, setMode] = useState<MarketingRoutingMode>("SINGLE_USER");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [memberUserIds, setMemberUserIds] = useState("");
  const [ruleField, setRuleField] = useState<(typeof MARKETING_ROUTING_CRITERION_FIELDS)[number]>("product");
  const [ruleEquals, setRuleEquals] = useState("");
  const [ruleAssignee, setRuleAssignee] = useState("");
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [ingestCampaignId, setIngestCampaignId] = useState("");
  const [ingestFingerprint, setIngestFingerprint] = useState("");
  const [ingestName, setIngestName] = useState("Test Prospect");
  const [ingestEmail, setIngestEmail] = useState("marketing.test@example.com");

  const load = useCallback(async () => {
    const res = await authenticatedJsonFetch("/api/admin/marketing/qualifications");
    const body = (await res.json()) as ApiEnvelope<{
      qualifications: MarketingQualificationPublicDto[];
      routingPolicies: MarketingRoutingPolicy[];
      notificationPolicies: MarketingNotificationPolicy[];
      notificationAttempts: MarketingNotificationAttempt[];
    }>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load qualifications");
    }
    setRows(body.data.qualifications);
    setPolicies(body.data.routingPolicies);
    setNotificationPolicies(body.data.notificationPolicies ?? []);
    setAttempts(body.data.notificationAttempts ?? []);
    if (!routingPolicyId && body.data.routingPolicies[0]) {
      const p = body.data.routingPolicies[0];
      setRoutingPolicyId(p.id);
      setMode(p.mode);
      setAssigneeUserId(p.assigneeUserId ?? "");
      setTeamId(p.teamId ?? "");
    }
    if (!notificationPolicyId && body.data.notificationPolicies[0]) {
      const n = body.data.notificationPolicies[0];
      setNotificationPolicyId(n.id);
      setInApp(n.inApp);
      setEmail(n.email);
      setWhatsapp(n.whatsapp);
    }
  }, [routingPolicyId, notificationPolicyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Request failed");
      }
      await load();
      toast.success("Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const members = memberUserIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((userId) => ({
      userId,
      displayName: userId,
      teamId: teamId.trim() || null,
    }));

  const attemptsByQualification = (qualificationId: string) =>
    attempts.filter((a) => a.qualificationId === qualificationId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Responses & qualification</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          After a response is qualified, routing decides who owns it and which notification channels
          fire. In-app alerts use the Enterprise Notification Engine — not a second inbox.
        </p>
      </header>

      <MarketingModuleNav activeId="responses" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Controlled boundary
          </CardTitle>
          <CardDescription>
            Opens and clicks do not qualify. Mass conversion is blocked. Notification failure never
            rolls back a handed-off Opportunity.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingest test response (fixture)</CardTitle>
          <CardDescription>
            Create a qualification queue row for BAT without mirroring the Sheets audience. Mark
            QUALIFIED, then hand off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="ingest-campaign">Campaign id</Label>
            <Input
              id="ingest-campaign"
              className="w-56"
              value={ingestCampaignId}
              onChange={(e) => setIngestCampaignId(e.target.value)}
              placeholder="campaign id"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ingest-fp">Recipient fingerprint</Label>
            <Input
              id="ingest-fp"
              className="w-56"
              value={ingestFingerprint}
              onChange={(e) => setIngestFingerprint(e.target.value)}
              placeholder="email:demo@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ingest-name">Display name</Label>
            <Input
              id="ingest-name"
              className="w-44"
              value={ingestName}
              onChange={(e) => setIngestName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ingest-email">Match email</Label>
            <Input
              id="ingest-email"
              className="w-52"
              value={ingestEmail}
              onChange={(e) => setIngestEmail(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void post({
                action: "ingest",
                campaignId: ingestCampaignId.trim(),
                recipientFingerprint: ingestFingerprint.trim() || `email:${ingestEmail.trim()}`,
                displayName: ingestName.trim() || null,
                matchEmail: ingestEmail.trim() || null,
                product: "Home Loan",
                source: "marketing_test_mode",
                intent: "interested",
                operatorConfirmed: true,
                channel: "EMAIL",
              })
            }
          >
            Ingest fixture response
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ownership routing</CardTitle>
          <CardDescription>
            Specific user, team, round-robin, or a closed routing rule — employee IDs come from
            configuration, not code.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as MarketingRoutingMode)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETING_ROUTING_MODES.filter((m) => m !== "USER_POOL").map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "SINGLE_USER" ? (
            <div className="space-y-1">
              <Label htmlFor="assignee">Assignee user id</Label>
              <Input
                id="assignee"
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
                placeholder="configured user id"
                className="w-56"
              />
            </div>
          ) : null}
          {mode === "TEAM" || mode === "ROUND_ROBIN" || mode === "RULE_BASED" ? (
            <>
              {mode === "TEAM" ? (
                <div className="space-y-1">
                  <Label htmlFor="team">Team id</Label>
                  <Input
                    id="team"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    placeholder="team id"
                    className="w-40"
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="members">Member user ids</Label>
                <Input
                  id="members"
                  value={memberUserIds}
                  onChange={(e) => setMemberUserIds(e.target.value)}
                  placeholder="user-a, user-b"
                  className="w-64"
                />
              </div>
            </>
          ) : null}
          {mode === "RULE_BASED" ? (
            <>
              <div className="space-y-1">
                <Label>Criterion</Label>
                <Select
                  value={ruleField}
                  onValueChange={(v) =>
                    setRuleField(v as (typeof MARKETING_ROUTING_CRITERION_FIELDS)[number])
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_ROUTING_CRITERION_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {MARKETING_ROUTING_CRITERION_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-eq">Equals</Label>
                <Input
                  id="rule-eq"
                  value={ruleEquals}
                  onChange={(e) => setRuleEquals(e.target.value)}
                  placeholder="Home Loan"
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-user">Then assign</Label>
                <Input
                  id="rule-user"
                  value={ruleAssignee}
                  onChange={(e) => setRuleAssignee(e.target.value)}
                  placeholder="user id"
                  className="w-40"
                />
              </div>
            </>
          ) : null}
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              post({
                action: "upsert_routing_policy",
                id: routingPolicyId || undefined,
                name: "Campaign ownership",
                mode,
                assigneeUserId: assigneeUserId.trim() || null,
                teamId: teamId.trim() || null,
                members,
                rules:
                  mode === "RULE_BASED" && ruleEquals.trim() && ruleAssignee.trim()
                    ? [
                        {
                          id: "rule-1",
                          field: ruleField,
                          equals: ruleEquals.trim(),
                          assigneeUserId: ruleAssignee.trim(),
                        },
                      ]
                    : [],
              })
            }
          >
            Save routing policy
          </Button>
          {policies[0] ? (
            <p className="text-xs text-muted-foreground">
              Active: {policies[0].mode}
              {policies[0].assigneeUserId ? ` → ${policies[0].assigneeUserId}` : ""}
              {policies[0].teamId ? ` · team ${policies[0].teamId}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Internal notification channels</CardTitle>
          <CardDescription>
            Catalyst One in-app is delivered by ENE. Email and WhatsApp stay dry-run until live
            employee send is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
            Catalyst One notification
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={whatsapp}
              onChange={(e) => setWhatsapp(e.target.checked)}
            />
            WhatsApp
          </label>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              post({
                action: "upsert_notification_policy",
                id: notificationPolicyId || undefined,
                name: "Handoff notification",
                inApp,
                email,
                whatsapp,
              })
            }
          >
            Save notification policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qualification queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No qualification records. Engagement alone does not create a response.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Campaign</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3">Intent</th>
                    <th className="py-2 pr-3">Identity</th>
                    <th className="py-2 pr-3">Assignee</th>
                    <th className="py-2 pr-3">Contact / Opportunity</th>
                    <th className="py-2 pr-3">Notify</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{row.campaignName ?? row.campaignId}</td>
                      <td className="py-2 pr-3">
                        {MARKETING_QUALIFICATION_STATE_LABELS[row.businessState]}
                      </td>
                      <td className="py-2 pr-3">{row.intent}</td>
                      <td className="py-2 pr-3 text-xs">
                        {row.matchEmailPreview ?? "—"}
                        <br />
                        {row.matchPhonePreview ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs">{row.assigneeUserId ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">
                        {row.contactId ?? "—"}
                        <br />
                        {row.opportunityId ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {row.notificationStatus ?? "—"}
                        <br />
                        {attemptsByQualification(row.id)
                          .map((a) => `${a.channel}:${a.status}`)
                          .join(" · ") || "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.businessState !== "HANDED_OFF" &&
                          row.businessState !== "QUALIFIED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                post({
                                  action: "set_state",
                                  qualificationId: row.id,
                                  businessState: "QUALIFIED",
                                })
                              }
                            >
                              Qualify
                            </Button>
                          ) : null}
                          {row.businessState === "QUALIFIED" ? (
                            <Button
                              size="sm"
                              disabled={busy || !(routingPolicyId || policies[0]?.id)}
                              onClick={() =>
                                post({
                                  action: "handoff",
                                  qualificationId: row.id,
                                  routingPolicyId: routingPolicyId || policies[0]?.id,
                                  notificationPolicyId: notificationPolicyId || undefined,
                                })
                              }
                            >
                              Handoff
                            </Button>
                          ) : null}
                          {row.businessState === "HANDED_OFF" &&
                          row.notificationStatus === "FAILED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                post({
                                  action: "retry_notification",
                                  qualificationId: row.id,
                                  notificationPolicyId: notificationPolicyId || undefined,
                                })
                              }
                            >
                              Retry notify
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="sr-only">{MARKETING_QUALIFICATION_BUSINESS_STATES.join(" ")}</p>
    </div>
  );
}
