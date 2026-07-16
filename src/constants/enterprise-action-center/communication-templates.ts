/**
 * Communication Template Registry (presentation catalog).
 * Filtered by recipient type, product, and workflow stage — not a flat list.
 */

import type {
  CommunicationRecipientType,
  CommunicationTemplateDef,
} from "@/types/enterprise-action-center";

export const COMMUNICATION_TEMPLATE_REGISTRY: CommunicationTemplateDef[] = [
  {
    id: "tpl-email-customer-docs",
    code: "EMAIL_CUST_DOCS",
    name: "Document request — Customer",
    channel: "email",
    recipientTypes: ["customer", "co_applicant"],
    subject: "Documents required for your loan application — {{product}}",
    body: "Dear {{name}},\n\nThank you for choosing Rupee Catalyst.\n\nTo proceed with your {{product}} application ({{fileNumber}}), please share the pending documents at your earliest convenience.\n\nOur team is available if you need any assistance.\n\nWarm regards,\n{{rm}}\nRupee Catalyst",
    recommended: true,
  },
  {
    id: "tpl-email-customer-status",
    code: "EMAIL_CUST_STATUS",
    name: "Application status update — Customer",
    channel: "email",
    recipientTypes: ["customer"],
    subject: "Update on your {{product}} application",
    body: "Dear {{name}},\n\nYour {{product}} application ({{fileNumber}}) is currently at stage: {{stage}}.\n\nWe will keep you informed of the next steps.\n\nRegards,\n{{rm}}",
  },
  {
    id: "tpl-email-guarantor",
    code: "EMAIL_GUARANTOR",
    name: "Guarantor documentation request",
    channel: "email",
    recipientTypes: ["guarantor"],
    subject: "Guarantor documents required — {{fileNumber}}",
    body: "Dear {{name}},\n\nYou are listed as a guarantor for {{customerName}}'s {{product}} application.\n\nPlease share the required KYC and income documents so we can continue processing.\n\nRegards,\n{{rm}}",
    recommended: true,
  },
  {
    id: "tpl-email-partner",
    code: "EMAIL_PARTNER",
    name: "Partner case update",
    channel: "email",
    recipientTypes: ["wealth_partner"],
    subject: "Case update — {{fileNumber}} · {{customerName}}",
    body: "Dear Partner,\n\nUpdate on referred case {{fileNumber}} ({{customerName}} · {{product}}):\nCurrent stage: {{stage}}.\n\nPlease connect with {{rm}} for any follow-up.\n\nRupee Catalyst Partner Desk",
    recommended: true,
  },
  {
    id: "tpl-email-lender",
    code: "EMAIL_LENDER",
    name: "Lender pack / follow-up",
    channel: "email",
    recipientTypes: ["lender_representative"],
    subject: "Loan file {{fileNumber}} — {{customerName}} · {{product}}",
    body: "Dear {{name}},\n\nPlease find context for loan file {{fileNumber}}.\nCustomer: {{customerName}}\nProduct: {{product}}\nStage: {{stage}}\n\nWe look forward to your guidance.\n\n{{rm}}\nRupee Catalyst",
    recommended: true,
  },
  {
    id: "tpl-email-rm",
    code: "EMAIL_RM_INTERNAL",
    name: "Internal note to RM / Hybrid Employee",
    channel: "email",
    recipientTypes: ["relationship_manager", "hybrid_employee"],
    subject: "Action required — {{fileNumber}}",
    body: "Hi {{name}},\n\nPlease review loan file {{fileNumber}} ({{customerName}} · {{product}}) currently at {{stage}}.\n\nThanks",
  },
  {
    id: "tpl-wa-customer-docs",
    code: "WA_CUST_DOCS",
    name: "WhatsApp — Document reminder",
    channel: "whatsapp",
    recipientTypes: ["customer", "co_applicant"],
    body: "Hi {{name}}, this is {{rm}} from Rupee Catalyst. For your {{product}} application ({{fileNumber}}), a few documents are still pending. Please share them when convenient. Thank you!",
    recommended: true,
  },
  {
    id: "tpl-wa-customer-status",
    code: "WA_CUST_STATUS",
    name: "WhatsApp — Status update",
    channel: "whatsapp",
    recipientTypes: ["customer"],
    body: "Hi {{name}}, a quick update: your {{product}} application {{fileNumber}} is at {{stage}}. We will keep you posted. — {{rm}}, Rupee Catalyst",
  },
  {
    id: "tpl-wa-partner",
    code: "WA_PARTNER",
    name: "WhatsApp — Partner case ping",
    channel: "whatsapp",
    recipientTypes: ["wealth_partner"],
    body: "Hello Partner, update on {{customerName}} ({{fileNumber}} · {{product}}): stage {{stage}}. Reach {{rm}} for details.",
    recommended: true,
  },
  {
    id: "tpl-wa-lender",
    code: "WA_LENDER",
    name: "WhatsApp — Lender follow-up",
    channel: "whatsapp",
    recipientTypes: ["lender_representative"],
    body: "Hello {{name}}, following up on {{customerName}} / {{fileNumber}} ({{product}}), currently at {{stage}}. — {{rm}}, Rupee Catalyst",
    recommended: true,
  },
  {
    id: "tpl-wa-guarantor",
    code: "WA_GUARANTOR",
    name: "WhatsApp — Guarantor KYC",
    channel: "whatsapp",
    recipientTypes: ["guarantor"],
    body: "Hi {{name}}, you are listed as guarantor for {{customerName}}'s loan {{fileNumber}}. Please share KYC documents at your earliest. — {{rm}}",
  },
];

export function filterCommunicationTemplates(input: {
  channel: "email" | "whatsapp";
  recipientType: CommunicationRecipientType;
  product?: string;
  stage?: string;
}): CommunicationTemplateDef[] {
  const productKey = (input.product || "").toLowerCase();
  const stageKey = (input.stage || "").toLowerCase();

  return COMMUNICATION_TEMPLATE_REGISTRY.filter((t) => {
    if (t.channel !== input.channel) return false;
    if (!t.recipientTypes.includes(input.recipientType)) return false;
    if (t.products?.length && productKey) {
      const ok = t.products.some((p) => productKey.includes(p.toLowerCase()));
      if (!ok) return false;
    }
    if (t.stages?.length && stageKey) {
      const ok = t.stages.some((s) => stageKey.includes(s.toLowerCase()));
      if (!ok) return false;
    }
    return true;
  }).sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)));
}
