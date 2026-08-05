/**
 * CO-ARCH-004 — Master data quality validation report.
 */
import type {
  EnterpriseLenderRecord,
  LenderMasterClassification,
} from "@/types/enterprise-lender-registry";
import { isImmutableLenderCode } from "@/lib/enterprise-lender-registry/codes";
import { detectLenderDuplicateClusters } from "@/lib/enterprise-lender-registry/merge";

export interface LenderMasterValidationReport {
  generatedAt: string;
  totalActiveLenders: number;
  duplicateClusters: number;
  missingClassification: string[];
  missingWebsite: string[];
  missingLenderCode: string[];
  missingType: string[];
  missingMandatoryFields: Array<{ id: string; label: string; fields: string[] }>;
  classificationCoverage: Record<LenderMasterClassification | "unclassified", number>;
  passed: boolean;
}

export function validateLenderMaster(
  lenders: EnterpriseLenderRecord[],
): LenderMasterValidationReport {
  const active = lenders.filter((l) => !l.isDeleted);
  const missingClassification: string[] = [];
  const missingWebsite: string[] = [];
  const missingLenderCode: string[] = [];
  const missingType: string[] = [];
  const missingMandatoryFields: Array<{ id: string; label: string; fields: string[] }> = [];

  const classificationCoverage: Record<LenderMasterClassification | "unclassified", number> = {
    public_sector_bank: 0,
    private_sector_bank: 0,
    small_finance_bank: 0,
    housing_finance_company: 0,
    nbfc: 0,
    cooperative_bank: 0,
    payments_bank: 0,
    foreign_bank: 0,
    unclassified: 0,
  };

  for (const lender of active) {
    const label = lender.displayName || lender.label;
    if (!lender.classification) {
      missingClassification.push(label);
      classificationCoverage.unclassified += 1;
    } else {
      classificationCoverage[lender.classification] += 1;
    }
    if (!lender.website?.trim()) missingWebsite.push(label);
    if (!isImmutableLenderCode(lender.code)) missingLenderCode.push(`${label} (${lender.code})`);
    if (!lender.institutionCategory) missingType.push(label);

    const fields: string[] = [];
    if (!(lender.legalName || lender.label).trim()) fields.push("legalName");
    if (!(lender.displayName || lender.label).trim()) fields.push("displayName");
    if (!lender.code?.trim()) fields.push("code");
    if (!lender.classification) fields.push("classification");
    if (!lender.institutionCategory) fields.push("institutionCategory");
    if (fields.length) missingMandatoryFields.push({ id: lender.id, label, fields });
  }

  const duplicateClusters = detectLenderDuplicateClusters(active).length;
  const passed =
    duplicateClusters === 0 &&
    missingClassification.length === 0 &&
    missingLenderCode.length === 0 &&
    missingType.length === 0 &&
    missingMandatoryFields.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    totalActiveLenders: active.length,
    duplicateClusters,
    missingClassification,
    missingWebsite,
    missingLenderCode,
    missingType,
    missingMandatoryFields,
    classificationCoverage,
    passed,
  };
}
