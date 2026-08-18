import {
  ACCOUNTING_INVOICE_BLOCKED_FAMILIES,
  ACCOUNTING_INVOICE_PREFIX,
  type AccountingInvoiceProductFamily,
} from "@/constants/enterprise-accounting-invoice";

export function resolveInvoiceProductPrefix(productFamily: string | null | undefined): string {
  const family = (productFamily ?? "").trim();
  if (family === "lending" || family === "mutual_fund") {
    return ACCOUNTING_INVOICE_PREFIX[family as AccountingInvoiceProductFamily];
  }
  if ((ACCOUNTING_INVOICE_BLOCKED_FAMILIES as readonly string[]).includes(family)) {
    throw Object.assign(
      new Error(
        `Raise Invoice is blocked for product family "${family}". Only lending (LN) and mutual_fund (MF) are authorized in Phase 1.`,
      ),
      { statusCode: 409, code: "INVOICE_PRODUCT_FAMILY_BLOCKED" },
    );
  }
  throw Object.assign(
    new Error("Deal product family is missing or not authorized for invoice numbering"),
    { statusCode: 409, code: "INVOICE_PRODUCT_FAMILY_BLOCKED" },
  );
}
