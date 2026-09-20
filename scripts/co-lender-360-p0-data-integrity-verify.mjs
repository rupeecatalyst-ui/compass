import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { composeEnterpriseLenderDirectoryRows } from "../src/lib/enterprise-lender-directory/compose-directory.ts";

const lender = {
  id: "lender-canonical",
  code: "LND000001",
  label: "Test Bank",
  institutionCategory: "bank",
  status: "active",
  enabled: true,
  isDeleted: false,
  priority: 50,
  sortOrder: 50,
};
const programme = {
  id: "program-1",
  organizationId: "org-1",
  lenderId: lender.id,
  code: "TEST_HL_001",
  label: "Test Home Loan",
  productCode: "HOME-LOAN",
  status: "active",
  lifecycleStatus: "active",
  publicationState: "published",
  isLivePublished: true,
  enabled: true,
  isDeleted: false,
  versionNumber: 1,
  minRoiExact: "8.125000",
  maxRoiExact: "9.250000",
  maxLoanAmountExact: "25000000.00",
  maxLtvExact: "80.000000",
  maxFoirExact: "55.000000",
  processingFeePctExact: "0.500000",
  minCibil: 725,
  averageTatDays: 5,
};

const [row] = composeEnterpriseLenderDirectoryRows({
  lenders: [lender],
  programs: [programme],
  dealCountsByLenderId: { [lender.id]: { deals: 3, opportunities: 2, pipelineValue: 0 } },
});
assert.equal(row.homeLoanRoiLabel, "8.13%");
assert.equal(row.maxLoanAmountLabel, "₹2.50 Cr");
assert.equal(row.maxLtvLabel, "80%");
assert.equal(row.foirLabel, "55%");
assert.equal(row.processingFeeLabel, "0.5%");
assert.equal(row.minCibilLabel, "725");
assert.equal(row.averageTatLabel, "5d");
assert.equal(row.activeDeals, 3);
assert.equal(row.activeOpportunities, 2);

const dealRepo = await readFile(new URL("../server/repositories/enterprise-deal/enterprise-deal.repository.ts", import.meta.url), "utf8");
assert.match(dealRepo, /if \(query\.lenderId\) where\.lenderId = query\.lenderId/);
assert.match(dealRepo, /summarizeDealsByLender/);

const mergeRepo = await readFile(new URL("../server/repositories/lender-registry/lender-consolidation.repository.ts", import.meta.url), "utf8");
assert.match(mergeRepo, /Source and target lenders must be different/);
assert.match(mergeRepo, /Both lenders must belong to the authorized organization/);
assert.match(mergeRepo, /Merge blocked by/);
assert.match(mergeRepo, /prisma\.\$transaction/);
assert.match(mergeRepo, /lifecycleStatus: "retired"/);

const mergeRoute = await readFile(new URL("../src/app/api/lender-registry/lenders/merge/route.ts", import.meta.url), "utf8");
assert.match(mergeRoute, /requireLenderRegistryAdmin\(actor\)/);

const lenderService = await readFile(new URL("../server/services/lender-registry/lender-registry.service.ts", import.meta.url), "utf8");
assert.match(lenderService, /durable dependency reference/);
assert.match(lenderService, /program\?\.organizationId === organizationId/);

console.log("PASS co-lender-360-p0-data-integrity");
