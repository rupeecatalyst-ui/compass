/**
 * CO-MARKETING-MKT-01 / MKT-09 — Foundation service (status).
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_ENGINE_NAME,
  ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED,
  ENTERPRISE_MARKETING_HANDOFF_ENABLED,
  ENTERPRISE_MARKETING_HANDOFF_MODE,
  ENTERPRISE_MARKETING_MODULE_ID,
  ENTERPRISE_MARKETING_MODULE_TITLE,
  ENTERPRISE_MARKETING_SAFETY,
  ENTERPRISE_MARKETING_SHEETS_MODE,
  ENTERPRISE_MARKETING_SHEETS_READ_ENABLED,
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_PORT_NAMES } from "@/lib/enterprise-marketing-engine/ports";
import type { EnterpriseMarketingFoundationStatus } from "@/types/enterprise-marketing-engine";
import { recordMarketingAuditEvent } from "./audit";

const ISOLATED_FROM = [
  "Contacts / ECM operational workflows",
  "Customers",
  "Opportunities",
  "Deals",
  "Accounting",
  "Lender Pipeline",
  "Documents / Document Registry",
  "Wealth Partner operational workflows",
  "Partner Marketing desk",
  "Public website marketing UI",
  "Enterprise Communication Center operational send paths",
] as const;

export const enterpriseMarketingFoundationService = {
  getStatus(actor?: {
    userId?: string;
    organizationId?: string | null;
  }): EnterpriseMarketingFoundationStatus {
    recordMarketingAuditEvent({
      kind: "module.status.viewed",
      actorUserId: actor?.userId ?? null,
      organizationId: actor?.organizationId ?? null,
    });

    return {
      moduleId: ENTERPRISE_MARKETING_MODULE_ID,
      title: ENTERPRISE_MARKETING_MODULE_TITLE,
      engineName: ENTERPRISE_MARKETING_ENGINE_NAME,
      sprint: "CO-MARKETING-ACTIVATION-002",
      safety: {
        executionEnabled: false,
        executionDryRunEnabled: ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED,
        handoffEnabled: ENTERPRISE_MARKETING_HANDOFF_ENABLED,
        handoffMode: ENTERPRISE_MARKETING_HANDOFF_MODE,
        audienceImportEnabled: false,
        providerConnectEnabled: false,
        sheetsMode: ENTERPRISE_MARKETING_SHEETS_MODE,
        sheetsReadEnabled: ENTERPRISE_MARKETING_SHEETS_READ_ENABLED,
        emailMode: ENTERPRISE_MARKETING_EMAIL_MODE,
        whatsappMode: ENTERPRISE_MARKETING_WHATSAPP_MODE,
        notice: ENTERPRISE_MARKETING_SAFETY.notice,
      },
      capabilities: {
        campaignExecution: ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED
          ? "dry_run_foundation"
          : "disabled",
        campaignBuilder: "authoring_preview",
        campaignLifecycle: "governance",
        assetLibrary: "foundation",
        dataSourceConnect: ENTERPRISE_MARKETING_SHEETS_READ_ENABLED ? "read_only" : "disabled",
        sheetsAdapter: ENTERPRISE_MARKETING_SHEETS_MODE,
        audienceEngine: ENTERPRISE_MARKETING_SHEETS_READ_ENABLED
          ? "definition_preview"
          : "disabled",
        emailSend:
          ENTERPRISE_MARKETING_EMAIL_MODE === "dry_run" ? "dry_run_foundation" : "disabled",
        whatsappSend:
          ENTERPRISE_MARKETING_WHATSAPP_MODE === "dry_run" ? "dry_run_foundation" : "disabled",
        campaignAnalytics: "engagement_events",
        digitalLaunch: "disabled",
        audienceImport: "disabled",
        contactCreate: "handoff_only",
        opportunityCreate: "handoff_only",
        operationalHandoff: "qualified_only",
        routing: "configurable",
        internalNotification: "ene_assignee",
      },
      boundaries: {
        isolatedFrom: [...ISOLATED_FROM],
        futureHandoff:
          "Marketing → Qualified Response → Existing Contact (ECM) → Dialogue Opportunity (no Lead entity)",
        noLeadEntity: true,
      },
      ports: [...MARKETING_PORT_NAMES],
      permissions: Object.values(MARKETING_PERMISSIONS),
    };
  },
};
