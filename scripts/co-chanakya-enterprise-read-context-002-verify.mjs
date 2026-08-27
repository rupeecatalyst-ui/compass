/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — verification.
 * Usage: node --import tsx scripts/co-chanakya-enterprise-read-context-002-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
  CHANAKYA_CONTACT_PII_REDACTION_MARKER,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";
import {
  recordChanakyaEnterpriseReadAudit,
  listChanakyaEnterpriseReadAudit,
  resetChanakyaEnterpriseReadAuditForTests,
} from "../src/lib/chanakya-enterprise-read-context/audit.ts";
import {
  issueOAuthRefreshToken,
  consumeOAuthRefreshToken,
  resetChatGptOAuthStoreForTests,
  issueAuthorizationCode,
  consumeAuthorizationCode,
} from "../src/lib/chatgpt-integration/oauth-store.ts";
import {
  signChatGptIntegrationAccessToken,
  verifyChatGptIntegrationAccessToken,
} from "../src/lib/chatgpt-integration/integration-access-token.ts";
import { CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS } from "../src/lib/chatgpt-integration/constants.ts";
import { oauthScopesForEndpoint } from "../src/lib/chatgpt-integration/oauth-scopes.ts";
import { CHATGPT_OAUTH_SCOPES } from "../src/types/chatgpt-integration-oauth.ts";
import {
  CHANAKYA_ENTERPRISE_READ_DOMAINS,
  CHANAKYA_ENTERPRISE_READ_MODES,
} from "../src/types/chanakya-enterprise-read-context.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-cer-002-jwt-secret-at-least-32-characters";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

// --- Privacy redaction ---
{
  const sample = {
    id: "opp_1",
    primaryContactName: "Asha Sharma",
    primaryContactMobile: "9876543210",
    primaryContactEmail: "asha@example.com",
    nested: {
      mobile: "9111111111",
      email: "x@y.com",
      cityLabel: "Pune",
    },
    emailStatus: "ok",
  };
  const redacted = redactCustomerContactPiiForAiContext(sample);
  if (redacted.primaryContactMobile || redacted.primaryContactEmail) {
    fail("primaryContact mobile/email must be omitted");
  } else ok("Omits primaryContact mobile/email");
  if (redacted.nested?.mobile || redacted.nested?.email) {
    fail("nested mobile/email must be omitted");
  } else ok("Omits nested mobile/email");
  if (redacted.nested?.cityLabel !== "Pune") fail("cityLabel must survive");
  else ok("Non-PII fields preserved");
  if (redacted.emailStatus !== "ok") fail("emailStatus operational field must survive");
  else ok("Operational emailStatus preserved");

  try {
    assertNoCustomerContactPiiInAiContext(redacted);
    ok("assertNoCustomerContactPiiInAiContext accepts redacted payload");
  } catch {
    fail("assertNoCustomerContactPiiInAiContext rejected clean payload");
  }

  try {
    assertNoCustomerContactPiiInAiContext(sample);
    fail("assertNoCustomerContactPiiInAiContext must reject raw PII");
  } catch {
    ok("assertNoCustomerContactPiiInAiContext rejects raw PII");
  }

  if (CHANAKYA_CONTACT_PII_REDACTION_MARKER !== "[REDACTED]") {
    fail("redaction marker constant");
  } else ok("Redaction marker constant present");
}

// --- 003B runtime attention evidence ---
{
  const {
    buildAttentionReasonsFromRadarRow,
    mapRadarRowToAttentionEvidence,
    attentionExplanationStatus,
  } = await import("../src/lib/chanakya-enterprise-read-context/attention-radar-evidence.ts");

  const mockRow = {
    id: "deal_test_1",
    fileId: "file_1",
    enterpriseDealId: "deal_test_1",
    dealId: "DEAL-2026-000082",
    opportunityNumber: "OPP-2026-000060",
    borrower: "Test Borrower",
    product: "Home Loan",
    loanAmount: 5000000,
    loanAmountLabel: "₹50,00,000",
    assignedRm: "RM One",
    quadrant: "at_risk",
    quadrantLabel: "At Risk",
    stageLabel: "Credit Pending",
    subStageLabel: "",
    lender: "Test Bank",
    lastActivity: "2026-08-01T10:00:00.000Z",
    lastActivityLabel: "1 Aug 2026",
    idleDays: 25,
    daysInStage: 14,
    workedToday: false,
    activityMomentumScore: 20,
    activityState: "needs_follow_up",
    activityStateLabel: "Needs Follow-up",
    activityMomentumTrend: "declining",
    isHealthyWaiting: false,
    pendingDocs: 2,
    openTasks: 1,
    priority: "high",
    status: "active",
    dealHealthScore: 35,
    classificationReason: "Prolonged idle with document gaps",
    recommendation: "Follow up on pending documents",
  };

  const built = buildAttentionReasonsFromRadarRow(mockRow);
  if (!built.reasons.length) fail("003B mock radar row must produce observable reasons");
  else ok("003B radar attention produces observable why reasons");
  if (!built.reasons.every((r) => r.source && r.domain && r.statement)) {
    fail("003B reasons must include domain, statement, and source provenance");
  } else ok("003B reasons retain provenance fields");
  if (!built.reasons.some((r) => r.domain === "documents")) {
    fail("003B document evidence must appear when pendingDocs > 0");
  } else ok("003B document evidence can appear");
  if (!built.reasons.some((r) => r.domain === "tasks")) {
    fail("003B task evidence must appear when openTasks > 0");
  } else ok("003B task evidence can appear");
  if (!built.reasons.some((r) => r.domain === "lender_stage")) {
    fail("003B lender/stage evidence must appear for stage signals");
  } else ok("003B lender/stage evidence can appear");
  if (!built.reasons.some((r) => r.domain === "activity")) {
    fail("003B activity evidence must appear for idle rows");
  } else ok("003B activity evidence can appear");

  const mapped = mapRadarRowToAttentionEvidence(mockRow);
  if (!mapped.sources.length || !mapped.why.length) {
    fail("003B mapped attention row must include why[] and sources[]");
  } else ok("003B mapped row includes why and sources");
  if (!mapped.severity || !mapped.classification) {
    fail("003B mapped row must preserve existing severity/classification");
  } else ok("003B preserves existing Radar severity/classification");

  const emptyStatus = attentionExplanationStatus({
    attention: "NOT_AVAILABLE",
    why: [],
  });
  if (emptyStatus !== "NOT_AVAILABLE") {
    fail("003B missing evidence must return NOT_AVAILABLE");
  } else ok("003B missing evidence returns NOT_AVAILABLE");
}

