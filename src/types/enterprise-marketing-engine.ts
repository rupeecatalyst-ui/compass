/**
 * CO-MARKETING-MKT-01 / MKT-02 / MKT-03 — Enterprise Marketing Engine domain types.
 * No Prisma audience / prospect mirror models.
 */

import type {
  MarketingCampaignStatus,
  MarketingChannel,
} from "@/constants/enterprise-marketing-engine";

/** Module foundation status returned by admin API. */
export type EnterpriseMarketingFoundationStatus = {
  moduleId: "enterprise-marketing-engine";
  title: string;
  engineName: string;
  sprint: "CO-MARKETING-MKT-01" | "CO-MARKETING-MKT-02" | "CO-MARKETING-MKT-03" | "CO-MARKETING-MKT-04" | "CO-MARKETING-MKT-05" | "CO-MARKETING-MKT-06" | "CO-MARKETING-MKT-07" | "CO-MARKETING-MKT-08" | "CO-MARKETING-MKT-09" | "CO-MARKETING-MKT-10" | "CO-MARKETING-MKT-11" | "CO-MARKETING-MKT-12" | "CO-MARKETING-MKT-13" | "CO-MARKETING-ACTIVATION-002";
  safety: {
    executionEnabled: false;
    executionDryRunEnabled?: boolean;
    handoffEnabled: boolean;
    handoffMode?: "fixture" | "live";
    audienceImportEnabled: false;
    providerConnectEnabled: false;
    sheetsMode: "off" | "fixture" | "live";
    sheetsReadEnabled: boolean;
    emailMode?: "off" | "dry_run" | "live";
    whatsappMode?: "off" | "dry_run" | "live";
    notice: string;
  };
  capabilities: {
    campaignExecution: "disabled" | "dry_run_foundation";
    campaignBuilder?: "authoring_preview";
    campaignLifecycle?: "governance";
    assetLibrary?: "foundation";
    dataSourceConnect: "disabled" | "read_only";
    sheetsAdapter: "off" | "fixture" | "live";
    audienceEngine: "disabled" | "definition_preview";
    emailSend: "disabled" | "dry_run_foundation";
    whatsappSend: "disabled" | "dry_run_foundation";
    campaignAnalytics?: "engagement_events";
    digitalLaunch: "disabled";
    audienceImport: "disabled";
    contactCreate: "disabled" | "handoff_only";
    opportunityCreate: "disabled" | "handoff_only";
    operationalHandoff: "disabled" | "qualified_only";
    routing?: "configurable";
    internalNotification?: "ene_assignee";
  };
  boundaries: {
    isolatedFrom: string[];
    futureHandoff: string;
    noLeadEntity: true;
  };
  ports: string[];
  permissions: string[];
};

/** Logical campaign shell — not persisted yet. */
export type MarketingCampaignShell = {
  id: string;
  organizationId: string;
  name: string;
  status: MarketingCampaignStatus;
  channel: MarketingChannel;
  objective?: string | null;
};

/**
 * Frozen handoff contract — Marketing → Qualified Response → ECM Contact → Opportunity.
 * No Lead entity.
 */
export type MarketingOperationalHandoffContract = {
  qualificationId: string;
  organizationId: string;
  recipientFingerprint: string;
  marketingCampaignId: string;
  assigneeUserId: string;
  contactId?: string;
  opportunityId?: string;
};

export type MarketingAuditEventKind =
  | "module.status.viewed"
  | "foundation.safety.blocked"
  | "navigation.opened"
  | "data_source.list"
  | "data_source.upsert"
  | "data_source.discover"
  | "data_source.preview"
  | "audience.list"
  | "audience.upsert"
  | "audience.delete"
  | "audience.preview"
  | "campaign.create"
  | "campaign.save"
  | "campaign.clone"
  | "campaign.save_template"
  | "campaign.preview"
  | "campaign.transition"
  | "campaign.submit_for_review"
  | "campaign.approve"
  | "campaign.schedule"
  | "campaign.run"
  | "campaign.pause"
  | "campaign.resume"
  | "campaign.stop"
  | "campaign.complete"
  | "campaign.cancel"
  | "asset.upload"
  | "asset.archive"
  | "execution.configure"
  | "execution.batch.dry_run"
  | "email.sender_identity.upsert"
  | "email.delivery.dry_run"
  | "whatsapp.template.upsert"
  | "whatsapp.delivery.dry_run"
  | "analytics.dashboard.viewed"
  | "analytics.engagement.listed"
  | "analytics.execution.drilldown"
  | "qualification.ingested"
  | "qualification.state_changed"
  | "qualification.handoff.complete"
  | "qualification.handoff.failed"
  | "qualification.notification.recorded"
  | "qualification.notification.failed";

export type MarketingAuditEvent = {
  id: string;
  kind: MarketingAuditEventKind;
  organizationId?: string | null;
  actorUserId?: string | null;
  at: string;
  detail?: Record<string, unknown>;
};
