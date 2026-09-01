/**
 * Accounting GST determination — Place of Supply + intra/inter-state + component split.
 * Backend-authoritative. Never invent rates; validate against regulatory config + GST Rate Master.
 */

import {
  ACCOUNTING_GST_DEFAULT_RATE_PERCENT,
  ACCOUNTING_GST_INTER_STATE_RULE,
  ACCOUNTING_GST_INTRA_STATE_RULE,
  ACCOUNTING_GST_POS_RULE_B2B_SERVICES,
  ACCOUNTING_GST_POS_RULE_FINANCIAL_SERVICES,
  ACCOUNTING_GST_RATE_RULE_18,
  GST_UNION_TERRITORY_CODES,
  GSTIN_STATE_CODES,
  type AccountingGstTaxTreatment,
  type AccountingRegulatoryTaxRule,
} from "@/constants/enterprise-accounting-regulatory-tax";
import { roundMoney2 } from "@/lib/enterprise-accounting-invoice/amounts";

export type AccountingGstComponentSplit = {
  taxTreatment: AccountingGstTaxTreatment;
  gstRatePercent: number;
  cgstRatePercent: number;
  sgstRatePercent: number;
  igstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  invoiceTotal: number;
  stateTaxLabel: "SGST" | "UTGST";
};

export type AccountingGstDeterminationInput = {
  taxableValue: number;
  /** Selected Administration GST Rate Master percent — must match regulatory default when default applies */
  selectedGstRatePercent: number;
  supplierGstin: string | null | undefined;
  supplierStateCode: string | null | undefined;
  supplierStateLabel: string | null | undefined;
  recipientGstin: string | null | undefined;
  recipientStateCode: string | null | undefined;
  recipientStateLabel: string | null | undefined;
  /** Explicit Place of Supply override (state code). Prefer over address inference when present. */
  placeOfSupplyStateCode?: string | null;
  placeOfSupplyStateLabel?: string | null;
  recipientGstRegistered?: boolean;
  supplyKind?: "financial_services" | "general_b2b_services";
  asOfIso?: string;
};

export type AccountingGstDeterminationResult =
  | {
      ok: true;
      placeOfSupplyStateCode: string;
      placeOfSupplyStateLabel: string;
      supplierStateCode: string;
      supplierStateLabel: string;
      recipientStateCode: string | null;
      recipientStateLabel: string | null;
      taxTreatment: AccountingGstTaxTreatment;
      split: AccountingGstComponentSplit;
      rulesUsed: AccountingRegulatoryTaxRule[];
      determinationNotes: string[];
    }
  | {
      ok: false;
      code: string;
      message: string;
      missing: string[];
    };

export function normalizeGstin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, "").toUpperCase();
  return v.length >= 15 ? v.slice(0, 15) : v.length >= 2 ? v : null;
}

export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  const normalized = normalizeGstin(gstin);
  if (!normalized || normalized.length < 2) return null;
  const code = normalized.slice(0, 2);
  return GSTIN_STATE_CODES[code] ? code : null;
}

export function stateLabelFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return GSTIN_STATE_CODES[code] ?? null;
}

function resolveState(
  gstin: string | null | undefined,
  stateCode: string | null | undefined,
  stateLabel: string | null | undefined,
): { code: string | null; label: string | null; source: string | null } {
  const fromGstin = stateCodeFromGstin(gstin);
  if (fromGstin) {
    return { code: fromGstin, label: stateLabelFromCode(fromGstin), source: "gstin" };
  }
  const code = stateCode?.trim().toUpperCase() || null;
  if (code && GSTIN_STATE_CODES[code]) {
    return { code, label: GSTIN_STATE_CODES[code], source: "state_code" };
  }
  if (stateLabel?.trim()) {
    const match = Object.entries(GSTIN_STATE_CODES).find(
      ([, label]) => label.toLowerCase() === stateLabel.trim().toLowerCase(),
    );
    if (match) {
      return { code: match[0], label: match[1], source: "state_label" };
    }
    return { code: null, label: stateLabel.trim(), source: "state_label_unmapped" };
  }
  return { code: null, label: null, source: null };
}

export function splitGstComponents(input: {
  taxableValue: number;
  gstRatePercent: number;
  taxTreatment: AccountingGstTaxTreatment;
  placeOfSupplyStateCode: string;
}): AccountingGstComponentSplit {
  const taxableValue = roundMoney2(input.taxableValue);
  const gstRatePercent = input.gstRatePercent;
  if (!Number.isFinite(gstRatePercent) || gstRatePercent < 0) {
    throw new Error("GST rate must be a non-negative number");
  }
  if (gstRatePercent % 1 !== 0 && roundMoney2(gstRatePercent * 2) !== gstRatePercent * 2) {
    // allow .5 rates; half-split must remain money-safe
  }
  const gstAmount = roundMoney2((taxableValue * gstRatePercent) / 100);
  const invoiceTotal = roundMoney2(taxableValue + gstAmount);
  const stateTaxLabel: "SGST" | "UTGST" = GST_UNION_TERRITORY_CODES.has(
    input.placeOfSupplyStateCode,
  )
    ? "UTGST"
    : "SGST";

  if (input.taxTreatment === "intra_state") {
    const half = roundMoney2(gstRatePercent / 2);
    const cgstAmount = roundMoney2((taxableValue * half) / 100);
    const sgstAmount = roundMoney2(gstAmount - cgstAmount);
    return {
      taxTreatment: "intra_state",
      gstRatePercent,
      cgstRatePercent: half,
      sgstRatePercent: half,
      igstRatePercent: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      gstAmount,
      invoiceTotal,
      stateTaxLabel,
    };
  }

  return {
    taxTreatment: "inter_state",
    gstRatePercent,
    cgstRatePercent: 0,
    sgstRatePercent: 0,
    igstRatePercent: gstRatePercent,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: gstAmount,
    gstAmount,
    invoiceTotal,
    stateTaxLabel,
  };
}