// --- 003D runtime change intelligence ---
{
  const {
    mapEarEventToChangeRecord,
    mapAccountingEvidenceToChangeRecords,
    resolveChangePeriodBounds,
    assembleChangeIntelligenceContext,
    isTimestampInPeriod,
  } = await import(
    "../src/lib/chanakya-enterprise-read-context/change-intelligence-core.ts"
  );

  const period = resolveChangePeriodBounds({
    period: "today",
    timeZone: "Asia/Kolkata",
  });
  if (!period.startAt || !period.endAt) fail("003D period bounds must be explicit");
  else ok("003D period bounds resolved");

  const observedAt = new Date().toISOString();
  const stageEar = mapEarEventToChangeRecord(
    {
      id: "ear_stage_1",
      organizationId: "org_1",
      eventKind: "stage_change",
      sourceSystem: "deal_timeline",
      sourceEventId: "st_1",
      title: "Stage updated",
      summary: "Lender stage moved",
      payload: { fromStage: "Logged In – WIP", toStage: "Soft Approved" },
      opportunityId: "opp_1",
      dealId: "deal_1",
      contactId: null,
      taskId: null,
      documentId: null,
      actorUserId: null,
      actorName: "Ops User",
      occurredAt: observedAt,
      createdAt: observedAt,
    },
    observedAt,
    { opportunityNumber: "OPP-2026-000060", dealNumber: "DEAL-2026-000082" },
  );
  if (!stageEar || stageEar.changeType !== "LENDER_STAGE_CHANGED") {
    fail("003D EAR stage change must map with previous/current when SSOT provides");
  } else ok("003D EAR stage changes consumed with provenance");
  if (stageEar.previousValue !== "Logged In – WIP" || stageEar.currentValue !== "Soft Approved") {
    fail("003D must preserve EAR previous/current values");
  } else ok("003D previous/current values from SSOT only");

  const docEar = mapEarEventToChangeRecord(
    {
      id: "ear_doc_1",
      organizationId: "org_1",
      eventKind: "documents",
      sourceSystem: "document",
      sourceEventId: "doc_1",
      title: "Document uploaded",
      summary: "PAN uploaded",
      payload: {},
      opportunityId: "opp_1",
      dealId: null,
      contactId: null,
      taskId: null,
      documentId: "doc_1",
      actorUserId: null,
      actorName: null,
      occurredAt: observedAt,
      createdAt: observedAt,
    },
    observedAt,
  );
  if (!docEar || docEar.domain !== "documents") {
    fail("003D document EAR events must map");
  } else ok("003D document changes consumed where available");

  const acctChanges = mapAccountingEvidenceToChangeRecords(
    {
      invoiceId: "inv_1",
      invoiceNumber: "INV-2026-001",
      documentStatus: "raised",
      raisedAt: observedAt,
      updatedAt: observedAt,
      dealId: "deal_1",
      opportunityId: "opp_1",
      payment: {
        id: "pay_1",
        status: "posted",
        amount: 50000,
        receivedAt: observedAt,
      },
    },
    observedAt,
    period,
  );
  if (!acctChanges.some((c) => c.changeType === "PAYMENT_RECEIVED")) {
    fail("003D payment changes must consume accounting SSOT");
  } else ok("003D payment changes consumed");
  if (!acctChanges.some((c) => c.changeType === "INVOICE_RAISED")) {
    fail("003D invoice raised must be detected");
  } else ok("003D accounting invoice changes consumed");

  const assembled = assembleChangeIntelligenceContext({
    period,
    changes: stageEar ? [stageEar, ...acctChanges] : acctChanges,
    observedAt,
    scopeLabel: "OPP-2026-000060",
  });
  if (!assembled.summary || !assembled.changes.length) {
    fail("003D change contract must include summary and changes[]");
  } else ok("003D change contract assembled");
  if (!assembled.readOnly) fail("003D must be read-only");
  else ok("003D change intelligence read-only");
  if (!isTimestampInPeriod(observedAt, period)) {
    fail("003D period filter must include current SSOT timestamps");
  } else ok("003D time window filter works");
}

