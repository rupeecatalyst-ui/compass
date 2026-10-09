/** Read projections only. Persisted snapshots and SSOT records are never changed. */
type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function scalars(value: unknown, keys: readonly string[]): JsonRecord {
  const source = record(value), result: JsonRecord = {};
  for (const key of keys) {
    const v = source[key];
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") result[key] = v;
  }
  return result;
}
const LENDER_FIELDS = ["name","lenderId","id","lender","branch","relationshipManager","loginDate","applicationNumber","status","caseStage","caseSubStage","expectedLoanAmount","product","expectedRoi","specialNotes","strategicRank","reasonForRecommendation","strategicScore","foirAssessment","cibilAssessment","incomeFit","policyFit","expectedTurnaround","recommendationNotes","chanakyaRecommendation","identifiedBy","identifiedAt","lenderRef","lenderCode","lenderLegalName","lenderDisplayName","lenderClassification","lenderInstitutionCategory","lenderWebsite","lenderCustomerCarePhone","lenderCustomerCareEmail","lenderHeadquarters","lenderRegistryId","lenderProgramId","lenderProgramLabel","creditRiskPolicyRef","creditRiskPolicyLabel","lenderSalesContactId","lenderSalesContactName","lenderSalesContactMobile","lenderSalesContactDesignationId","lenderSalesContactDesignationLabel","lenderSalesContactOfficialEmail","lenderSalesContactInstitutionId","lenderSalesContactInstitutionLabel","fromStrategic","opportunityId","enterpriseDealId","enterpriseDealRowVersion","probability","isPrimary","dealPriority","dealHealthScore","remarks","lostReason","holdReason","holdReviewDate","disbursementDate","disbursedAmount","finalRoi","finalTenure","processingFee","revenue","invoiceRaised","paymentStatus","loginPayeeEntityType","loginPayeeEntityId","loginPayeeName","loginPayeeMobile","propertyIdentified","existingBanker","competitionNotes","relationshipNotes","loginProbeCompletedAt","createdBy","updatedBy","createdAt","updatedAt","disbursedAt"] as const;
const FILE_FIELDS = ["fileNumber", "customerId", "customerName", "customerMobile", "customerEmail", "city", "state", "employmentType", "lendingType", "transactionType", "loanProduct", "loanAmount", "requiredAmount", "productCode", "companyName", "primaryBorrowerKind", "source"] as const;
const EXTENSION_FIELDS = ["loanPurpose", "lendingType", "interestRate", "tenureMonths", "primaryOwnerUserId", "assignmentMode", "rcEmployeeAssignmentMode"] as const;
export function projectCaseExtension(value: unknown) {
  const source = record(value), result = scalars(source, EXTENSION_FIELDS);
  for (const key of ["assignedUserIds", "hierarchyVisibilityUserIds"]) {
    if (Array.isArray(source[key])) result[key] = (source[key] as unknown[]).filter(v => typeof v === "string");
  }
  if (Array.isArray(source.assignedUsers)) result.assignedUsers = source.assignedUsers.map(v => scalars(v, ["id", "name", "isPrimaryOwner"]));
  return result;
}
export function projectCaseSnapshot(value: unknown, deal?: { id: string; lenderId?: string | null }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = record(value), result = scalars(source, [...FILE_FIELDS, "legacyLoanFileId", "primaryBorrowerKind", "companyName", "fileNumber", "lenderLabel"]);
  for (const [key, fields] of Object.entries({ primaryContact: ["id", "name", "mobile", "email"], product: ["label", "lendingType", "transactionType"], stage: ["grossStage", "subStage"], amounts: ["loanAmount", "requiredAmount", "sanctionAmount", "disbursementAmount"] })) {
    if (source[key]) result[key] = scalars(source[key], fields);
  }
  const cards = Array.isArray(source.lenders) ? source.lenders : [];
  result.lenders = deal ? cards.filter(raw => {
    const card = record(raw), id = String(card.enterpriseDealId || ""), lender = String(card.lenderRegistryId || card.lenderId || "");
    return (id ? id === deal.id : Boolean(deal.lenderId && lender === deal.lenderId)) && (!lender || lender === deal.lenderId);
  }).map(card => scalars(card, LENDER_FIELDS)) : [];
  // Legacy scalar contact stamps are safe only when no multi-lender payload exists.
  if (deal && cards.length === 0) Object.assign(result, scalars(source, LENDER_FIELDS.filter(k => k.startsWith("lenderSalesContact"))));
  return result;
}
export function projectCaseList<T extends Record<string, unknown>>(row: T) {
  return { ...row, snapshot: null, lendingExtension: projectCaseExtension(row.lendingExtension), externalRefs: null, commercialTerms: null, healthPayload: null };
}
export function projectCaseDetail<T extends Record<string, unknown>>(row: T, kind: "deal" | "opportunity") {
  const snapshot = projectCaseSnapshot(row.snapshot, kind === "deal" ? { id: String(row.id), lenderId: typeof row.lenderId === "string" ? row.lenderId : null } : undefined);
  if (snapshot && kind === "deal") Object.assign(snapshot, { enterpriseDealId: row.id, opportunityId: row.opportunityId, lenderLabel: row.primaryCounterpartyName });
  return { ...row, snapshot, lendingExtension: projectCaseExtension(row.lendingExtension), externalRefs: null };
}
