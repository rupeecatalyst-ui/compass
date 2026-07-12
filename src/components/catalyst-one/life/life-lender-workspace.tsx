"use client";

import { useEffect, useState } from "react";
import { LIFE_ACTIVE_STATUS, LIFE_CONTACT_ROLES } from "@/constants/enterprise-life-engine";
import {
  getLifeRegistrySnapshot,
  registerLifeLenderContact,
  selectLifeLenderExecutors,
} from "@/lib/enterprise-life-engine";
import type { LifeLenderSelectionResult } from "@/types/enterprise-life-engine";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  registerLifeLenderContact({
    contactCode: "LIFE-SBI-EXE-001",
    contactName: "Neha Joshi",
    mobile: "9876500003",
    lenderRef: "lender:sbi",
    lenderName: "State Bank of India",
    branchRef: "branch:sbi-mumbai",
    branchName: "Andheri West",
    city: "Mumbai",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west", "mapping:metro"],
    roles: [LIFE_CONTACT_ROLES.LENDER_EXECUTOR, LIFE_CONTACT_ROLES.OPERATIONS],
    lenderExecutor: true,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingManagerRef: "employee:mgr-sbi-01",
    reportingManagerName: "Vikram Desai",
    reportingHierarchy: ["Neha Joshi", "Vikram Desai"],
    createdBy: "system",
  });

  // Credit contact without executor — must not appear in selection results
  registerLifeLenderContact({
    contactCode: "LIFE-HDFC-CR-001",
    contactName: "Amit Credit Desk",
    mobile: "9876500099",
    email: "credit.desk@hdfc.demo",
    lenderRef: "lender:hdfc",
    lenderName: "HDFC Bank",
    branchRef: "branch:hdfc-pune",
    branchName: "Pune Camp",
    city: "Pune",
    productRefs: ["product:home-loan"],
    businessMappingRefs: ["mapping:west"],
    roles: [LIFE_CONTACT_ROLES.CREDIT],
    lenderExecutor: false,
    activeStatus: LIFE_ACTIVE_STATUS.ACTIVE,
    reportingHierarchy: ["Amit Credit Desk", "Credit Manager"],
    createdBy: "system",
  });
}

export function LifeLenderWorkspace() {
  const [productRef, setProductRef] = useState("product:home-loan");
  const [city, setCity] = useState("Pune");
  const [businessMappingRef, setBusinessMappingRef] = useState("mapping:west");
  const [results, setResults] = useState<LifeLenderSelectionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seededCount, setSeededCount] = useState(0);

  useEffect(() => {
    seedLifeContactsIfEmpty();
    setSeededCount(getLifeRegistrySnapshot().contacts.length);
  }, []);

  const onSelect = () => {
    setError(null);
    try {
      const matched = selectLifeLenderExecutors({
        productRef,
        city,
        businessMappingRef: businessMappingRef || undefined,
      });
      setResults(matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selection failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LIFE · Lender Selection"
        description={`Intelligent lender executor selection by product, city, and business mapping. Credit-only contacts without executor flag are excluded. ${seededCount} contacts in registry.`}
      />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Product ref</Label>
          <Input value={productRef} onChange={(e) => setProductRef(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Business mapping</Label>
          <Input value={businessMappingRef} onChange={(e) => setBusinessMappingRef(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={onSelect}>Select executors</Button>
        </div>
        {error && <p className="text-sm text-destructive md:col-span-full">{error}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {results.map((r) => (
          <EnterpriseEngagementCard
            key={r.contact.id}
            title={r.contact.contactName}
            description={`${r.lenderName}${r.branchName ? ` · ${r.branchName}` : ""}`}
            tone="emerald"
            badge={`Score ${r.recommendationScore}`}
            meta={`Manager: ${r.reportingManagerName ?? "—"} · ${r.selectionReason}`}
          >
            <p className="text-xs text-muted-foreground">
              Hierarchy: {r.reportingHierarchy.join(" → ") || "—"}
            </p>
          </EnterpriseEngagementCard>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground md:col-span-2">
            No executor matches yet. Run selection with product/city filters.
          </p>
        )}
      </div>
    </div>
  );
}
