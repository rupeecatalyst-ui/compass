import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canTransitionDurablePolicy, policyDraftSchema } from "../server/services/credit-risk-policy/policy-admin.service.ts";

const stages = ["draft", "validated", "testing", "approved", "published"];
for (let i = 0; i < stages.length - 1; i++) {
  assert.equal(canTransitionDurablePolicy(stages[i], stages[i + 1]), true);
  for (let j = i + 2; j < stages.length; j++) {
    assert.equal(canTransitionDurablePolicy(stages[i], stages[j]), false, `Skipped ${stages[i]} → ${stages[j]}`);
  }
}
assert.equal(canTransitionDurablePolicy("published", "draft"), false);
assert.equal(canTransitionDurablePolicy("retired", "published"), false);

const validDraft = {
  policyCode: "HL_STANDARD", policyName: "Home Loan Standard", description: "",
  lenderId: "lender-id", lenderName: "Lender", productId: "HOME_LOAN", productName: "Home Loan",
  priority: 50, approvalAuthority: "Credit Committee", ruleRefs: [],
};
assert.equal(policyDraftSchema.safeParse(validDraft).success, true);
assert.equal(policyDraftSchema.safeParse({ ...validDraft, policyCode: "" }).success, false);
assert.equal(policyDraftSchema.safeParse({ ...validDraft, priority: -1 }).success, false);

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("src/components/catalyst-one/credit-risk-engine/policy-library/policy-builder-form.tsx");
const client = read("src/lib/credit-risk-engine/durable-policy-admin.ts");
const detail = read("src/components/catalyst-one/credit-risk-engine/policy-library/policy-detail-view.tsx");
const service = read("server/services/credit-risk-policy/policy-admin.service.ts");
const published = read("server/repositories/credit-risk-policy/durable-policy.repository.ts");
const programme = read("server/services/product-programme-operations/programme.service.ts");
const selector = read("src/components/catalyst-one/product-programme-operations/programme-editor.tsx");
const schema = read("prisma/schema.prisma");

assert.match(builder, /saveDurablePolicy/);
assert.match(client, /authenticatedJsonFetch\(url/);
assert.doesNotMatch(client, /apiRequest/);
assert.doesNotMatch(builder, /savePolicyDraft\(/);
assert.match(detail, /transitionDurablePolicy/);
assert.doesNotMatch(detail, /transitionPolicyStatus\(/);
assert.match(service, /enterpriseCreditRiskPolicy\.create/);
assert.match(service, /versions: \{ create:/);
assert.match(service, /enterpriseCreditRiskPolicyVersion\.updateMany/);
assert.match(service, /currentPublishedVersionId: to === "published" \? version\.id/);
assert.match(published, /status: "published"/);
assert.match(programme, /isPublishedVersion\(policyVersionId, organizationId\)/);
assert.match(selector, /policyVersionId: value/);
assert.match(schema, /policyVersion EnterpriseCreditRiskPolicyVersion\? @relation\(fields: \[policyVersionId\], references: \[id\]/);

console.log("Phase 1C.3 durable policy validation, ordered lifecycle, and Product Programme linkage PASS");
