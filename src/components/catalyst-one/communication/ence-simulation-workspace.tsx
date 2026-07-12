"use client";

import { useEffect, useState } from "react";
import {
  ENCE_CHANNELS,
  ENCE_EXTERNAL_DELIVERY_ENABLED,
} from "@/constants/enterprise-notification-communication-engine";
import {
  getEnceRegistrySnapshot,
  listEnceSimulations,
  registerEncePolicy,
  registerEnceTemplate,
  simulateEnceCommunication,
} from "@/lib/enterprise-notification-communication-engine";
import type { EnceChannel, EnceSimulationRecord } from "@/types/enterprise-notification-communication-engine";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ensureEnceSeed(): { policyId: string; templateId: string } {
  const snap = getEnceRegistrySnapshot();
  let policy = snap.policies.find((p) => p.policyCode === "ENCE-SIM-001");
  let template = snap.templates.find((t) => t.templateCode === "ENCE-TPL-FOLLOWUP");

  if (!policy) {
    policy = registerEncePolicy({
      policyCode: "ENCE-SIM-001",
      policyName: "SPR-001 simulation policy",
      channels: [ENCE_CHANNELS.EMAIL, ENCE_CHANNELS.WHATSAPP, ENCE_CHANNELS.IN_APP],
      dialogueIntegrationRef: "edc:opp-demo-001",
      enabled: true,
      createdBy: "system",
    });
  }

  if (!template) {
    template = registerEnceTemplate({
      templateCode: "ENCE-TPL-FOLLOWUP",
      templateName: "Document follow-up",
      channel: ENCE_CHANNELS.EMAIL,
      subject: "Documents pending",
      body: "Please upload remaining KYC documents.",
      policyRef: policy.id,
      dialogueIntegrationRef: "edc:opp-demo-001",
      enabled: true,
      createdBy: "system",
    });
  }

  return { policyId: policy.id, templateId: template.id };
}

export function EnceSimulationWorkspace() {
  const [simulations, setSimulations] = useState<EnceSimulationRecord[]>([]);
  const [channel, setChannel] = useState<EnceChannel>(ENCE_CHANNELS.EMAIL);
  const [recipientRef, setRecipientRef] = useState("contact:demo-001");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => setSimulations(listEnceSimulations());

  useEffect(() => {
    ensureEnceSeed();
    refresh();
  }, []);

  const onSimulate = () => {
    setError(null);
    try {
      const seed = ensureEnceSeed();
      simulateEnceCommunication({
        policyRef: seed.policyId,
        templateRef: seed.templateId,
        channel,
        recipientRef,
        contextRef: "opp-demo-001",
        payload: { note: "UI simulation" },
        simulatedBy: "ui",
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENCE · Communication Simulation"
        description="Policies and templates for notification simulation. External channels are never delivered in SPR-001."
      />
      <div className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
        External delivery disabled
        {!ENCE_EXTERNAL_DELIVERY_ENABLED && " · flag=false"}
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as EnceChannel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ENCE_CHANNELS).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Recipient ref</Label>
          <Input value={recipientRef} onChange={(e) => setRecipientRef(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={onSimulate}>Simulate communication</Button>
        </div>
        {error && <p className="text-sm text-destructive md:col-span-full">{error}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {simulations.map((s) => (
          <EnterpriseEngagementCard
            key={s.id}
            title={`${s.channel} → ${s.recipientRef}`}
            description={s.warning ?? "Simulation recorded — not delivered externally."}
            tone="rose"
            badge={s.status}
            meta={`${new Date(s.simulatedOn).toLocaleString()} · ${s.simulatedBy}`}
          />
        ))}
        {simulations.length === 0 && (
          <p className="text-sm text-muted-foreground">No simulations yet.</p>
        )}
      </div>
    </div>
  );
}
