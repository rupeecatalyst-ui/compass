"use client";

import { useEffect, useMemo, useState } from "react";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import type { EdieDocumentRule, EdieDocumentUploadMethod } from "@/types/enterprise-document-intelligence-engine";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

const CONTEXT_DEFAULT = {
  product: "product:home-loan",
  employmentType: "salaried",
  constitution: "individual",
  customerCategory: "standard",
  loanStage: "origination",
};

function seedDocumentRulesIfEmpty() {
  if (!isDemoSeedEnabled()) return;
  if (listEdieDocumentRules().length > 0) return;

  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-001",
    ruleName: "Home loan salaried KYC pack",
    productRef: "product:home-loan",
    employmentType: "salaried",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:salary-slip"],
    uploadMethod: "both",
    enabled: true,
    createdBy: "system",
  });

  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SE-001",
    ruleName: "Home loan self-employed pack",
    productRef: "product:home-loan",
    employmentType: "self_employed",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: ["doc:pan", "doc:itr", "doc:bank-statement"],
    uploadMethod: "individual",
    enabled: true,
    createdBy: "system",
  });

  registerEdieDocumentRule({
    ruleCode: "EDIE-LAP-CORP-001",
    ruleName: "LAP corporate folder upload",
    productRef: "product:lap",
    employmentType: "self_employed",
    constitution: "company",
    customerCategory: "corporate",
    loanStage: "underwriting",
    documentTypeRefs: ["doc:moa", "doc:board-resolution", "doc:financials"],
    uploadMethod: "folder",
    enabled: true,
    createdBy: "system",
  });
}

function supportsMethod(rule: EdieDocumentRule, method: "folder" | "individual"): boolean {
  return rule.uploadMethod === method || rule.uploadMethod === "both";
}

function logDocumentAction(action: string, detail: string) {
  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: "opp-demo-001" },
    eventType: "document_upload",
    title: action,
    description: detail,
    actorId: "ui",
    expandablePayload: { source: "edie-workspace", simulated: true },
  });
}

export function DocumentsWorkspace() {
  const [product, setProduct] = useState(CONTEXT_DEFAULT.product);
  const [employmentType, setEmploymentType] = useState(CONTEXT_DEFAULT.employmentType);
  const [constitution, setConstitution] = useState(CONTEXT_DEFAULT.constitution);
  const [customerCategory, setCustomerCategory] = useState(CONTEXT_DEFAULT.customerCategory);
  const [loanStage, setLoanStage] = useState(CONTEXT_DEFAULT.loanStage);
  const [rules, setRules] = useState<EdieDocumentRule[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const refresh = () => {
    setRules(
      resolveEdieDocumentRulesForContext({
        productRef: product,
        employmentType,
        constitution,
        customerCategory,
        loanStage,
      }),
    );
  };

  useEffect(() => {
    seedDocumentRulesIfEmpty();
    setRules(
      resolveEdieDocumentRulesForContext({
        productRef: CONTEXT_DEFAULT.product,
        employmentType: CONTEXT_DEFAULT.employmentType,
        constitution: CONTEXT_DEFAULT.constitution,
        customerCategory: CONTEXT_DEFAULT.customerCategory,
        loanStage: CONTEXT_DEFAULT.loanStage,
      }),
    );
  }, []);

  const folderRules = useMemo(() => rules.filter((r) => supportsMethod(r, "folder")), [rules]);
  const individualRules = useMemo(() => rules.filter((r) => supportsMethod(r, "individual")), [rules]);

  const onAction = (method: EdieDocumentUploadMethod | "view" | "replace" | "download", rule?: EdieDocumentRule) => {
    const label =
      method === "folder"
        ? "Folder Upload"
        : method === "individual"
          ? "Individual Upload"
          : method === "view"
            ? "View"
            : method === "replace"
              ? "Replace"
              : "Download";
    const detail = rule
      ? `${label} simulated for ${rule.ruleName} (${rule.documentTypeRefs.join(", ")})`
      : `${label} simulated — no matching rule`;
    logDocumentAction(label, detail);
    setLastAction(detail);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents · EDIE Rules"
        description="Context-aware document rules. Upload actions are simulated and logged to Dialogue Center — no file storage."
      />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Product</Label>
          <Input value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Employment type</Label>
          <Input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Constitution</Label>
          <Input value={constitution} onChange={(e) => setConstitution(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Customer category</Label>
          <Input value={customerCategory} onChange={(e) => setCustomerCategory(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Loan stage</Label>
          <Input value={loanStage} onChange={(e) => setLoanStage(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={refresh}>Resolve rules</Button>
        </div>
      </div>

      {lastAction && <p className="text-xs text-muted-foreground">Last action: {lastAction}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <EnterpriseEngagementCard
          title="Folder Upload"
          description="Bulk folder upload for rules that allow folder or both methods."
          tone="cyan"
          badge={`${folderRules.length} rules`}
        >
          <div className="space-y-2">
            {folderRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border bg-background/60 p-2">
                <p className="text-xs font-medium">{rule.ruleName}</p>
                <p className="text-[10px] text-muted-foreground">{rule.documentTypeRefs.join(", ")}</p>
                <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs" onClick={() => onAction("folder", rule)}>
                  Upload folder
                </Button>
              </div>
            ))}
            {folderRules.length === 0 && (
              <p className="text-xs text-muted-foreground">No folder-capable rules for this context.</p>
            )}
          </div>
        </EnterpriseEngagementCard>

        <EnterpriseEngagementCard
          title="Individual"
          description="Per-document actions — Upload, View, Replace, Download (simulated)."
          tone="blue"
          badge={`${individualRules.length} rules`}
        >
          <div className="space-y-2">
            {individualRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border bg-background/60 p-2">
                <p className="text-xs font-medium">{rule.ruleName}</p>
                <p className="text-[10px] text-muted-foreground">{rule.documentTypeRefs.join(", ")}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onAction("individual", rule)}>
                    Upload
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("view", rule)}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("replace", rule)}>
                    Replace
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("download", rule)}>
                    Download
                  </Button>
                </div>
              </div>
            ))}
            {individualRules.length === 0 && (
              <p className="text-xs text-muted-foreground">No individual-capable rules for this context.</p>
            )}
          </div>
        </EnterpriseEngagementCard>
      </div>
    </div>
  );
}
