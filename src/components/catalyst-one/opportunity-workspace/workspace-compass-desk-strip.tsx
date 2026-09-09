"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

type DeskPayload = {
  journeyKind?: string;
  expertSlaState?: string | null;
  expertSla?: { state: string; remainingWorkingMs: number } | null;
  assistedOfferJson?: { headline?: string } | null;
  lenderAssessmentsJson?: unknown[];
  mobileVerifiedAt?: string | null;
  assessedAt?: string | null;
};

export function WorkspaceCompassDeskStrip({ opportunityId }: { opportunityId: string }) {
  const [data, setData] = useState<DeskPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authenticatedJsonFetch(`/api/opportunities/${opportunityId}/compass-assessment`);
        const body = await res.json();
        if (!cancelled) setData(body.assessment ?? null);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  if (!data) return null;
  const offer =
    Array.isArray(data.lenderAssessmentsJson) && data.lenderAssessmentsJson.length > 0
      ? "Tentative Offer"
      : data.assistedOfferJson
        ? "Assisted Offer"
        : "Assessment";
  const sla = data.expertSla?.state ?? data.expertSlaState;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 text-[11px]">
      <Badge className="bg-sky-600 text-white">COMPASS</Badge>
      {data.journeyKind ? (
        <Badge variant="outline">{data.journeyKind.replace(/_/g, " ")}</Badge>
      ) : null}
      <Badge variant="secondary">{offer}</Badge>
      <Badge variant="outline">{data.mobileVerifiedAt ? "Mobile verified" : "Mobile not verified"}</Badge>
      {sla ? <Badge variant="outline">Expert SLA · {sla.replace(/_/g, " ")}</Badge> : null}
      {data.assessedAt ? (
        <span className="text-zinc-400">
          Assessed {new Date(data.assessedAt).toLocaleString("en-IN")}
        </span>
      ) : null}
    </div>
  );
}
