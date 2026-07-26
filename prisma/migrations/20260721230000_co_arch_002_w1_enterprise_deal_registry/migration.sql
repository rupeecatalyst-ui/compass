-- CreateEnum
CREATE TYPE "DealProductFamily" AS ENUM ('lending', 'mutual_fund', 'insurance', 'bonds', 'pms', 'other');

-- CreateEnum
CREATE TYPE "DealLifecycleStatus" AS ENUM ('active', 'on_hold', 'won', 'lost', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "DealOperationalStatus" AS ENUM ('on_track', 'at_risk', 'delayed', 'completed');

-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('urgent', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "DealCounterpartyType" AS ENUM ('lender', 'amc', 'insurer', 'issuer', 'institution', 'other');

-- CreateEnum
CREATE TYPE "DealParticipantRole" AS ENUM ('primary_customer', 'co_applicant', 'guarantor', 'nominee', 'authorized_signatory', 'other');

-- CreateEnum
CREATE TYPE "DealDocumentLinkStatus" AS ENUM ('required', 'requested', 'received', 'under_verification', 'verified', 'rejected', 'expired', 'waived');

-- CreateEnum
CREATE TYPE "DealAssignmentRole" AS ENUM ('primary_owner', 'relationship_manager', 'source_owner', 'credit_owner', 'operations', 'other');

-- CreateEnum
CREATE TYPE "DealImportBatchStatus" AS ENUM ('dry_run', 'pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "enterprise_deal_number_sequences" (
    "organization_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_deal_number_sequences_pkey" PRIMARY KEY ("organization_id","year")
);

-- CreateTable
CREATE TABLE "enterprise_deals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_number" TEXT NOT NULL,
    "legacy_loan_file_id" TEXT,
    "file_number" TEXT,
    "external_refs" JSONB,
    "product_id" TEXT,
    "product_code" TEXT,
    "product_label" TEXT,
    "product_category_id" TEXT,
    "product_group_id" TEXT,
    "product_family" "DealProductFamily" NOT NULL,
    "transaction_type" TEXT,
    "lifecycle_phase" TEXT,
    "gross_stage" TEXT NOT NULL,
    "sub_stage" TEXT,
    "lifecycle_status" "DealLifecycleStatus" NOT NULL DEFAULT 'active',
    "operational_status" "DealOperationalStatus" NOT NULL DEFAULT 'on_track',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "days_in_stage" INTEGER NOT NULL DEFAULT 0,
    "stage_entered_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "primary_owner_user_id" TEXT,
    "relationship_manager_user_id" TEXT,
    "relationship_manager_name" TEXT,
    "source_owner_user_id" TEXT,
    "credit_owner_user_id" TEXT,
    "team_id" TEXT,
    "branch_id" TEXT,
    "assignment_mode" TEXT,
    "primary_contact_id" TEXT,
    "primary_contact_name" TEXT,
    "primary_contact_mobile" TEXT,
    "primary_contact_email" TEXT,
    "company_id" TEXT,
    "employment_type_code" TEXT,
    "city_code" TEXT,
    "state_code" TEXT,
    "city_label" TEXT,
    "state_label" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'INR',
    "requested_amount" DECIMAL(18,2),
    "approved_amount" DECIMAL(18,2),
    "fulfilled_amount" DECIMAL(18,2),
    "commercial_terms" JSONB,
    "lending_extension" JSONB,
    "snapshot" JSONB,
    "primary_counterparty_type" "DealCounterpartyType",
    "primary_counterparty_id" TEXT,
    "primary_counterparty_name" TEXT,
    "primary_counterparty_program_id" TEXT,
    "expected_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "revenue_percent" DECIMAL(9,4),
    "revenue_received" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payout_configured" BOOLEAN NOT NULL DEFAULT false,
    "settlement_completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" "DealPriority" NOT NULL DEFAULT 'medium',
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "is_delayed" BOOLEAN NOT NULL DEFAULT false,
    "risk_band" TEXT,
    "source_code" TEXT,
    "source_contact_id" TEXT,
    "health_score" INTEGER,
    "health_band" TEXT,
    "health_computed_at" TIMESTAMP(3),
    "health_payload" JSONB,
    "import_batch_id" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_deal_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_participants" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "ecm_contact_id" TEXT NOT NULL,
    "role" "DealParticipantRole" NOT NULL,
    "is_property_owner" BOOLEAN NOT NULL DEFAULT false,
    "ownership_percent" DECIMAL(5,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_counterparty_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "counterparty_type" "DealCounterpartyType" NOT NULL,
    "counterparty_registry_id" TEXT NOT NULL,
    "program_id" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "pipeline_stage" TEXT,
    "pipeline_sub_stage" TEXT,
    "application_ref" TEXT,
    "decision" TEXT,
    "decision_at" TIMESTAMP(3),
    "extension" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_counterparty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_document_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "document_definition_id" TEXT,
    "document_type_id" TEXT,
    "participant_id" TEXT,
    "status" "DealDocumentLinkStatus" NOT NULL DEFAULT 'required',
    "storage_key" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "extension" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_document_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT,
    "due_at" TIMESTAMP(3),
    "assignee_user_id" TEXT,
    "sla_policy_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_activities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "activity_type" TEXT,
    "due_at" TIMESTAMP(3),
    "assignee_user_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_timeline_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "actor_user_id" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_deal_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "role" "DealAssignmentRole" NOT NULL,
    "user_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_commercial_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "change_reason" TEXT,
    "edl_entry_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_deal_commercial_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_commission_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "external_ref" TEXT,
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_commission_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_accounting_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "external_ref" TEXT,
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_accounting_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_notification_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "external_ref" TEXT,
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_notification_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_intelligence_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "external_ref" TEXT,
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_intelligence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_workflow_bindings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "external_ref" TEXT,
    "payload" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,

    CONSTRAINT "enterprise_deal_workflow_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_import_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "DealImportBatchStatus" NOT NULL DEFAULT 'pending',
    "checksum" TEXT,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_report" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "enterprise_deal_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "edeal_org_list_idx" ON "enterprise_deals"("organization_id", "is_deleted", "archived", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "edeal_org_contact_idx" ON "enterprise_deals"("organization_id", "primary_contact_id");

-- CreateIndex
CREATE INDEX "edeal_org_family_stage_idx" ON "enterprise_deals"("organization_id", "product_family", "gross_stage");

-- CreateIndex
CREATE INDEX "edeal_org_rm_idx" ON "enterprise_deals"("organization_id", "relationship_manager_user_id");

-- CreateIndex
CREATE INDEX "edeal_org_status_idx" ON "enterprise_deals"("organization_id", "lifecycle_status", "operational_status");

-- CreateIndex
CREATE INDEX "edeal_org_product_idx" ON "enterprise_deals"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "edeal_org_import_idx" ON "enterprise_deals"("organization_id", "import_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "edeal_org_number_key" ON "enterprise_deals"("organization_id", "deal_number");

-- CreateIndex
CREATE UNIQUE INDEX "edeal_org_legacy_loan_file_key" ON "enterprise_deals"("organization_id", "legacy_loan_file_id");

-- CreateIndex
CREATE INDEX "edeal_snap_deal_created_idx" ON "enterprise_deal_snapshots"("deal_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "edeal_snap_deal_ver_key" ON "enterprise_deal_snapshots"("deal_id", "version_number");

-- CreateIndex
CREATE INDEX "edeal_part_org_contact_idx" ON "enterprise_deal_participants"("organization_id", "ecm_contact_id");

-- CreateIndex
CREATE INDEX "edeal_part_deal_deleted_idx" ON "enterprise_deal_participants"("deal_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "edeal_part_deal_contact_role_key" ON "enterprise_deal_participants"("deal_id", "ecm_contact_id", "role");

-- CreateIndex
CREATE INDEX "edeal_cp_deal_primary_idx" ON "enterprise_deal_counterparty_assignments"("deal_id", "is_primary");

-- CreateIndex
CREATE INDEX "edeal_cp_org_type_reg_idx" ON "enterprise_deal_counterparty_assignments"("organization_id", "counterparty_type", "counterparty_registry_id");

-- CreateIndex
CREATE INDEX "edeal_cp_deal_deleted_idx" ON "enterprise_deal_counterparty_assignments"("deal_id", "is_deleted");

-- CreateIndex
CREATE INDEX "edeal_doc_deal_status_idx" ON "enterprise_deal_document_links"("deal_id", "status");

-- CreateIndex
CREATE INDEX "edeal_doc_org_def_idx" ON "enterprise_deal_document_links"("organization_id", "document_definition_id");

-- CreateIndex
CREATE INDEX "edeal_task_deal_status_due_idx" ON "enterprise_deal_tasks"("deal_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "edeal_act_deal_status_due_idx" ON "enterprise_deal_activities"("deal_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "edeal_note_deal_created_idx" ON "enterprise_deal_notes"("deal_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "edeal_tl_deal_occurred_idx" ON "enterprise_deal_timeline_events"("deal_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "edeal_tl_org_type_occurred_idx" ON "enterprise_deal_timeline_events"("organization_id", "event_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "edeal_asg_deal_role_idx" ON "enterprise_deal_assignments"("deal_id", "role", "is_deleted");

-- CreateIndex
CREATE INDEX "edeal_comm_deal_created_idx" ON "enterprise_deal_commercial_versions"("deal_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "edeal_comm_deal_ver_key" ON "enterprise_deal_commercial_versions"("deal_id", "version_number");

-- CreateIndex
CREATE INDEX "edeal_cml_deal_type_idx" ON "enterprise_deal_commission_links"("deal_id", "link_type");

-- CreateIndex
CREATE INDEX "edeal_acl_deal_type_idx" ON "enterprise_deal_accounting_links"("deal_id", "link_type");

-- CreateIndex
CREATE INDEX "edeal_ntl_deal_type_idx" ON "enterprise_deal_notification_links"("deal_id", "link_type");

-- CreateIndex
CREATE INDEX "edeal_intl_deal_type_idx" ON "enterprise_deal_intelligence_links"("deal_id", "link_type");

-- CreateIndex
CREATE INDEX "edeal_wf_deal_type_idx" ON "enterprise_deal_workflow_bindings"("deal_id", "link_type");

-- CreateIndex
CREATE INDEX "edeal_imp_org_created_idx" ON "enterprise_deal_import_batches"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "enterprise_deal_number_sequences" ADD CONSTRAINT "enterprise_deal_number_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ecm_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "enterprise_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "enterprise_deal_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_snapshots" ADD CONSTRAINT "enterprise_deal_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_snapshots" ADD CONSTRAINT "enterprise_deal_snapshots_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_participants" ADD CONSTRAINT "enterprise_deal_participants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_participants" ADD CONSTRAINT "enterprise_deal_participants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_participants" ADD CONSTRAINT "enterprise_deal_participants_ecm_contact_id_fkey" FOREIGN KEY ("ecm_contact_id") REFERENCES "ecm_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_counterparty_assignments" ADD CONSTRAINT "enterprise_deal_counterparty_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_counterparty_assignments" ADD CONSTRAINT "enterprise_deal_counterparty_assignments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_document_links" ADD CONSTRAINT "enterprise_deal_document_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_document_links" ADD CONSTRAINT "enterprise_deal_document_links_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_tasks" ADD CONSTRAINT "enterprise_deal_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_tasks" ADD CONSTRAINT "enterprise_deal_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_activities" ADD CONSTRAINT "enterprise_deal_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_activities" ADD CONSTRAINT "enterprise_deal_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_notes" ADD CONSTRAINT "enterprise_deal_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_notes" ADD CONSTRAINT "enterprise_deal_notes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_timeline_events" ADD CONSTRAINT "enterprise_deal_timeline_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_timeline_events" ADD CONSTRAINT "enterprise_deal_timeline_events_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_assignments" ADD CONSTRAINT "enterprise_deal_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_assignments" ADD CONSTRAINT "enterprise_deal_assignments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_commercial_versions" ADD CONSTRAINT "enterprise_deal_commercial_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_commercial_versions" ADD CONSTRAINT "enterprise_deal_commercial_versions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_commission_links" ADD CONSTRAINT "enterprise_deal_commission_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_commission_links" ADD CONSTRAINT "enterprise_deal_commission_links_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_accounting_links" ADD CONSTRAINT "enterprise_deal_accounting_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_accounting_links" ADD CONSTRAINT "enterprise_deal_accounting_links_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_notification_links" ADD CONSTRAINT "enterprise_deal_notification_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_notification_links" ADD CONSTRAINT "enterprise_deal_notification_links_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_intelligence_links" ADD CONSTRAINT "enterprise_deal_intelligence_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_intelligence_links" ADD CONSTRAINT "enterprise_deal_intelligence_links_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_workflow_bindings" ADD CONSTRAINT "enterprise_deal_workflow_bindings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_workflow_bindings" ADD CONSTRAINT "enterprise_deal_workflow_bindings_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_import_batches" ADD CONSTRAINT "enterprise_deal_import_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ARB / Wave 0: at most one primary counterparty assignment per deal (active rows)
CREATE UNIQUE INDEX "edeal_cp_one_primary_uidx"
  ON "enterprise_deal_counterparty_assignments" ("deal_id")
  WHERE "is_primary" = true AND "is_deleted" = false;
