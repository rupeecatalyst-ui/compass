/**
 * EDIE reusable document modules — composition via inheritance, no duplication.
 */

import {
  EDIE_ADDRESS_PROOF_CHOICES,
  EDIE_ADDRESS_PROOF_GROUP,
  EDIE_CATALOG,
  EDIE_MODULE_LABELS,
} from "@/constants/edie-certified/document-catalog";
import { EDIE_PROPERTY_PRODUCTS } from "@/constants/edie-certified/product-families";
import type {
  EdieChecklistItem,
  EdieCustomerCategory,
  EdieDocumentModuleId,
  EdieProductRef,
  EdieTransactionType,
  EdieUploadMode,
  EdieWorkflowStage,
} from "@/types/edie-certified-rules";

const STAGE_ORDER: EdieWorkflowStage[] = [
  "pre_login",
  "before_lender_login",
  "soft_approval",
  "final_approval",
  "disbursement",
  "accounting",
  "closure",
];

export function stageReached(current: EdieWorkflowStage, target: EdieWorkflowStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target);
}

function itemFromCatalog(
  typeRef: string,
  overrides: Partial<EdieChecklistItem> & {
    uploadMode?: EdieUploadMode;
    criticalFromStage?: EdieWorkflowStage;
  } = {},
): EdieChecklistItem {
  const cat = EDIE_CATALOG[typeRef];
  if (!cat) {
    return {
      typeRef,
      label: typeRef.replace(/^doc:/, ""),
      moduleId: "customer_kyc",
      moduleLabel: EDIE_MODULE_LABELS.customer_kyc,
      severity: "required",
      mandatory: false,
      critical: false,
      optional: true,
      uploadMode: overrides.uploadMode ?? "individual",
      weight: 5,
      complete: false,
      ...overrides,
    };
  }
  const optional = Boolean(cat.optional || overrides.optional);
  const severity = overrides.severity ?? cat.defaultSeverity;
  return {
    typeRef: cat.typeRef,
    label: cat.label,
    moduleId: cat.moduleId,
    moduleLabel: EDIE_MODULE_LABELS[cat.moduleId],
    severity,
    mandatory: !optional && (severity === "mandatory" || severity === "critical"),
    critical: severity === "critical",
    optional,
    uploadMode: overrides.uploadMode ?? "individual",
    folderId: overrides.folderId,
    folderLabel: overrides.folderLabel,
    weight: cat.weight,
    criticalFromStage: overrides.criticalFromStage,
    complete: false,
    choiceGroupId: overrides.choiceGroupId,
  };
}

/** Apply stage overlay — elevate to Critical when stage reached. */
export function applyStageSeverity(
  item: EdieChecklistItem,
  stage: EdieWorkflowStage,
): EdieChecklistItem {
  if (!item.criticalFromStage) return item;
  if (!stageReached(stage, item.criticalFromStage)) {
    return {
      ...item,
      severity: item.optional ? "required" : "mandatory",
      mandatory: !item.optional,
      critical: false,
    };
  }
  return {
    ...item,
    severity: "critical",
    mandatory: true,
    critical: true,
  };
}

export function moduleCustomerKyc(): EdieChecklistItem[] {
  return [
    itemFromCatalog("doc:pan"),
    itemFromCatalog("doc:aadhaar"),
    itemFromCatalog("doc:passport"),
    itemFromCatalog("doc:driving-licence"),
    itemFromCatalog("doc:voter-id"),
    itemFromCatalog("doc:photograph"),
    itemFromCatalog("doc:signature"),
  ];
}

/** One address proof required — choice group. */
export function moduleAddressProof(selected?: string): EdieChecklistItem[] {
  const choice = selected && EDIE_ADDRESS_PROOF_CHOICES.includes(selected as (typeof EDIE_ADDRESS_PROOF_CHOICES)[number])
    ? selected
    : "doc:address-electricity";
  return EDIE_ADDRESS_PROOF_CHOICES.map((ref) =>
    itemFromCatalog(ref, {
      uploadMode: "choice_one",
      choiceGroupId: EDIE_ADDRESS_PROOF_GROUP,
      optional: ref !== choice,
      severity: ref === choice ? "mandatory" : "required",
    }),
  );
}