export function assertGstMutualExclusivity(split: AccountingGstComponentSplit): void {
  const hasIntra = split.cgstAmount > 0 || split.sgstAmount > 0;
  const hasInter = split.igstAmount > 0;
  if (hasIntra && hasInter) {
    throw new Error("Invalid GST split: CGST/SGST and IGST cannot apply together");
  }
  if (split.taxTreatment === "intra_state" && split.igstAmount !== 0) {
    throw new Error("Intra-state supply cannot include IGST");
  }
  if (split.taxTreatment === "inter_state" && (split.cgstAmount !== 0 || split.sgstAmount !== 0)) {
    throw new Error("Inter-state supply cannot include CGST or SGST");
  }
  if (
    roundMoney2(split.cgstAmount + split.sgstAmount + split.igstAmount) !== split.gstAmount
  ) {
    throw new Error("GST component amounts must equal total GST amount");
  }
}

/**
 * Determine Place of Supply and CGST+SGST vs IGST for an Accounting invoice.
 * Does not guess — returns ok:false when required facts are missing.
 */
export function determineAccountingGst(
  input: AccountingGstDeterminationInput,
): AccountingGstDeterminationResult {
  const missing: string[] = [];
  const notes: string[] = [];

  if (!Number.isFinite(input.taxableValue) || input.taxableValue <= 0) {
    return {
      ok: false,
      code: "TAXABLE_VALUE_INVALID",
      message: "Taxable value must be greater than 0 before GST determination.",
      missing: ["taxableValue"],
    };
  }

  const selected = input.selectedGstRatePercent;
  if (!Number.isFinite(selected) || selected < 0) {
    return {
      ok: false,
      code: "GST_RATE_INVALID",
      message: "An approved GST rate must be selected from GST Rate Master.",
      missing: ["selectedGstRatePercent"],
    };
  }

  if (selected !== ACCOUNTING_GST_DEFAULT_RATE_PERCENT) {
    return {
      ok: false,
      code: "GST_RATE_NOT_CONFIGURED",
      message: `Selected GST rate ${selected}% does not match the active Accounting regulatory default (${ACCOUNTING_GST_DEFAULT_RATE_PERCENT}%). Ask ADMIN to resolve GST Rate Master / regulatory configuration before raising the invoice.`,
      missing: ["gstRateAlignment"],
    };
  }

  const supplier = resolveState(
    input.supplierGstin,
    input.supplierStateCode,
    input.supplierStateLabel,
  );
  if (!supplier.code) {
    missing.push("supplierState (from supplier GSTIN / organization profile)");
  }

  const recipientRegistered =
    input.recipientGstRegistered === true ||
    Boolean(normalizeGstin(input.recipientGstin));

  const recipient = resolveState(
    input.recipientGstin,
    input.recipientStateCode,
    input.recipientStateLabel,
  );

  let posCode = input.placeOfSupplyStateCode?.trim().toUpperCase() || null;
  let posLabel = input.placeOfSupplyStateLabel?.trim() || null;
  let posRule = ACCOUNTING_GST_POS_RULE_B2B_SERVICES;

  if (posCode && GSTIN_STATE_CODES[posCode]) {
    posLabel = GSTIN_STATE_CODES[posCode];
    notes.push("Place of Supply taken from explicit field.");
  } else if (input.supplyKind === "financial_services") {
    posRule = ACCOUNTING_GST_POS_RULE_FINANCIAL_SERVICES;
    if (recipient.code) {
      posCode = recipient.code;
      posLabel = recipient.label;
      notes.push(
        "Place of Supply = recipient location on supplier records (IGST Act s.12(12)).",
      );
    } else {
      missing.push("recipientState (Invoice Party GSTIN / state) for financial services POS");
    }
  } else if (recipientRegistered) {
    posRule = ACCOUNTING_GST_POS_RULE_B2B_SERVICES;
    if (recipient.code) {
      posCode = recipient.code;
      posLabel = recipient.label;
      notes.push(
        "Place of Supply = location of registered recipient (IGST Act s.12(2)(a)).",
      );
    } else {
      missing.push("recipientState (Invoice Party GSTIN / state) for registered recipient POS");
    }
  } else if (recipient.code) {
    posCode = recipient.code;
    posLabel = recipient.label;
    notes.push(
      "Place of Supply = recipient address on record (IGST Act s.12(2)(b)(i)).",
    );
  } else if (supplier.code) {
    posCode = supplier.code;
    posLabel = supplier.label;
    notes.push(
      "Place of Supply fell back to supplier location (IGST Act s.12(2)(b)(ii)) because recipient address was not on record.",
    );
  } else {
    missing.push("placeOfSupply");
  }

  if (missing.length) {
    return {
      ok: false,
      code: "GST_DETERMINATION_INCOMPLETE",
      message: `Cannot determine GST treatment. Missing: ${missing.join("; ")}. Do not guess — resolve master data / Place of Supply.`,
      missing,
    };
  }

  const taxTreatment: AccountingGstTaxTreatment =
    supplier.code === posCode ? "intra_state" : "inter_state";
  const treatmentRule =
    taxTreatment === "intra_state"
      ? ACCOUNTING_GST_INTRA_STATE_RULE
      : ACCOUNTING_GST_INTER_STATE_RULE;

  let split: AccountingGstComponentSplit;
  try {
    split = splitGstComponents({
      taxableValue: input.taxableValue,
      gstRatePercent: selected,
      taxTreatment,
      placeOfSupplyStateCode: posCode!,
    });
    assertGstMutualExclusivity(split);
  } catch (err) {
    return {
      ok: false,
      code: "GST_SPLIT_INVALID",
      message: err instanceof Error ? err.message : "Invalid GST split",
      missing: ["gstSplit"],
    };
  }

  return {
    ok: true,
    placeOfSupplyStateCode: posCode!,
    placeOfSupplyStateLabel: posLabel || stateLabelFromCode(posCode) || posCode!,
    supplierStateCode: supplier.code!,
    supplierStateLabel: supplier.label || stateLabelFromCode(supplier.code) || supplier.code!,
    recipientStateCode: recipient.code,
    recipientStateLabel: recipient.label,
    taxTreatment,
    split,
    rulesUsed: [ACCOUNTING_GST_RATE_RULE_18, posRule, treatmentRule],
    determinationNotes: notes,
  };
}

