import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluateProgrammeCompleteness } from "../src/lib/product-programme-operations/completeness.ts";
import { PROGRAMME_BAT_FIXTURES } from "../src/lib/product-programme-operations/fixtures.ts";
import { parseStructuredProgrammePayload } from "../src/lib/product-programme-operations/request-schema.ts";
import { structuredPayloadToCreateInput, structuredPayloadToUpdateInput } from "../src/lib/product-programme-operations/to-registry-input.ts";
import { calculateSalariedFoir, maxEmiFromFoirCap } from "../src/lib/home-loan-recommendation/foir.ts";
import { fetchPublishedPolicyVersions, loadProgrammesAndPolicyVersions, toPublishedPolicyOptions } from "../src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx";
import { ProductProgrammeEditor } from "../src/components/catalyst-one/product-programme-operations/programme-editor.tsx";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
globalThis.React = React;
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

const programmes = { items: [{ id: "draft-1" }] };
const versions = [{ id: "version-1", policyId: "policy-1", name: "Home Loan Policy", policyCode: "HL", versionNumber: 2 }];
const fakeResponse = (status, data) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const fetchedVersions = await fetchPublishedPolicyVersions(fakeResponse(200, { success: true, data: versions }));
assert.deepEqual(toPublishedPolicyOptions(fetchedVersions), [{ id: "version-1", policyId: "policy-1", label: "Home Loan Policy (HL, v2)" }]);
const renderEditor = (policies, policyState) => renderToStaticMarkup(createElement(ProductProgrammeEditor, {
  lenders: [], products: [], policies, policyState, actor: "fixture", onClose() {}, onSaved() {},
}));
assert.match(renderEditor(toPublishedPolicyOptions(fetchedVersions), { status: "loaded" }), /Published policy versions loaded: 1/);
assert.match(editor, /<SelectItem key=\{policy\.id\} value=\{policy\.id\}>\{policy\.label\}<\/SelectItem>/);
assert.deepEqual(await fetchPublishedPolicyVersions(fakeResponse(200, { success: true, data: [] })), []);
assert.deepEqual(toPublishedPolicyOptions([]), []);
assert.match(renderEditor([], { status: "empty" }), /No durable published policy versions available/);
await assert.rejects(fetchPublishedPolicyVersions(fakeResponse(401, { success: false, error: { message: "Authentication required" } })), /HTTP 401: Authentication required/);
assert.match(renderEditor([], { status: "error", message: "HTTP 401: Authentication required" }), /Unable to load published policy versions: HTTP 401: Authentication required/);
assert.equal(toPublishedPolicyOptions(versions).some((option) => option.id === "pol_ver_001"), false);
const withVersions = await loadProgrammesAndPolicyVersions(() => Promise.resolve(programmes), () => Promise.resolve(versions));
assert.deepEqual(withVersions, { programmes, policies: versions, policyLoadFailed: false, policyError: null });
const withNoVersions = await loadProgrammesAndPolicyVersions(() => Promise.resolve(programmes), () => Promise.resolve([]));
assert.deepEqual(withNoVersions, { programmes, policies: [], policyLoadFailed: false, policyError: null });
const policyFailure = await loadProgrammesAndPolicyVersions(
  () => Promise.resolve(programmes),
  () => fetchPublishedPolicyVersions(fakeResponse(401, { success: false, error: { message: "Authentication required" } })),
);
assert.equal(policyFailure.programmes, programmes);
assert.equal(policyFailure.policies, null);
assert.equal(policyFailure.policyLoadFailed, true);
assert.match(policyFailure.policyError.message, /HTTP 401: Authentication required/);
const malformedPolicyResponse = await loadProgrammesAndPolicyVersions(
  () => Promise.resolve(programmes),
  () => fetchPublishedPolicyVersions(fakeResponse(200, { success: true, data: [null] })),
);
assert.equal(malformedPolicyResponse.programmes, programmes);
assert.equal(malformedPolicyResponse.policyLoadFailed, true);
await assert.rejects(
  loadProgrammesAndPolicyVersions(() => Promise.reject(new Error("programmes unavailable")), () => Promise.resolve(versions)),
  /programmes unavailable/,
);
assert.match(workspace, /setPrograms\(\(registry\.programmes\.items \?\? \[\]\)/);
assert.match(workspace, /setPolicies\(toPublishedPolicyOptions\(registry\.policies \?\? \[\]\)\)/);
assert.match(workspace, /setPolicyState\(\{ status: "error", message:/);
assert.match(editor, /No durable published policy versions available/);
assert.match(editor, /Unable to load published policy versions:/);
assert.match(editor, /Published policy versions loaded:/);
assert.match(editor, /disabled=\{policyState\.status !== "loaded" \|\| policies\.length === 0\}/);

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
