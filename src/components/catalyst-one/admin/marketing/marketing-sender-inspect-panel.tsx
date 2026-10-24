"use client";

/**
 * Read-only sender inspect. Calls GET ?fromAddress= only.
 * Must never list, snapshot, seed, or write sender identities.
 */

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  MARKETING_PERMISSIONS,
  MARKETING_SENDER_INSPECT_FROM_ADDRESS,
  marketingSenderInspectPath,
} from "@/constants/enterprise-marketing-engine";
import { hasMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { MarketingModuleNav } from "./marketing-module-nav";

type PublicSenderIdentity = {
  id?: string;
  organizationId?: string;
  displayName?: string;
  fromAddress?: string;
  replyTo?: string | null;
  channel?: string;
  active?: boolean;
  isDefault?: boolean;
  simulated?: boolean;
  approvalStatus?: string;
  verificationStatus?: string;
  permittedCampaignCategories?: string[];
  providerMapping?: {
    providerType?: string;
    providerProfileId?: string | null;
    credentialConfigured?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export function MarketingSenderInspectPanel() {
  const { user } = useAuthContext();
  const canInspect = hasMarketingPermission(
    { role: user?.role, userId: user?.id, organizationId: user?.organizationId },
    MARKETING_PERMISSIONS.SENDER_MANAGE,
  );
  const isAdministrator = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const allowed = Boolean(isAdministrator && canInspect);

  const [busy, setBusy] = useState(false);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);
  const [identity, setIdentity] = useState<PublicSenderIdentity | null>(null);
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null);

  async function inspect() {
    if (!allowed) return;
    setBusy(true);
    setError(null);
    setExists(null);
    setIdentity(null);
    setHttpStatus(null);
    try {
      const res = await authenticatedJsonFetch(marketingSenderInspectPath());
      const body = (await res.json()) as ApiEnvelope<{ identity: PublicSenderIdentity | null }>;
      setHttpStatus(res.status);
      if (!res.ok || !body.success) {
        setError({
          code: body.error?.code,
          message: body.error?.message || `Inspect failed (${res.status})`,
        });
        return;
      }
      const found = body.data?.identity ?? null;
      setIdentity(found);
      setExists(found != null);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Inspect failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Inspect Sender</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Read-only lookup of {MARKETING_SENDER_INSPECT_FROM_ADDRESS}. This page does not list senders
          and does not create records.
        </p>
      </header>

      <MarketingModuleNav activeId="sender-inspect" />

      {!allowed ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Administrator access with sender management permission is required. The API still
            enforces the same gate.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Inspect {MARKETING_SENDER_INSPECT_FROM_ADDRESS}</CardTitle>
          <CardDescription>
            Uses the authenticated admin helper. No sender list, snapshot, seed, or write.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" onClick={() => void inspect()} disabled={!allowed || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Inspect Sender
          </Button>

          {httpStatus != null ? (
            <p className="text-sm text-muted-foreground">HTTP {httpStatus}</p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error.code ? `${error.code}: ` : ""}
              {error.message}
            </p>
          ) : null}

          {exists === false ? (
            <p className="text-sm">Sender does not exist in the registry for this organisation.</p>
          ) : null}

          {exists === true && identity ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <InspectField label="ID" value={identity.id} />
              <InspectField label="From address" value={identity.fromAddress} />
              <InspectField label="Display name" value={identity.displayName} />
              <InspectField label="Reply-to" value={identity.replyTo} />
              <InspectField label="Active" value={formatFlag(identity.active)} />
              <InspectField label="Default" value={formatFlag(identity.isDefault)} />
              <InspectField label="Simulated" value={formatFlag(identity.simulated)} />
              <InspectField label="Approval" value={identity.approvalStatus} />
              <InspectField label="Verification" value={identity.verificationStatus} />
              <InspectField label="Channel" value={identity.channel} />
              <InspectField label="Provider" value={identity.providerMapping?.providerType} />
              <InspectField
                label="Credential configured"
                value={formatFlag(identity.providerMapping?.credentialConfigured)}
              />
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatFlag(value: boolean | undefined): string | undefined {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return undefined;
}

function InspectField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value == null || value === "" ? "Not specified" : value}</dd>
    </div>
  );
}