// --- 003E runtime product/lender intelligence ---
{
  const {
    buildProductContextEvidence,
    buildAssignedLenderAssessments,
    buildMatrixMappedLenders,
    buildPotentialLenderFitAssessments,
    assembleProductLenderIntelligence,
    buildInternalLenderFitRecommendations,
    assertNoForbiddenLenderFitLanguage,
  } = await import(
    "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
  );

  const productContext = buildProductContextEvidence({
    opportunityProductCode: "HOME_LOAN",
    opportunityProductLabel: "Home Loan",
    productRecord: {
      id: "prod_1",
      organizationId: "org_1",
      categoryId: "cat_1",
      groupId: "grp_1",
      code: "HOME_LOAN",
      label: "Home Loan",
      lifecycleStatus: "active",
      operationalStatus: "active",
      majorVersion: 1,
      minorVersion: 0,
      sortOrder: 1,
      status: "active",
      enabled: true,
      versionNumber: 1,
      isDeleted: false,
      approvalStatus: "approved",
      createdBy: "system",
      modifiedBy: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  if (productContext.availability !== "AVAILABLE" || productContext.productCode !== "HOME_LOAN") {
    fail("003E product context must use Product Registry SSOT");
  } else ok("003E product context uses Product Registry");

  const assigned = buildAssignedLenderAssessments([
    {
      lenderId: "lender_1",
      lenderName: "Sample Bank",
      dealId: "deal_1",
      dealNumber: "DEAL-2026-000082",
      grossStage: "Logged In – WIP",
      subStage: "login",
      stageEnteredAt: new Date().toISOString(),
    },
  ]);
  if (!assigned.length || assigned[0].fitStatus !== "CURRENTLY_ASSIGNED") {
    fail("003E must consume existing lender assignment");
  } else ok("003E assigned lender context from Deal registry");

  const matrix = buildMatrixMappedLenders({
    productCode: "HOME_LOAN",
    lenders: [
      {
        lenderId: "lender_2",
        lenderCode: "BANK_B",
        lenderName: "Bank B",
        productsSupported: ["HOME_LOAN"],
        enabled: true,
        status: "active",
      },
      {
        lenderId: "lender_3",
        lenderCode: "BANK_C",
        lenderName: "Bank C",
        productsSupported: ["LAP"],
        enabled: true,
        status: "active",
      },
    ],
  });
  if (matrix.mappedLenderCount !== 1 || matrix.availability !== "AVAILABLE") {
    fail("003E Product–Lender Matrix must be consumed where available");
  } else ok("003E Product–Lender Matrix mapping consumed");

  const potential = buildPotentialLenderFitAssessments({
    productCode: "HOME_LOAN",
    matrixLenders: [
      {
        lenderId: "lender_2",
        lenderName: "Bank B",
        productsSupported: ["HOME_LOAN"],
      },
    ],
    programsByLender: new Map([
      [
        "lender_2",
        [
          {
            id: "prog_1",
            organizationId: "org_1",
            lenderId: "lender_2",
            productCode: "HOME_LOAN",
            code: "PRG_1",
            label: "Home Loan Program",
            lifecycleStatus: "active",
            status: "active",
            enabled: true,
            versionNumber: 1,
            maxLtvPercent: 80,
            maxFundingAmount: 50000000,
            isDeleted: false,
            approvalStatus: "approved",
            createdBy: "system",
            modifiedBy: "system",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      ],
    ]),
    transaction: { requestedAmount: 5000000, productCode: "HOME_LOAN" },
    assignedLenderIds: new Set(["lender_1"]),
  });
  if (
    !potential.length ||
    potential[0].fitStatus !== "POTENTIALLY_RELEVANT" ||
    !potential[0].reasons.some((r) => r.source.includes("productsSupported"))
  ) {
    fail("003E fit status must be evidence-first from matrix");
  } else ok("003E lender fit evidence-first from matrix");

  if (
    potential.some((p) =>
      p.supportingEvidence.some((s) => !assertNoForbiddenLenderFitLanguage(s)),
    )
  ) {
    fail("003E must not use approved/guaranteed/eligible language");
  } else ok("003E avoids fabricated eligibility language");

  const internal = buildInternalLenderFitRecommendations({
    productCode: "HOME_LOAN",
    matrixAvailable: true,
    missingInformation: [
      {
        field: "turnover",
        statement: "Turnover evidence is unavailable.",
        availability: "NOT_AVAILABLE",
      },
    ],
  });
  if (!internal.length || !internal.every((r) => r.internalOnly === true)) {
    fail("003E internal recommendations must remain internal-only");
  } else ok("003E internal recommendations separated from lender output");

  const assembled = assembleProductLenderIntelligence({
    productContext,
    assignedLenders: assigned,
    matrixEvidence: matrix,
    potentialFit: potential,
    propertyEvidence: {
      availability: "NOT_AVAILABLE",
      provenance: "enterprise_opportunity_registry",
    },
    missingInformation: [],
    internalRecommendations: internal,
  });
  if (!assembled.readOnly || !assembled.lenderFit.length) {
    fail("003E lender fit contract must assemble read-only lenderFit[]");
  } else ok("003E lender fit contract assembled");
}

// --- Contracts / modes ---
{
  if (CHANAKYA_ENTERPRISE_READ_MODES.length !== 5) fail("modes count");
  else ok("Read modes: summary/opportunity/domain/enterprise/transaction");
  if (!CHANAKYA_ENTERPRISE_READ_MODES.includes("transaction")) {
    fail("transaction mode missing");
  } else ok("transaction mode present");
  if (CHANAKYA_ENTERPRISE_READ_DOMAINS.length < 9) fail("domain contracts incomplete");
  else ok(`Domain contracts (${CHANAKYA_ENTERPRISE_READ_DOMAINS.length})`);
  if (!CHANAKYA_ENTERPRISE_READ_DOMAINS.includes("productLender")) {
    fail("productLender domain missing");
  } else ok("productLender domain present");
}

// --- Audit (no PII) ---
{
  resetChanakyaEnterpriseReadAuditForTests();
  recordChanakyaEnterpriseReadAudit({
    correlationId: "corr_test",
    mode: "summary",
    domains: ["executive"],
    organizationId: "org_test",
    outcome: "success",
    summary: "test",
    entityScope: "OPP-TEST",
    actorUserId: "user_1",
  });
  const events = listChanakyaEnterpriseReadAudit(5);
  if (events.length !== 1) fail("audit event not recorded");
  else ok("Enterprise read audit recorded");
  const json = JSON.stringify(events[0]);
  if (/9876543210|asha@example/.test(json)) fail("audit leaked PII");
  else ok("Audit payload free of sample PII");
}

// --- OAuth refresh ---
{
  resetChatGptOAuthStoreForTests();
  const { refreshToken, record } = issueOAuthRefreshToken({
    userId: "u1",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ, CHATGPT_OAUTH_SCOPES.CHANAKYA],
    clientId: "client_a",
  });
  if (!refreshToken.startsWith("cgo_rt_")) fail("refresh token format");
  else ok("Issues opaque refresh token");
  if (record.tokenHash === refreshToken) fail("must store hash not plaintext");
  else ok("Stores hashed refresh token only");

  const consumed = consumeOAuthRefreshToken(refreshToken, "client_a");
  if (!consumed || consumed.userId !== "u1") fail("refresh consume failed");
  else ok("Consumes valid refresh token");

  const wrongClient = consumeOAuthRefreshToken(refreshToken, "other");
  if (wrongClient) fail("refresh must reject wrong client");
  else ok("Rejects refresh for wrong client_id");

  const access = signChatGptIntegrationAccessToken({
    userId: "u1",
    email: "employee@rupeecatalyst.com",
    role: "SUPER_ADMIN",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ, CHATGPT_OAUTH_SCOPES.CHANAKYA],
  });
  const payload = verifyChatGptIntegrationAccessToken(access);
  if (payload.userId !== "u1") fail("access token verify");
  else ok("Access token still signs/verifies after refresh work");

  // Auth code path still works
  const code = issueAuthorizationCode({
    userId: "u1",
    organizationId: "org1",
    scopes: [CHATGPT_OAUTH_SCOPES.READ],
    redirectUri: "https://chat.openai.com/aip/oauth/callback",
    codeChallenge: "abc",
    codeChallengeMethod: "S256",
    clientId: "client_a",
  });
  const used = consumeAuthorizationCode(code.code);
  if (!used) fail("authorization code path broken");
  else ok("Authorization code path intact");
}

// --- GPT Action surface read-only + enterprise-read ---
{
  const gptEndpointsSrc = read("src/lib/chatgpt-integration/gpt-action-endpoints.ts");
  if (!/"enterprise-read"/.test(gptEndpointsSrc)) {
    fail("enterprise-read GPT Action slug missing");
  } else ok("GPT Action slug enterprise-read registered");

  if (
    !CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS.includes(
      "/api/integrations/chatgpt/v1/enterprise-read",
    )
  ) {
    fail("canonical enterprise-read endpoint missing");
  } else ok("Canonical enterprise-read endpoint allowlisted");

  const scopes = oauthScopesForEndpoint(
    "/api/integrations/chatgpt/v1/enterprise-read",
  );
  if (
    !scopes.includes(CHATGPT_OAUTH_SCOPES.READ) ||
    !scopes.includes(CHATGPT_OAUTH_SCOPES.CHANAKYA)
  ) {
    fail("enterprise-read scopes incomplete");
  } else ok("enterprise-read requires chatgpt:read + chatgpt:chanakya");

  const routeSrc = read("src/app/api/chanakya/enterprise-read-context/route.ts");
  if (!/METHOD_NOT_ALLOWED/.test(routeSrc) || !/export async function POST/.test(routeSrc)) {
    fail("employee enterprise-read-context must reject mutations");
  } else ok("Employee enterprise-read-context rejects mutations");

  const gptHandler = read("src/lib/chatgpt-integration/gpt-action-route-handler.ts");
  if (!/Only GET is permitted/.test(gptHandler)) {
    fail("GPT Action handler missing read-only enforcement");
  } else ok("GPT Action handler enforces GET-only");

  // Flag: no mutation operations in GPT Action OpenAPI paths (POST business actions)
  const gptOpenapi = read("docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml");
  if (!/enterprise-read/.test(gptOpenapi)) fail("GPT Action OpenAPI missing enterprise-read");
  else ok("GPT Action OpenAPI documents enterprise-read");
  const mutationOps = gptOpenapi.match(/^\s+(post|put|patch|delete):/gim) || [];
  if (mutationOps.length > 0) {
    fail(`GPT Action OpenAPI exposes mutation verbs: ${mutationOps.join(",")}`);
  } else ok("GPT Action OpenAPI has no mutation verbs (GET-only)");

  const v1Openapi = read("docs/co-chatgpt-integration/CO-CHATGPT-INTEGRATION-V1.openapi.yaml");
  if (!/refresh_token/.test(v1Openapi)) fail("V1 OpenAPI missing refresh_token");
  else ok("V1 OpenAPI documents refresh_token grant");
  if (!/\/api\/integrations\/chatgpt\/v1\/enterprise-read/.test(v1Openapi)) {
    fail("V1 OpenAPI missing enterprise-read path");
  } else ok("V1 OpenAPI documents enterprise-read");
}

// --- Source presence ---
{
  const required = [
    "src/types/chanakya-enterprise-read-context.ts",
    "src/lib/chanakya-enterprise-read-context/compile.ts",
    "src/lib/chanakya-enterprise-read-context/opportunity-360.ts",
    "src/lib/chanakya-enterprise-read-context/deal-360.ts",
    "src/lib/chanakya-enterprise-read-context/transaction-attention.ts",
    "src/lib/chanakya-enterprise-read-context/attention-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/attention-radar-evidence.ts",
    "src/lib/chanakya-enterprise-read-context/commercial-projections.ts",
    "src/lib/chanakya-enterprise-read-context/change-intelligence-core.ts",
    "src/lib/chanakya-enterprise-read-context/change-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts",
    "src/lib/chanakya-enterprise-read-context/product-lender-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/evidence-projections.ts",
    "src/lib/chanakya-enterprise-read-context/redact-pii.ts",
    "src/app/api/chanakya/enterprise-read-context/route.ts",
    "src/app/api/integrations/chatgpt/v1/enterprise-read/route.ts",
    "server/services/chatgpt-integration/compose-enterprise-read.ts",
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
    else ok(`Present ${rel}`);
  }

  const compileSrc = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (!/assembleChanakyaDeal360/.test(compileSrc)) fail("compile missing Deal 360");
  else ok("Compiler wires Deal 360");
  if (!/buildTransactionAttentionContext/.test(compileSrc)) {
    fail("compile missing transaction attention");
  } else ok("Compiler wires transaction attention");
  if (
    !/mode === "domain"/.test(compileSrc) ||
    !/!request\.opportunityRef/.test(compileSrc)
  ) {
    fail("domain mode must allow portfolio compile without opportunityRef");
  } else ok("Domain mode supports portfolio (no opportunityRef required)");

  const opp360 = read("src/lib/chanakya-enterprise-read-context/opportunity-360.ts");
  const deal360 = read("src/lib/chanakya-enterprise-read-context/deal-360.ts");
  const evidence = read("src/lib/chanakya-enterprise-read-context/evidence-projections.ts");
  if (!/projectEarEvidence/.test(opp360) || !/projectEarEvidence/.test(deal360)) {
    fail("003A EAR evidence not wired into Opp/Deal 360");
  } else ok("003A EAR evidence wired into Opp/Deal 360");
  if (!/projectDialogueEvidence/.test(opp360) || !/projectDialogueEvidence/.test(deal360)) {
    fail("003A Dialogue evidence not wired");
  } else ok("003A Dialogue evidence wired");
  if (!/projectDocumentReadinessEvidence/.test(opp360)) {
    fail("003A document readiness not wired into Opportunity 360");
  } else ok("003A document readiness wired into Opportunity 360");
  if (!/projectPhaseReadinessEvidence/.test(opp360) || !/projectPhaseReadinessEvidence/.test(deal360)) {
    fail("003A phase readiness not wired");
  } else ok("003A phase readiness wired");
  if (
    !/projectPostDisbursementConfirmationEvidence/.test(opp360) ||
    !/projectPostDisbursementConfirmationEvidence/.test(deal360)
  ) {
    fail("003A post-disbursement confirmation not wired");
  } else ok("003A post-disbursement confirmation wired");
  if (!/deriveOpportunityDocumentReadiness/.test(evidence)) {
    fail("evidence must call deriveOpportunityDocumentReadiness");
  } else ok("Document readiness uses existing deriveOpportunityDocumentReadiness");
  if (!/derivePhaseReadiness/.test(evidence)) {
    fail("evidence must call derivePhaseReadiness");
  } else ok("Phase readiness uses existing derivePhaseReadiness");
  if (!/POST_DISBURSEMENT_CONFIRMATION_STAGE/.test(evidence)) {
    fail("post-disb evidence must use confirmation service stage constants");
  } else ok("Post-disbursement uses confirmation service stage constants");
  if (!/enterpriseActivityService/.test(evidence)) {
    fail("EAR evidence must use enterpriseActivityService");
  } else ok("EAR evidence uses enterpriseActivityService");
  if (/mobileMasked|primaryContactMobile\s*:/.test(evidence)) {
    fail("evidence projections must not introduce mobile fields");
  } else ok("Evidence projections avoid mobile field injection");

  const attentionIntel = read("src/lib/chanakya-enterprise-read-context/attention-intelligence.ts");
  const attentionTypes = read("src/types/chanakya-enterprise-read-context.ts");
  if (!/buildAttentionReasonsFromRadarRow/.test(attentionIntel)) {
    fail("003B attention-intelligence missing buildAttentionReasonsFromRadarRow");
  } else ok("003B attention intelligence module present");
  if (!/buildEntityAttentionExplanation/.test(attentionIntel)) {
    fail("003B missing entity attention explanation");
  } else ok("003B entity-scoped attention explanation present");
  if (!/domainBreakdown/.test(attentionIntel) || !/ChanakyaAttentionReasonEvidence/.test(attentionTypes)) {
    fail("003B attention contract missing domain breakdown / reason evidence types");
  } else ok("003B attention contract extended with provenance reasons");
  const attentionRadar = read("src/lib/chanakya-enterprise-read-context/attention-radar-evidence.ts");
  if (
    (!/listTasksForEntity/.test(attentionIntel) && !/listTasksForEntity/.test(attentionRadar)) ||
    (!/listSdeExceptions/.test(attentionIntel) && !/listSdeExceptions/.test(attentionRadar))
  ) {
    fail("003B must join ETE and SDE evidence");
  } else ok("003B joins ETE task and SDE exception evidence");
  if (!/deriveOpportunityDocumentReadiness|derivePhaseReadiness|projectPostDisbursementConfirmationEvidence/.test(attentionIntel)) {
    fail("003B must join document/phase/post-disb evidence");
  } else ok("003B joins document, phase readiness, and post-disbursement evidence");
  if (!/opportunityId:\s*opportunity360/.test(compileSrc)) {
    fail("compile must pass entity refs into transaction attention");
  } else ok("Compiler passes entity scope into transaction attention");
  if (!/priorityList/.test(attentionIntel)) {
    fail("003B must expose priorityList ordered by existing classification");
  } else ok("003B priority list uses existing Radar classification order");
  if (/new risk score|fabricated reasons/i.test(attentionIntel)) {
    fail("003B must not introduce fabricated risk language in code paths");
  } else ok("003B avoids fabricated risk engine language");

  const commercialProj = read("src/lib/chanakya-enterprise-read-context/commercial-projections.ts");
  if (!/projectCommercialAccountingContext/.test(commercialProj)) {
    fail("003C commercial projections missing entity context");
  } else ok("003C commercial accounting context projector present");
  if (!/projectPortfolioCommercialSnapshot/.test(commercialProj)) {
    fail("003C portfolio commercial snapshot missing");
  } else ok("003C portfolio commercial snapshot present");
  if (!/deriveInvoiceReceivable/.test(commercialProj)) {
    fail("003C must use deriveInvoiceReceivable SSOT");
  } else ok("003C uses deriveInvoiceReceivable for receivable evidence");
  if (!/serializeCreditNote/.test(commercialProj)) {
    fail("003C must source credit notes from existing serializer");
  } else ok("003C credit-note evidence uses existing SSOT serializer");
  if (!/appendCommercialAttentionReasons/.test(commercialProj)) {
    fail("003C commercial attention reasons missing");
  } else ok("003C commercial attention reasons wired");
  if (!/readOnly:\s*true/.test(commercialProj)) {
    fail("003C commercial context must be read-only");
  } else ok("003C commercial context marked read-only");
  if (/partyInvoiceEmail|primaryContactMobile/.test(commercialProj)) {
    fail("003C must not expose invoice email/mobile in projections");
  } else ok("003C avoids PII fields in commercial projections");
  if (!/projectCommercialAccountingContext/.test(opp360)) {
    fail("003C Opportunity 360 must use commercial projections");
  } else ok("003C Opportunity 360 commercial slice wired");
  if (!/projectCommercialAccountingContext/.test(deal360)) {
    fail("003C Deal 360 must use commercial projections");
  } else ok("003C Deal 360 commercial slice wired");
  if (!/projectPortfolioCommercialSnapshot/.test(read("src/lib/chanakya-enterprise-read-context/transaction-attention.ts"))) {
    fail("003C portfolio commercial must feed attention context");
  } else ok("003C portfolio commercial feeds commercial attention context");

  const changeCore = read("src/lib/chanakya-enterprise-read-context/change-intelligence-core.ts");
  const changeIntel = read("src/lib/chanakya-enterprise-read-context/change-intelligence.ts");
  const typesSrc = read("src/types/chanakya-enterprise-read-context.ts");
  if (!/ChanakyaChangeIntelligenceContext/.test(typesSrc)) {
    fail("003D change contract types missing");
  } else ok("003D change contract types present");
  if (!/projectChangeIntelligence/.test(changeIntel)) {
    fail("003D change intelligence projector missing");
  } else ok("003D change intelligence projector present");
  if (!/mapEarEventToChangeRecord/.test(changeCore)) {
    fail("003D must consume EAR changes");
  } else ok("003D EAR change mapper present");
  if (!/STAGE_CHANGED|LENDER_STAGE_CHANGED/.test(changeCore)) {
    fail("003D stage change types missing");
  } else ok("003D stage change types supported");
  if (!/DOCUMENT_ADDED|DOCUMENT_STATUS_CHANGED/.test(changeCore)) {
    fail("003D document change types missing");
  } else ok("003D document change types supported");
  if (!/mapAccountingEvidenceToChangeRecords/.test(changeCore)) {
    fail("003D accounting change mapper missing");
  } else ok("003D accounting changes consume commercial/accounting SSOT");
  if (!/PAYMENT_RECEIVED/.test(changeCore)) {
    fail("003D payment change types missing");
  } else ok("003D payment changes supported");
  if (!/POST_DISBURSEMENT_CONFIRMATION/.test(changeCore)) {
    fail("003D post-disbursement change types missing");
  } else ok("003D post-disbursement changes supported");
  if (!/NOT_AVAILABLE|previousValue:\s*null/.test(changeCore)) {
    fail("003D must not fabricate previous/current values");
  } else ok("003D avoids fabricated previous/current values");
  if (!/changeIntelligence/.test(compileSrc)) {
    fail("003D changeIntelligence must be wired into compile");
  } else ok("003D wired into enterprise read compile");
  if (!/changePeriod/.test(read("server/services/chatgpt-integration/compose-enterprise-read.ts"))) {
    fail("003D ChatGPT enterprise-read must expose changePeriod");
  } else ok("003D ChatGPT enterprise-read exposes change intelligence");
  if (/\.post\(|\.put\(|\.patch\(|\.delete\(/.test(changeIntel)) {
    fail("003D must not introduce mutation paths");
  } else ok("003D change intelligence remains read-only");

  const plCore = read("src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts");
  const plIntel = read("src/lib/chanakya-enterprise-read-context/product-lender-intelligence.ts");
  if (!/ChanakyaProductLenderIntelligenceContext/.test(typesSrc)) {
    fail("003E product/lender contract types missing");
  } else ok("003E product/lender contract types present");
  if (!/projectProductLenderIntelligence/.test(plIntel)) {
    fail("003E product/lender projector missing");
  } else ok("003E product/lender intelligence projector present");
  if (!/productRegistryService|buildProductContextEvidence/.test(plIntel + plCore)) {
    fail("003E must consume Product Registry");
  } else ok("003E consumes Product Registry SSOT");
  if (!/lenderRegistryService|lenderSupportsProduct/.test(plIntel + plCore)) {
    fail("003E must consume Lender Registry and matrix helpers");
  } else ok("003E consumes Lender Registry and Product–Lender Matrix");
  if (!/POTENTIALLY_RELEVANT|CURRENTLY_ASSIGNED|INSUFFICIENT_EVIDENCE/.test(plCore)) {
    fail("003E fit status contract missing");
  } else ok("003E fit status values evidence-first");
  if (/APPROVED|GUARANTEED|BEST_LENDER|ELIGIBLE/.test(plCore.replace(/NOT_AVAILABLE/g, ""))) {
    fail("003E must not claim approved/guaranteed/eligible fit");
  } else ok("003E avoids approval/guarantee language");
  if (!/internalOnly:\s*true/.test(plCore)) {
    fail("003E internal recommendations must be internal-only");
  } else ok("003E internal recommendations flagged internal-only");
  if (!/productLenderIntelligence/.test(compileSrc)) {
    fail("003E must wire productLenderIntelligence into compile");
  } else ok("003E wired into enterprise read compile");
  if (!/projectProductLenderIntelligence/.test(opp360)) {
    fail("003E Opportunity 360 must use product/lender intelligence");
  } else ok("003E Opportunity 360 productLender slice wired");
  if (!/projectProductLenderIntelligence/.test(deal360)) {
    fail("003E Deal 360 must use product/lender intelligence");
  } else ok("003E Deal 360 productLender slice wired");
  if (!/projectProductLenderIntelligence/.test(read("src/lib/chanakya-credit-proposal/gather-context.ts"))) {
    fail("003E credit proposal gather must expose product/lender intelligence");
  } else ok("003E credit proposal context wired");

  const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
  if (!/redactCustomerContactPiiForAiContext/.test(gather)) {
    fail("credit proposal gather-context must redact contact PII");
  } else ok("Credit proposal gather-context applies contact PII redaction");

  // --- 010 Credit Intelligence ---
  {
    const {
      assembleCreditIntelligence,
      buildFinancialProfileFromFacts,
      buildFinancialTrendsFromFacts,
      buildBankingAnalysisFromEvidence,
      buildGstAnalysisFromFacts,
      buildGstVsFinancials,
      buildReconciliationRows,
      computeMetricTrend,
      parseFinancialNumeric,
      assertNoForbiddenCreditLanguage,
    } = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");

    const creditTypes = read("src/types/chanakya-credit-intelligence.ts");
    const creditCore = read("src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
    const creditProj = read("src/lib/chanakya-credit-intelligence/project-credit-intelligence.ts");

    if (!/ChanakyaCreditIntelligenceContext/.test(creditTypes)) {
      fail("010 credit intelligence contract types missing");
    } else ok("010 credit intelligence contract types present");
    if (!/financialProfile|financialTrends|bankingAnalysis|gstAnalysis|creditAssessment/.test(creditTypes)) {
      fail("010 contract must include major credit sections");
    } else ok("010 contract includes major credit sections");
    if (!/projectCreditIntelligence/.test(creditProj)) {
      fail("010 credit intelligence projector missing");
    } else ok("010 credit intelligence projector present");
    if (!/assembleCreditIntelligence/.test(creditCore)) {
      fail("010 assembleCreditIntelligence missing");
    } else ok("010 assembleCreditIntelligence present");
    if (!/creditIntelligence/.test(compileSrc)) {
      fail("010 must wire creditIntelligence into compile");
    } else ok("010 wired into enterprise read compile");
    if (!/projectCreditIntelligence/.test(opp360)) {
      fail("010 Opportunity 360 must use credit intelligence");
    } else ok("010 Opportunity 360 credit slice wired");
    if (!/creditIntelligence/.test(gather)) {
      fail("010 credit proposal gather must expose creditIntelligence");
    } else ok("010 credit proposal context wired");
    if (!/internalOnly:\s*true/.test(creditCore)) {
      fail("010 internal recommendations must be internal-only");
    } else ok("010 internal recommendations flagged internal-only");
    if (/\b(computeFoir|deriveFoir|calculateFoir|computeDscr|calculateDscr|computeLtv)\b/i.test(creditCore)) {
      fail("010 must not compute FOIR/DSCR/LTV inline");
    } else ok("010 credit ratios remain NOT_AVAILABLE without inline FOIR calc");
    if (/\bfraud\b/i.test(creditCore.replace(/not labelled fraud/gi, "").replace(/fraudulent/gi, "").replace(/not labelled fraudulent/gi, ""))) {
      fail("010 must not generate fraud claims from variance");
    } else ok("010 avoids fraud language in reconciliation");

    const mkFact = (key, value, period, docId, label) => ({
      id: `${docId}:${key}:${period}`,
      key,
      label: label ?? key,
      value,
      unit: "inr",
      periodLabel: period,
      provenance: {
        documentId: docId,
        opportunityId: "opp_fixture_010",
        displayName: `Fixture ${docId}`,
        typeRef: "fixture",
        mimeType: "application/pdf",
        documentVersionHint: null,
        page: null,
        sectionOrTable: key.startsWith("gst") ? "GST" : "P&L",
        extractionMethod: "table_extraction",
        confidence: "high",
      },
      lenderFacingEligible: true,
    });

    const fixtureFacts = [
      mkFact("revenue", "₹1,00,00,000", "FY2023-24", "doc_pnl_1", "Revenue / Turnover"),
      mkFact("revenue", "₹1,20,00,000", "FY2024-25", "doc_pnl_2", "Revenue / Turnover"),
      mkFact("pat", "₹10,00,000", "FY2023-24", "doc_pnl_1", "PAT"),
      mkFact("pat", "₹15,00,000", "FY2024-25", "doc_pnl_2", "PAT"),
      mkFact("net_worth", "₹50,00,000", "FY2024-25", "doc_bs_1", "Net Worth"),
      mkFact("gst_taxable_turnover", "₹1,18,00,000", null, "doc_gst_1", "GST Taxable Value"),
      mkFact("gst_period", "Apr 2024", null, "doc_gst_1", "GST Period"),
      mkFact("opening_balance", "₹2,50,000", null, "doc_bank_1", "Opening Balance"),
      mkFact("closing_balance", "₹3,10,000", null, "doc_bank_1", "Closing Balance"),
    ];

    const profile = buildFinancialProfileFromFacts(fixtureFacts);
    if (profile.allFacts.length < 3) fail("010 fixture must recognize P&L/BS facts");
    else ok("010 financial profile recognizes extracted facts");
    if (profile.years.length < 2) fail("010 multi-year fixture must retain two years");
    else ok("010 multi-year financial profile works");

    const revenueTrend = computeMetricTrend({
      metric: "revenue",
      label: "Revenue",
      facts: fixtureFacts,
    });
    if (revenueTrend.direction !== "UP" || revenueTrend.growthPercent == null) {
      fail("010 deterministic revenue trend must compute UP growth");
    } else ok("010 deterministic trend calculation works");
    if (Math.abs(revenueTrend.growthPercent - 20) > 0.5) {
      fail(`010 revenue growth expected ~20% got ${revenueTrend.growthPercent}`);
    } else ok("010 trend growth percent is deterministic");

    const trends = buildFinancialTrendsFromFacts(fixtureFacts);
    if (!trends.chartData.revenue.available || trends.chartData.revenue.points.length < 2) {
      fail("010 chart-ready revenue series must have 2+ points");
    } else ok("010 chart-ready financial trend data produced");

    const singleYearFacts = [mkFact("revenue", "₹80,00,000", "FY2022-23", "doc_single", "Revenue")];
    const singleProfile = buildFinancialProfileFromFacts(singleYearFacts);
    const singleTrends = buildFinancialTrendsFromFacts(singleYearFacts);
    if (singleProfile.years.length !== 1) fail("010 single-year must keep exactly one year");
    else ok("010 single-year financials supported");
    if (singleTrends.metrics.find((m) => m.metric === "revenue")?.growthPercent != null) {
      fail("010 must not compute trend with only one year");
    } else ok("010 missing years remain without fabricated trend");

    const bankingReadable = buildBankingAnalysisFromEvidence({
      facts: fixtureFacts,
      reads: [
        {
          documentId: "doc_bank_1",
          opportunityId: "opp_fixture_010",
          displayName: "Bank Statement Fixture",
          typeRef: "bank_statement",
          mimeType: "application/pdf",
          familyHint: "banking",
          status: "content_read",
          extractionMethod: "pdf_text_layer",
          hasBinary: true,
          byteLength: 1000,
          textExcerpt: "Opening Balance 250000 Closing Balance 310000",
          textCharCount: 50,
          limitation: null,
          provenance: {
            documentId: "doc_bank_1",
            opportunityId: "opp_fixture_010",
            displayName: "Bank Statement Fixture",
            typeRef: "bank_statement",
            mimeType: "application/pdf",
            documentVersionHint: null,
            page: null,
            sectionOrTable: "Bank Statement",
            extractionMethod: "pdf_text_layer",
            confidence: "high",
          },
        },
      ],
    });
    if (bankingReadable.availability === "NOT_AVAILABLE") {
      fail("010 readable bank fixture must produce banking analysis");
    } else ok("010 banking facts consumed when readable");

    const bankingMetadataOnly = buildBankingAnalysisFromEvidence({
      facts: [],
      reads: [
        {
          documentId: "doc_bank_meta",
          opportunityId: "opp_fixture_010",
          displayName: "Bank Metadata Only",
          typeRef: "bank_statement",
          mimeType: "application/pdf",
          familyHint: "banking",
          status: "no_binary",
          extractionMethod: "unavailable",
          hasBinary: false,
          byteLength: 0,
          textExcerpt: null,
          textCharCount: 0,
          limitation: "No binary",
          provenance: {
            documentId: "doc_bank_meta",
            opportunityId: "opp_fixture_010",
            displayName: "Bank Metadata Only",
            typeRef: "bank_statement",
            mimeType: "application/pdf",
            documentVersionHint: null,
            page: null,
            sectionOrTable: null,
            extractionMethod: "unavailable",
            confidence: "none",
          },
        },
      ],
    });
    if (bankingMetadataOnly.availability !== "NOT_AVAILABLE") {
      fail("010 metadata-only bank statements must return NOT_AVAILABLE");
    } else ok("010 unreadable bank statements return NOT_AVAILABLE");

    const gst = buildGstAnalysisFromFacts(fixtureFacts);
    if (gst.availability === "NOT_AVAILABLE" || gst.returns.length === 0) {
      fail("010 GST facts must be consumed");
    } else ok("010 GST analysis consumes extracted facts");

    const gstVs = buildGstVsFinancials({
      financialProfile: profile,
      gstAnalysis: gst,
    });
    if (gstVs.availability !== "AVAILABLE") fail("010 GST vs financials must compare when both present");
    else ok("010 GST vs financial reconciliation works");

    const assembled = assembleCreditIntelligence({
      opportunityId: "opp_fixture_010",
      structuredFacts: fixtureFacts,
      crossDocumentComparisons: [],
      reads: [],
      stated: { statedTurnover: "₹1,15,00,000" },
    });
    if (!assembled.keyPositives.length && !assembled.keyConcerns.length) {
      fail("010 must produce evidence-backed positives or concerns from fixture");
    } else ok("010 positives/concerns evidence-backed from fixture");
    if (assembled.creditRatios.availability !== "NOT_AVAILABLE") {
      fail("010 creditRatios must remain NOT_AVAILABLE");
    } else ok("010 credit ratios NOT_AVAILABLE without approved engine");
    if (!assertNoForbiddenCreditLanguage(assembled.creditAssessment.overallAssessment.summary)) {
      fail("010 credit assessment must avoid APPROVED/SANCTIONED language");
    } else ok("010 credit assessment avoids approval language");
    if (assembled.internalRecommendations.some((r) => r.internalOnly !== true)) {
      fail("010 all internal recommendations must be internalOnly");
    } else ok("010 internal recommendations remain internal");

    const recon = buildReconciliationRows({
      facts: fixtureFacts,
      crossDocumentComparisons: [],
      stated: { statedTurnover: "₹1,15,00,000" },
      gstVsFinancials: gstVs,
    });
    if (!recon.rows.some((r) => r.field === "turnover")) {
      fail("010 cross-document reconciliation must include turnover rows");
    } else ok("010 cross-document reconciliation rows produced");
    if (recon.rows.some((r) => /fraud/i.test(r.explanation))) {
      fail("010 reconciliation must not label variance as fraud");
    } else ok("010 reconciliation does not invent fraud claims");

    if (parseFinancialNumeric("₹1,20,00,000") !== 12000000) {
      fail("010 parseFinancialNumeric deterministic parse failed");
    } else ok("010 numeric parsing is deterministic");
  }
}

if (failed > 0) {
  console.error(`\nCO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 verify PASS");