export function moduleBusinessConstitution(constitution?: string): EdieChecklistItem[] {
  const c = (constitution || "").toLowerCase();
  if (c.includes("proprietor") || c.includes("sole")) {
    return [itemFromCatalog("doc:shop-act")];
  }
  if (c.includes("partner") && !c.includes("llp")) {
    return [itemFromCatalog("doc:partnership-deed"), itemFromCatalog("doc:shop-act")];
  }
  if (c.includes("llp")) {
    return [itemFromCatalog("doc:llp-agreement"), itemFromCatalog("doc:coi")];
  }
  if (c.includes("private") || c.includes("pvt") || c.includes("limited") || c.includes("company")) {
    return [
      itemFromCatalog("doc:coi"),
      itemFromCatalog("doc:moa"),
      itemFromCatalog("doc:board-resolution"),
    ];
  }
  // Generic self-employed fallback
  return [itemFromCatalog("doc:shop-act")];
}

export function moduleFinancial(category: EdieCustomerCategory): EdieChecklistItem[] {
  if (category === "salaried") {
    return [
      itemFromCatalog("doc:salary-slip", {
        criticalFromStage: "before_lender_login",
      }),
      itemFromCatalog("doc:form-16"),
    ];
  }
  // Self employed / company — single folder, not individual ITR/GST/BS
  return [
    itemFromCatalog("doc:financial-folder", {
      uploadMode: "folder",
      folderId: "folder:financial",
      folderLabel: "Financial Documents Folder",
      severity: "mandatory",
      criticalFromStage: "before_lender_login",
    }),
  ];
}

export function moduleBanking(): EdieChecklistItem[] {
  return [
    itemFromCatalog("doc:bank-statement"),
    itemFromCatalog("doc:other-bank-statement"),
  ];
}

/** Property folder — only Home Loan / HL-BT / LAP; active after soft approval. */
export function moduleProperty(
  productRef: EdieProductRef,
  stage: EdieWorkflowStage,
): EdieChecklistItem[] {
  if (!EDIE_PROPERTY_PRODUCTS.has(productRef)) return [];
  if (!stageReached(stage, "soft_approval")) return [];
  return [
    itemFromCatalog("doc:property-folder", {
      uploadMode: "folder",
      folderId: "folder:property",
      folderLabel: "Property Documents Folder",
      severity: "mandatory",
      criticalFromStage: "soft_approval",
    }),
  ];
}

/**
 * Family 2 — Asset / Security based (LAS, Gold).
 * Minimal pack: PAN, Aadhaar, Primary Bank; optional ITR + Address Proof.
 * No Financial Folder, Property Folder, or Business Constitution.
 */
export function moduleAssetSecurityMinimal(selectedAddress?: string): EdieChecklistItem[] {
  return [
    itemFromCatalog("doc:pan"),
    itemFromCatalog("doc:aadhaar"),
    itemFromCatalog("doc:bank-statement"),
    itemFromCatalog("doc:itr-optional"),
    ...moduleAddressProof(selectedAddress).map((i) => ({
      ...i,
      // Address is optional for asset/security products
      optional: true,
      mandatory: false,
      severity: "required" as const,
      critical: false,
    })),
  ];
}

export function moduleExistingLoan(
  transactionType: EdieTransactionType,
  productRef: EdieProductRef,
): EdieChecklistItem[] {
  const isBt =
    transactionType === "balance_transfer" || productRef === "product:home-loan-bt";
  if (!isBt) return [];
  return [
    itemFromCatalog("doc:bt-sanction-letter", {
      criticalFromStage: "before_lender_login",
    }),
    itemFromCatalog("doc:bt-loan-statement", {
      criticalFromStage: "soft_approval",
    }),
    itemFromCatalog("doc:bt-foreclosure", {
      criticalFromStage: "soft_approval",
    }),
    itemFromCatalog("doc:bt-rtr", {
      criticalFromStage: "soft_approval",
    }),
  ];
}

export function groupItemsByModule(items: EdieChecklistItem[]): {
  id: EdieDocumentModuleId;
  label: string;
  items: EdieChecklistItem[];
}[] {
  const order: EdieDocumentModuleId[] = [
    "customer_kyc",
    "address_proof",
    "business_constitution",
    "financial",
    "banking",
    "property",
    "existing_loan",
  ];
  return order
    .map((id) => ({
      id,
      label: EDIE_MODULE_LABELS[id],
      items: items.filter((i) => i.moduleId === id),
    }))
    .filter((m) => m.items.length > 0);
}
