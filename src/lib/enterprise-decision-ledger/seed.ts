/**
 * Phase 1 seed — demo commercial versions proving temporal integrity.
 */

import { runDemoSeedIfEnabled } from "@/lib/demo-seed";
import { publishCommercialAgreementVersion } from "./commercial-versioning";
import { getEdlRegistrySnapshot } from "./ledger-registry";

let seeded = false;

export function seedEdlPhase1DemoIfEmpty(): void {
  runDemoSeedIfEnabled(() => {
    if (seeded) return;
    if (getEdlRegistrySnapshot().commercialVersionCount > 0) {
      seeded = true;
      return;
    }

    publishCommercialAgreementVersion({
      agreementCode: "COMM-PARTNER-DEMO-001",
      agreementLabel: "Partner Commission — Demo Network",
      relatedEntityType: "partner",
      relatedEntityId: "partner:demo-network",
      versionNumber: "1",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      terms: { commissionPct: 0.4, currency: "INR" },
      requestedBy: "admin@compass.com",
      approvedBy: "admin@compass.com",
      businessJustification:
        "Initial partner commercial agreement for certification demo — Version 1 at 0.40%.",
    });

    publishCommercialAgreementVersion({
      agreementCode: "COMM-PARTNER-DEMO-001",
      agreementLabel: "Partner Commission — Demo Network",
      relatedEntityType: "partner",
      relatedEntityId: "partner:demo-network",
      versionNumber: "2",
      effectiveFrom: "2026-08-01T00:00:00.000Z",
      terms: { commissionPct: 0.55, currency: "INR" },
      previousTerms: { commissionPct: 0.4, currency: "INR" },
      requestedBy: "admin@compass.com",
      approvedBy: "admin@compass.com",
      businessJustification:
        "Commercial uplift effective Aug 2026 — Version 2 at 0.55%. Prior transactions remain on Version 1.",
    });

    seeded = true;
  });
}