export type AccountingTaxDeterminationSnapshot = {
  version: "CO-ACCOUNTING-INVOICE-OPERATIONS-015-V1";
  determinedAt: string;
  placeOfSupplyStateCode: string;
  placeOfSupplyStateLabel: string;
  supplierStateCode: string;
  supplierStateLabel: string;
  supplierGstin: string | null;
  recipientStateCode: string | null;
  recipientStateLabel: string | null;
  recipientGstin: string | null;
  taxTreatment: AccountingGstTaxTreatment;
  gstRatePercent: number;
  cgstRatePercent: number;
  sgstRatePercent: number;
  igstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  taxableValue: number;
  invoiceTotal: number;
  stateTaxLabel: "SGST" | "UTGST";
  rulesUsed: Array<{
    ruleId: string;
    sourceAuthority: string;
    sourceReference: string;
    sourceTitle: string;
    sourceUrl: string;
    effectiveFrom: string;
    lastVerifiedAt: string;
  }>;
  determinationNotes: string[];
};

export function toTaxDeterminationSnapshot(
  result: Extract<AccountingGstDeterminationResult, { ok: true }>,
  meta: {
    taxableValue: number;
    supplierGstin: string | null;
    recipientGstin: string | null;
    determinedAt?: string;
  },
): AccountingTaxDeterminationSnapshot {
  return {
    version: "CO-ACCOUNTING-INVOICE-OPERATIONS-015-V1",
    determinedAt: meta.determinedAt ?? new Date().toISOString(),
    placeOfSupplyStateCode: result.placeOfSupplyStateCode,
    placeOfSupplyStateLabel: result.placeOfSupplyStateLabel,
    supplierStateCode: result.supplierStateCode,
    supplierStateLabel: result.supplierStateLabel,
    supplierGstin: meta.supplierGstin,
    recipientStateCode: result.recipientStateCode,
    recipientStateLabel: result.recipientStateLabel,
    recipientGstin: meta.recipientGstin,
    taxTreatment: result.taxTreatment,
    gstRatePercent: result.split.gstRatePercent,
    cgstRatePercent: result.split.cgstRatePercent,
    sgstRatePercent: result.split.sgstRatePercent,
    igstRatePercent: result.split.igstRatePercent,
    cgstAmount: result.split.cgstAmount,
    sgstAmount: result.split.sgstAmount,
    igstAmount: result.split.igstAmount,
    gstAmount: result.split.gstAmount,
    taxableValue: roundMoney2(meta.taxableValue),
    invoiceTotal: result.split.invoiceTotal,
    stateTaxLabel: result.split.stateTaxLabel,
    rulesUsed: result.rulesUsed.map((r) => ({
      ruleId: r.ruleId,
      sourceAuthority: r.sourceAuthority,
      sourceReference: r.sourceReference,
      sourceTitle: r.sourceTitle,
      sourceUrl: r.sourceUrl,
      effectiveFrom: r.effectiveFrom,
      lastVerifiedAt: r.lastVerifiedAt,
    })),
    determinationNotes: result.determinationNotes,
  };
}
