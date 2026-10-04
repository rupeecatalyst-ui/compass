/**
 * Deterministic launch-closure proofs. No database and no mail send.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { evaluateProgrammeCompleteness } from "../product-programme-operations/completeness";
import { parseStructuredProgrammePayload } from "../product-programme-operations/request-schema";
import { isCanonicalProgrammeAvailable } from "../../../server/services/lender-recommendation/programme-availability";
import {
  PortalLaunchError,
  decideOtpAttempt,
  emailsMatch,
  isRecommendationAuthority,
  mapPortalPayloadToProgrammeBody,
  publicOtpDelivery,
  submissionCanPublish,
} from "./launch-closure";

const repoRoot = process.cwd();
let failed = 0;
function check(name: string, passed: boolean) {
  if (!passed) {
    failed += 1;
    console.error("FAIL", name);
  }
}
function source(path: string) {
  return readFileSync(path, "utf8");
}

const service = source("server/services/lender-program-portal/lender-program-portal.service.ts");
const portal = source("src/components/catalyst-one/lender-program-portal/lender-program-update-portal.tsx");
const admin = source("src/components/catalyst-one/admin/lender-program-portal/lender-program-portal-admin-workspace.tsx");
const mail = source("server/services/lender-program-portal/portal-mail.ts");
const invites = source("src/app/api/admin/lender-program-portal/invites/route.ts");
const review = source("src/app/api/admin/lender-program-portal/submissions/[submissionId]/review/route.ts");
const flag = source("src/constants/lender-program-portal/index.ts");

check("admin_generate_requires_recipient", invites.includes("recipientEmail") && admin.includes("Generate & Send Link"));
check("admin_review_requires_admin", review.includes("assertPortalAdministrator") && review.includes("policyVersionId"));
check("link_email_uses_existing_smtp", mail.includes("sendOperationalSmtpMessage") && service.includes("sendLenderPortalEmail"));
const client = source("src/lib/lender-program-portal/client.ts");
check("otp_not_returned", !service.includes("emailOtpPreview") && !service.includes("otpPreview") && !portal.includes("Certification Email OTP") && !client.includes("otpPreview"));
check("otp_email_invoked", service.includes("Product Programme verification code") && service.includes("publicOtpDelivery"));
check("document_upload_disabled", flag.includes("LENDER_PORTAL_LAUNCH_DOCUMENT_UPLOAD = false") && portal.includes("LENDER_PORTAL_LAUNCH_DOCUMENT_UPLOAD"));
check("publish_uses_certified_publisher", service.includes("productProgrammeOperationsService.publish") && service.includes("submissionCanPublish"));
check("portal_does_not_stamp_live_flag", !service.includes("isLivePublished"));
check("lender_routes_have_no_admin_publish", !source("src/app/api/lender-program-portal/[token]/submit/route.ts").includes("reviewSubmission"));
check("submit_stays_on_invite_product", service.includes("Selected product is not authorized for this invitation."));

const delivery = publicOtpDelivery();
check("public_otp_has_no_code", !("emailOtpPreview" in delivery) && !("otpPreview" in delivery) && delivery.channel === "email");
check("wrong_attempt_budget", decideOtpAttempt({ recentRequests: 0, recentFailures: 5 }).ok === false);
check("resend_budget", decideOtpAttempt({ recentRequests: 3, recentFailures: 0 }).ok === false);
check("attempt_within_budget", decideOtpAttempt({ recentRequests: 1, recentFailures: 1 }).ok === true);
check("recipient_match", emailsMatch("Lender@Bank.com", "lender@bank.com"));
check("pending_cannot_publish", submissionCanPublish("pending_review") === false && submissionCanPublish("draft") === false);
check("approved_can_publish", submissionCanPublish("approved") === true);

const base = {
  lenderId: "lender-1",
  productId: "product-1",
  productCode: "HOME_LOAN",
  programName: "Prime HL",
  policyVersionId: "policy-1",
  payload: {
    employmentType: "salaried",
    incomeAssessmentMethod: "salary",
    legalConstitution: "individual",
    residencyEligibility: "resident",
    interestType: "floating",
    benchmarkCode: "repo",
    propertyType: "ready",
    geographyState: "Maharashtra",
    minCibil: 700,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    minLoanAmount: 500000,
    maxLoanAmount: 10000000,
    minIncome: 30000,
    interestRate: 8.5,
    maxFoir: 55,
    effectiveDate: "2026-10-01",
    expiryDate: "2027-10-01",
    requiredDocuments: "Salary slips",
  },
};
const salaried = mapPortalPayloadToProgrammeBody(base);
const parsed = parseStructuredProgrammePayload(salaried);
const completeness = evaluateProgrammeCompleteness(parsed);
check("mapped_payload_is_complete_for_certified_publish", completeness.complete);
if (!completeness.complete) console.error(completeness.errors);
check("controlled_employment", Array.isArray(salaried.employmentTypes) && (salaried.employmentTypes as string[])[0] === "salaried");
check("salaried_keeps_foir", String(salaried.maxFoirExact).startsWith("55") && (salaried.incomeAssessmentMethods as string[])[0] === "salary");
let mismatch = false;
try {
  mapPortalPayloadToProgrammeBody({
    ...base,
    payload: { ...base.payload, employmentType: "self-employed-business", incomeAssessmentMethod: "salary" },
  });
} catch (error) {
  mismatch = error instanceof PortalLaunchError && error.code === "INCOME_MODEL_MISMATCH";
}
check("self_employed_rejects_salaried_method", mismatch);
const selfEmployed = mapPortalPayloadToProgrammeBody({
  ...base,
  payload: { ...base.payload, employmentType: "self-employed-business", incomeAssessmentMethod: "itr", maxFoir: 80 },
});
check("self_employed_does_not_store_salaried_foir", selfEmployed.maxFoirExact === null && (selfEmployed.incomeAssessmentMethods as string[])[0] === "itr");

const programme = {
  organizationId: "org-1",
  productCode: "HOME_LOAN",
  isDeleted: false,
  enabled: true,
  completenessState: "complete",
  effectiveFrom: "2026-01-01",
  effectiveUntil: "2027-01-01",
};
const asOf = new Date("2026-09-28T00:00:00.000Z");
function available(publicationState: string, isLivePublished: boolean) {
  return isCanonicalProgrammeAvailable({
    programme: { ...programme, publicationState, isLivePublished },
    organizationId: "org-1",
    product: "HOME_LOAN" as never,
    asOf,
  });
}
check("draft_not_authority", available("draft", false) === false && isRecommendationAuthority({ isLivePublished: false, publicationState: "draft", completenessState: "incomplete", enabled: true, isDeleted: false }) === false);
check("pending_not_authority", available("pending_approval", false) === false);
check("approved_unpublished_not_authority", available("draft", false) === false);
check("published_can_be_authority", available("published", true) === true);

const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
for (const forbidden of [
  "src/lib/field-control-master/",
  "src/lib/chanakya",
  "server/services/compass-customer-gateway/",
  "src/constants/enterprise-ai-platform/",
  "server/services/product-programme-operations/programme.service.ts",
  "server/services/lender-recommendation/",
]) {
  check(`untouched_${forbidden}`, !changed.includes(forbidden));
}

if (failed) {
  console.error(`LENDER_PORTAL_LAUNCH_CLOSURE_PROOF FAIL failed=${failed}`);
  process.exit(1);
}
console.log("LENDER_PORTAL_LAUNCH_CLOSURE_PROOF PASS");
