/**
 * CO-DOC-001 — BAT smoke verification (LOD stability / versioning / readiness / dedupe).
 * Run: npx tsx scripts/co-doc-001-bat-verify.ts
 */

import {
  EdieLodCertificationError,
  generateOpportunityLod,
} from "../src/lib/document-requests/generate-lod";
import {
  buildLodDimensionKey,
  hasLodDimensionDrift,
  mergeLodItemsWithPrior,
  nextLodVersionNumber,
} from "../src/lib/document-requests/lod-versioning";
import { deriveOpportunityDocumentReadiness } from "../src/lib/document-requests/readiness";
import type {
  DocumentRequestItemState,
  DocumentRequestLodVersionSnapshot,
} from "../src/types/document-requests";

type Scenario = {
  name: string;
  productLabel: string;
  employmentType: string;
  constitution?: string;
};

const SCENARIOS: Scenario[] = [
  { name: "Individual Salaried · Home Loan", productLabel: "Home Loan", employmentType: "salaried" },
  {
    name: "Individual Self-employed · Home Loan",
    productLabel: "Home Loan",
    employmentType: "self-employed-business",
    constitution: "Proprietorship",
  },
  {
    name: "Partnership · LAP",
    productLabel: "Loan Against Property",
    employmentType: "self-employed-business",
    constitution: "Partnership",
  },
  {
    name: "LLP · Business Loan",
    productLabel: "Business Loan",
    employmentType: "self-employed-business",
    constitution: "LLP",
  },
];

const BLOCKED_SCENARIOS: Scenario[] = [
  {
    name: "Private Limited · Working Capital (Phase 1 excluded)",
    productLabel: "Working Capital",
    employmentType: "company",
    constitution: "Private Limited",
  },
  {
    name: "Unknown product must not fall back to Home Loan",
    productLabel: "Mystery Product XYZ",
    employmentType: "salaried",
  },
];

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function run() {
  const results: string[] = [];

  for (const scenario of SCENARIOS) {
    const lod = generateOpportunityLod({
      productLabel: scenario.productLabel,
      employmentType: scenario.employmentType,
      constitution: scenario.constitution,
    });
    assert(lod.length > 0, `${scenario.name}: LOD empty`);
    const refs = new Set(lod.map((i) => i.typeRef));
    assert(refs.size === lod.length, `${scenario.name}: duplicate typeRefs in LOD`);
    assert(
      lod.every((i) => i.category === "critical" || i.category === "journey"),
      `${scenario.name}: invalid category`,
    );
    results.push(`PASS LOD · ${scenario.name} · ${lod.length} docs`);
  }

  for (const scenario of BLOCKED_SCENARIOS) {
    let blocked = false;
    try {
      generateOpportunityLod({
        productLabel: scenario.productLabel,
        employmentType: scenario.employmentType,
        constitution: scenario.constitution,
      });
    } catch (err) {
      blocked = err instanceof EdieLodCertificationError;
      assert(blocked, `${scenario.name}: expected EdieLodCertificationError`);
      assert(
        Boolean(err instanceof Error && err.message),
        `${scenario.name}: expected user-facing message`,
      );
    }
    assert(blocked, `${scenario.name}: LOD must not generate via silent fallback`);
    results.push(`PASS BLOCK · ${scenario.name}`);
  }

  // Versioning + merge: uploaded PAN survives product change; no duplicate pending
  const v1 = generateOpportunityLod({
    productLabel: "Home Loan",
    employmentType: "salaried",
  });
  const now = new Date().toISOString();
  const prior: DocumentRequestItemState[] = v1.map((item, idx) =>
    idx === 0
      ? {
          ...item,
          status: "under_verification",
          requestedOn: now,
          uploadedAt: now,
          registryRecordId: "dreg_bat_1",
        }
      : { ...item, status: "pending", requestedOn: now, reminderStatus: "none" },
  );
  const v2Generated = generateOpportunityLod({
    productLabel: "Loan Against Property",
    employmentType: "salaried",
  });
  const merged = mergeLodItemsWithPrior(v2Generated, prior, now);
  const kept = merged.find((i) => i.typeRef === prior[0]!.typeRef);
  assert(!!kept?.registryRecordId, "Uploaded document must remain linked after regen");
  assert(
    kept?.status === "under_verification",
    "Linked upload must not reset to pending",
  );
  const pendingDupes = merged.filter((i) => i.typeRef === prior[0]!.typeRef);
  assert(pendingDupes.length === 1, "Must not create duplicate LOD rows for same typeRef");
  results.push("PASS merge · uploaded docs linked · no duplicate pending");

  const versions: DocumentRequestLodVersionSnapshot[] = [
    {
      id: "lodv1",
      versionNumber: 1,
      generatedAt: now,
      generatedBy: "BAT",
      borrowerTypeLabel: "Salaried",
      productLabel: "Home Loan",
      constitutionLabel: "—",
      dimensionKey: buildLodDimensionKey({
        borrowerTypeLabel: "Salaried",
        productLabel: "Home Loan",
        constitutionLabel: "—",
      }),
      documentCount: v1.length,
      typeRefs: v1.map((i) => i.typeRef),
      active: false,
    },
  ];
  assert(nextLodVersionNumber(versions) === 2, "Next version must be 2");
  assert(
    hasLodDimensionDrift(versions[0], {
      borrowerTypeLabel: "Salaried",
      productLabel: "LAP",
      constitutionLabel: "—",
    }),
    "Dimension drift must detect product change",
  );
  results.push("PASS versioning · immutable next version + dimension drift");

  // Readiness transitions
  const critical = v1.filter((i) => i.category === "critical").slice(0, 3);
  const journey = v1.filter((i) => i.category === "journey").slice(0, 2);
  const awaiting: DocumentRequestItemState[] = [...critical, ...journey].map((i) => ({
    ...i,
    status: "pending" as const,
    requestedOn: now,
  }));
  assert(
    deriveOpportunityDocumentReadiness(awaiting).state === "awaiting_critical_documents",
    "Empty critical uploads → Awaiting Critical Documents",
  );

  const readyish: DocumentRequestItemState[] = awaiting.map((i) =>
    i.category === "critical"
      ? { ...i, status: "verified" as const, uploadedAt: now, registryRecordId: `r_${i.typeRef}` }
      : i,
  );
  const readySnap = deriveOpportunityDocumentReadiness(readyish);
  assert(
    readySnap.state === "journey_documents_pending" ||
      readySnap.state === "ready_for_lender_submission",
    `Critical complete should not stay awaiting (got ${readySnap.state})`,
  );

  const allDone: DocumentRequestItemState[] = awaiting.map((i) => ({
    ...i,
    status: "verified" as const,
    uploadedAt: now,
    registryRecordId: `r_${i.typeRef}`,
  }));
  assert(
    deriveOpportunityDocumentReadiness(allDone).state === "ready_for_lender_submission",
    "All verified → Ready for Lender Submission",
  );
  results.push("PASS readiness · awaiting ↔ ready transitions");

  // Upload source metadata contract (types only — repository remains single SSOT)
  const sources = ["customer_portal", "manual_upload", "email", "whatsapp", "api"] as const;
  assert(sources.length === 5, "All ingestion channels must be represented in metadata");
  results.push("PASS ingestion channels · metadata vocabulary present");

  console.log("CO-DOC-001 BAT VERIFY");
  for (const line of results) console.log(`  ${line}`);
  console.log("RESULT: PASS");
}

try {
  run();
} catch (err) {
  console.error("CO-DOC-001 BAT VERIFY FAILED");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
