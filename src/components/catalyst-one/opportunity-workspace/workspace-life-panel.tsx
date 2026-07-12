"use client";

import { useEffect, useState } from "react";
import { LIFE_ACTIVE_STATUS, LIFE_CONTACT_ROLES } from "@/constants/enterprise-life-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  getLifeRegistrySnapshot,
  registerLifeLenderContact,
  selectLifeLenderExecutors,
} from "@/lib/enterprise-life-engine";
import type { LifeLenderSelectionResult } from "@/types/enterprise-life-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

function seedLifeContactsIfEmpty() {
  if (getLifeRegistrySnapshot().contacts.length > 0) return;

  registerLifeLenderContact({
    contactCode: "LIFE-HDFC-EXE-001",
    contactName: "Priya Sharma",
    mobile: "9876500001",
    email: "priya.sharma@hdfc.demo",
    lenderRef: "lender:hdfc",
    lenderName: "HDFC Bank",
    branchRef: "branch:hdfc-pune",
    branchName: "Pune Camp",
    city: "Pune",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.RELATIONSHIP_MANAGER],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-hdfc-01",
    reportingManagerName: "Anil Mehta",
    reportingHierarchy: ["Priya Sharma", "Anil Mehta", "West Zonal Head"],
    createdBy: "system",
  });

  registerLifeLenderContact({
    contactCode: "LIFE-ICICI-EXE-001",
    contactName: "Rahul Verma",
    mobile: "9876500002",
    email: "rahul.verma@icici.demo",
    lenderRef: "lender:icici",
    lenderName: "ICICI Bank",
    branchRef: "branch:icici-pune",
    branchName: "Baner",
    city: "Pune",
    productRefs: ["product:home-loan", "product:lap"],
    businessMappingRefs: ["mapping:west"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-icici-01",
    reportingManagerName: "Sneha Kapoor",
    reportingHierarchy: ["Rahul Verma", "Sneha Kapoor", "Regional Credit Head"],
    createdBy: "system",
  });
}

export function WorkspaceLifePanel() {
  const { opportunityId, refresh, selectedLender, setSelectedLender, intelligence } =
    useOpportunityWorkspace();
  const [productRef, setProductRef] = useState("product:home-loan");
  const [city, setCity] = useState("Pune");
  const [businessMappingRef, setBusinessMappingRef] = useState("");
  const [results, setResults] = useState<LifeLenderSelectionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedLifeContactsIfEmpty();
  }, []);

  const successProbability = Math.max(
    5,
    Math.min(98, Math.round((intelligence?.health.score ?? 70) * 0.92)),
  );

  const onSelect = () => {
    setError(null);
    try {
      const matched = selectLifeLenderExecutors({
        productRef,
        city,
        businessMappingRef: businessMappingRef || undefined,
        requireActive: true,
      });
      setResults(matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selection failed");
    }
  };

  const onPickLender = (result: LifeLenderSelectionResult, recommended: boolean) => {
    if (!opportunityId) return;
    setSelectedLender({
      lenderName: result.lenderName,
      executorName: result.contact.contactName,
      branchName: result.branchName,
      reportingManagerName: result.reportingManagerName,
      recommended,
      successProbability,
    });
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: "workflow",
      title: "Lender selected",
      description: `${result.contact.contactName} · ${result.lenderName}${
        result.branchName ? ` · ${result.branchName}` : ""
      }`,
      actorId: "workspace",
      expandablePayload: {
        contactId: result.contact.id,
        lenderRef: result.lenderRef,
        source: "opportunity-workspace-life",
      },
    });
    refresh();
  };

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="LIFE · Lender"
        badge="LIFE"
        description="Selected lender and executor posture"
      />

      <div className="mb-4 grid gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
        <Row label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
        <Row
          label="Recommended"
          value={selectedLender?.recommended ? "Yes" : selectedLender ? "No" : "—"}
        />
        <Row label="Executor" value={selectedLender?.executorName ?? "—"} />
        <Row label="Reporting Manager" value={selectedLender?.reportingManagerName ?? "—"} />
        <Row label="Branch" value={selectedLender?.branchName ?? "—"} />
        <Row
          label="Success Probability"
          value={
            selectedLender
              ? `${selectedLender.successProbability ?? successProbability}%`
              : `${successProbability}%`
          }
        />
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Input value={productRef} onChange={(e) => setProductRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Business mapping (optional)</Label>
            <Input
              value={businessMappingRef}
              onChange={(e) => setBusinessMappingRef(e.target.value)}
              placeholder="mapping:west"
            />
          </div>
        </div>
        <Button size="sm" onClick={onSelect}>
          Select executors
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="space-y-2">
          {results.map((r, index) => (
            <div
              key={r.contact.id}
              className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-3 dark:border-white/10 dark:bg-zinc-950/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">{r.contact.contactName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.lenderName}
                    {r.branchName ? ` · ${r.branchName}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Manager: {r.reportingManagerName ?? "—"}
                  </p>
                </div>
                {index === 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                    Recommended
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 h-7 text-xs"
                onClick={() => onPickLender(r, index === 0)}
              >
                Select
              </Button>
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-muted-foreground">Run selection to see matching executors.</p>
          )}
        </div>
      </div>
    </OwGlassPanel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
