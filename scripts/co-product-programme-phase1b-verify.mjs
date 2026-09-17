import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { evaluateProgrammeCompleteness } from "../src/lib/product-programme-operations/completeness.ts";
import { PROGRAMME_BAT_FIXTURES } from "../src/lib/product-programme-operations/fixtures.ts";
import { parseStructuredProgrammePayload } from "../src/lib/product-programme-operations/request-schema.ts";
import { structuredPayloadToCreateInput, structuredPayloadToUpdateInput } from "../src/lib/product-programme-operations/to-registry-input.ts";
import { calculateSalariedFoir, maxEmiFromFoirCap } from "../src/lib/home-loan-recommendation/foir.ts";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const source = (path) => readFileSync(join(root, path), "utf8");
const complete = (payload) => evaluateProgrammeCompleteness(payload).errors;

const salaried = PROGRAMME_BAT_FIXTURES.homeLoanSalaried({ minDbrExact: null, maxDbrExact: null });
assert.deepEqual(complete(salaried), []);
assert.equal(structuredPayloadToCreateInput(salaried, "actor").policyVersionId, "fixture-policy-v1");
assert.equal(structuredPayloadToUpdateInput(salaried, "actor").policyVersionId, "fixture-policy-v1");
assert.equal(parseStructuredProgrammePayload({ lenderId: "l", code: "c", label: "n", maxFoirExact: "55.123456" }).maxFoirExact, "55.123456");
assert.throws(() => parseStructuredProgrammePayload({ lenderId: "l", code: "c", label: "n", maxFoirExact: "55.1234567" }));
assert.ok(complete({ ...salaried, policyVersionId: null }).some((error) => error.field === "policyVersionId"));
assert.ok(complete({ ...salaried, minLoanAmountExact: null }).some((error) => error.field === "minLoanAmountExact"));

const selfEmployed = PROGRAMME_BAT_FIXTURES.homeLoanSelfEmployed({
  minFoirExact: null, maxFoirExact: null, minDbrExact: null, maxDbrExact: null,
});
assert.deepEqual(complete(selfEmployed), []);
assert.ok(complete({ ...selfEmployed, incomeAssessmentMethods: [] }).some((error) => error.field === "incomeAssessmentMethods"));
const mixed = PROGRAMME_BAT_FIXTURES.multiEmployment({ minDbrExact: null, maxDbrExact: null });
assert.deepEqual(complete(mixed), []);

assert.equal(maxEmiFromFoirCap({ eligibleMonthlyIncomeRupees: 100000, existingMonthlyEmiRupees: 10000, maxFoirPercent: 50 }), 40000);
assert.equal(calculateSalariedFoir({ eligibleMonthlyIncomeRupees: 100000, existingMonthlyEmiRupees: 10000, proposedMonthlyEmiRupees: 40000, replacedHomeLoanEmiRupees: 20000, isBalanceTransfer: true, maxFoirPercent: 50 }).foirPercent, 50);

const schema = source("prisma/schema.prisma");
const repository = source("server/repositories/credit-risk-policy/durable-policy.repository.ts");
const programmeData = source("server/repositories/lender-registry/structured-program-data.ts");
const route = source("src/app/api/lender-registry/published-policy-versions/route.ts");
const workspace = source("src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx");
const editor = source("src/components/catalyst-one/product-programme-operations/programme-editor.tsx");
const service = source("server/services/product-programme-operations/programme.service.ts");
assert.match(schema, /policyVersion EnterpriseCreditRiskPolicyVersion\? @relation\(fields: \[policyVersionId\], references: \[id\]/);
assert.match(repository, /enterpriseCreditRiskPolicyVersion\.findMany/);
assert.match(repository, /status: "published"/);
assert.match(repository, /policy: \{ organizationId, status: "published", isDeleted: false \}/);
assert.match(programmeData, /policyVersionId: input\.policyVersionId/);
assert.match(route, /requireLenderRegistryAdmin\(actor\)/);
assert.match(route, /id: version\.id/);
assert.match(workspace, /id: version\.id/);
assert.match(editor, /policyVersionId: value/);
assert.match(editor, /creditRiskPolicyRef: policies\.find\(\(policy\) => policy\.id === value\)\?\.policyId/);
assert.match(service, /assertPublishedPolicyVersion\(payload\.policyVersionId, input\.organizationId\)/);
assert.match(service, /assertPublishedPolicyVersion\(existing\.policyVersionId \?\? null, input\.organizationId\)/);

const changedTypeScriptFiles = [
  "server/repositories/credit-risk-policy/durable-policy.repository.ts",
  "server/services/product-programme-operations/programme.service.ts",
  "src/app/api/lender-registry/published-policy-versions/route.ts",
  "src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx",
  "src/components/catalyst-one/product-programme-operations/programme-editor.tsx",
  "src/lib/product-programme-operations/completeness.ts",
];
for (const file of changedTypeScriptFiles) {
  const result = ts.transpileModule(source(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  });
  assert.deepEqual(result.diagnostics ?? [], [], `${file} must transpile`);
}

console.log("Phase 1B focused publication, FOIR, policy-version contract, and TypeScript transpile checks PASS");
