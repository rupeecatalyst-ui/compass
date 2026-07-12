/**
 * EDIE document rule registry — SPR-001 extension.
 */

import type { EdieDocumentRule } from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";

export function registerEdieDocumentRule(
  input: Omit<EdieDocumentRule, "id" | "createdOn">,
): EdieDocumentRule {
  const rule: EdieDocumentRule = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEdiePorts().documentRules.save(rule);
  recordEdieAudit({
    entityId: rule.id,
    entityType: "document_rule",
    action: "created",
    actorId: input.createdBy,
    remarks: `EDIE document rule ${rule.ruleCode}`,
  });
  return rule;
}

export function listEdieDocumentRules(): EdieDocumentRule[] {
  return getEdiePorts().documentRules.list();
}

export function resolveEdieDocumentRulesForContext(context: {
  productRef: string;
  employmentType?: string;
  constitution?: string;
  customerCategory?: string;
  loanStage?: string;
}): EdieDocumentRule[] {
  return getEdiePorts()
    .documentRules.list()
    .filter((rule) => {
      if (!rule.enabled) return false;
      if (rule.productRef !== context.productRef) return false;
      if (rule.employmentType && rule.employmentType !== context.employmentType) return false;
      if (rule.constitution && rule.constitution !== context.constitution) return false;
      if (rule.customerCategory && rule.customerCategory !== context.customerCategory) return false;
      if (rule.loanStage && rule.loanStage !== context.loanStage) return false;
      return true;
    });
}
