import type {
  EnterpriseWealthPartner,
  EnterpriseWealthPartnerActivity,
  EnterpriseWealthPartnerBankAccount,
  EnterpriseWealthPartnerCommission,
  EnterpriseWealthPartnerNetworkMember,
} from "@prisma/client";
import type {
  EnterpriseWealthPartnerActivityRecord,
  EnterpriseWealthPartnerBankAccountRecord,
  EnterpriseWealthPartnerCommissionRecord,
  EnterpriseWealthPartnerNetworkMemberRecord,
  EnterpriseWealthPartnerRecord,
  WealthPartnerCommissionSlab,
} from "@/types/enterprise-wealth-partner-registry";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function mapWealthPartner(
  row: EnterpriseWealthPartner,
): EnterpriseWealthPartnerRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    displayName: row.displayName,
    partnerType: row.partnerType,
    identityKind: row.identityKind,
    contactId: row.contactId,
    companyId: row.companyId,
    identityLabel: row.identityLabel,
    lifecycleStatus: row.lifecycleStatus,
    operationalStatus: row.operationalStatus,
    pan: row.pan,
    gstin: row.gstin,
    email: row.email,
    mobile: row.mobile,
    cityLabel: row.cityLabel,
    stateLabel: row.stateLabel,
    website: row.website,
    notes: row.notes,
    profileJson: (row.profileJson as Record<string, unknown> | null) ?? null,
    complianceJson: (row.complianceJson as Record<string, unknown> | null) ?? null,
    commercialReferralSharePercent: row.commercialReferralSharePercent ?? null,
    commercialSoleExecutorSharePercent:
      row.commercialSoleExecutorSharePercent ?? null,
    commercialJointExecutorSharePercent:
      row.commercialJointExecutorSharePercent ?? null,
    commercialEffectiveFrom: iso(row.commercialEffectiveFrom),
    commercialStatus: row.commercialStatus ?? "active",
    sortOrder: row.sortOrder,
    status: row.status,
    enabled: row.enabled,
    versionNumber: row.versionNumber,
    effectiveFrom: iso(row.effectiveFrom),
    effectiveUntil: iso(row.effectiveUntil),
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapNetworkMember(
  row: EnterpriseWealthPartnerNetworkMember,
): EnterpriseWealthPartnerNetworkMemberRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    parentPartnerId: row.parentPartnerId,
    identityKind: row.identityKind,
    childContactId: row.childContactId,
    childCompanyId: row.childCompanyId,
    childDisplayName: row.childDisplayName,
    relationshipType: row.relationshipType,
    memberPartnerType: row.memberPartnerType,
    effectiveDate: row.effectiveDate.toISOString(),
    status: row.status,
    notes: row.notes,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapCommission(
  row: EnterpriseWealthPartnerCommission,
): EnterpriseWealthPartnerCommissionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    wealthPartnerId: row.wealthPartnerId,
    code: row.code,
    label: row.label,
    productCode: row.productCode,
    productLabel: row.productLabel,
    structureKind: row.structureKind,
    slabsJson: (row.slabsJson as WealthPartnerCommissionSlab[] | null) ?? null,
    ratePercent: row.ratePercent,
    rateBps: row.rateBps,
    flatAmount: row.flatAmount,
    currencyCode: row.currencyCode,
    payoutFrequency: row.payoutFrequency,
    overrideRulesJson:
      (row.overrideRulesJson as Record<string, unknown> | null) ?? null,
    effectiveFrom: iso(row.effectiveFrom),
    effectiveUntil: iso(row.effectiveUntil),
    status: row.status,
    enabled: row.enabled,
    versionNumber: row.versionNumber,
    notes: row.notes,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapBankAccount(
  row: EnterpriseWealthPartnerBankAccount,
): EnterpriseWealthPartnerBankAccountRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    wealthPartnerId: row.wealthPartnerId,
    accountName: row.accountName,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    ifsc: row.ifsc,
    accountType: row.accountType,
    isPrimary: row.isPrimary,
    enabled: row.enabled,
    notes: row.notes,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapActivity(
  row: EnterpriseWealthPartnerActivity,
): EnterpriseWealthPartnerActivityRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    wealthPartnerId: row.wealthPartnerId,
    activityType: row.activityType,
    title: row.title,
    detail: row.detail,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt.toISOString(),
  };
}
