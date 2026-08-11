-- CO-CCC-001 — Corporate Compliance Center foundation

ALTER TABLE "organization_documents"
  ADD COLUMN "legal_entity_id" TEXT,
  ADD COLUMN "repository_key" TEXT,
  ADD COLUMN "financial_year" TEXT,
  ADD COLUMN "is_current_financial_version" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "effective_date" TIMESTAMP(3),
  ADD COLUMN "expiry_date" TIMESTAMP(3),
  ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "confidentiality" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "superseded_by_document_id" TEXT,
  ADD COLUMN "linked_package_ids_json" JSONB;

CREATE INDEX "org_documents_org_repository_idx"
  ON "organization_documents"("organization_id", "repository_key");

CREATE INDEX "org_documents_org_entity_idx"
  ON "organization_documents"("organization_id", "legal_entity_id");

CREATE INDEX "org_documents_org_fy_idx"
  ON "organization_documents"("organization_id", "financial_year");

CREATE INDEX "org_documents_org_approval_idx"
  ON "organization_documents"("organization_id", "approval_status");

CREATE INDEX "org_documents_org_expiry_idx"
  ON "organization_documents"("organization_id", "expiry_date");

CREATE TABLE "ccc_legal_entities" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "legal_name" TEXT NOT NULL,
  "brand_name" TEXT,
  "gst" TEXT,
  "pan" TEXT,
  "cin" TEXT,
  "tan" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_legal_entities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ccc_legal_entity_org_code_key"
  ON "ccc_legal_entities"("organization_id", "code");

CREATE INDEX "ccc_legal_entity_org_deleted_idx"
  ON "ccc_legal_entities"("organization_id", "is_deleted");

ALTER TABLE "ccc_legal_entities"
  ADD CONSTRAINT "ccc_legal_entities_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ccc_institution_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institution_type" TEXT NOT NULL,
  "contact_email" TEXT,
  "contact_name" TEXT,
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_institution_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccc_institution_org_deleted_idx"
  ON "ccc_institution_profiles"("organization_id", "is_deleted");

ALTER TABLE "ccc_institution_profiles"
  ADD CONSTRAINT "ccc_institution_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ccc_institution_requirements" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "document_type_id" TEXT NOT NULL,
  "document_type_label" TEXT NOT NULL,
  "category_id" TEXT,
  "repository_key" TEXT,
  "mandatory" BOOLEAN NOT NULL DEFAULT true,
  "financial_years_required_json" JSONB NOT NULL DEFAULT '[]',
  "renewal_frequency_months" INTEGER,
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_institution_requirements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccc_inst_req_org_inst_idx"
  ON "ccc_institution_requirements"("organization_id", "institution_id", "is_deleted");

ALTER TABLE "ccc_institution_requirements"
  ADD CONSTRAINT "ccc_institution_requirements_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ccc_institution_requirements"
  ADD CONSTRAINT "ccc_institution_requirements_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "ccc_institution_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ccc_document_package_definitions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "package_kind" TEXT NOT NULL,
  "item_specs_json" JSONB NOT NULL DEFAULT '[]',
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_document_package_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ccc_pkg_def_org_code_key"
  ON "ccc_document_package_definitions"("organization_id", "code");

CREATE INDEX "ccc_pkg_def_org_deleted_idx"
  ON "ccc_document_package_definitions"("organization_id", "is_deleted");

ALTER TABLE "ccc_document_package_definitions"
  ADD CONSTRAINT "ccc_document_package_definitions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ccc_document_package_instances" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "definition_id" TEXT NOT NULL,
  "legal_entity_id" TEXT,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "resolved_document_ids_json" JSONB NOT NULL DEFAULT '[]',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "built_at" TIMESTAMP(3),
  "built_by" TEXT,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_document_package_instances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccc_pkg_inst_org_def_idx"
  ON "ccc_document_package_instances"("organization_id", "definition_id");

ALTER TABLE "ccc_document_package_instances"
  ADD CONSTRAINT "ccc_document_package_instances_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ccc_document_package_instances"
  ADD CONSTRAINT "ccc_document_package_instances_definition_id_fkey"
  FOREIGN KEY ("definition_id") REFERENCES "ccc_document_package_definitions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ccc_document_package_instances"
  ADD CONSTRAINT "ccc_document_package_instances_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "ccc_legal_entities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ccc_dispatches" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "legal_entity_id" TEXT,
  "institution_id" TEXT,
  "package_instance_id" TEXT,
  "package_definition_id" TEXT,
  "recipient_email" TEXT NOT NULL,
  "recipient_name" TEXT,
  "subject" TEXT,
  "body_preview" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sent_at" TIMESTAMP(3),
  "sent_by" TEXT,
  "delivery_status" TEXT,
  "acknowledgement_note" TEXT,
  "reminder_history_json" JSONB,
  "financial_year" TEXT,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ccc_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccc_dispatch_org_status_idx"
  ON "ccc_dispatches"("organization_id", "status");

CREATE INDEX "ccc_dispatch_org_sent_idx"
  ON "ccc_dispatches"("organization_id", "sent_at" DESC);

ALTER TABLE "ccc_dispatches"
  ADD CONSTRAINT "ccc_dispatches_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ccc_dispatches"
  ADD CONSTRAINT "ccc_dispatches_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "ccc_legal_entities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ccc_dispatches"
  ADD CONSTRAINT "ccc_dispatches_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "ccc_institution_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ccc_dispatches"
  ADD CONSTRAINT "ccc_dispatches_package_instance_id_fkey"
  FOREIGN KEY ("package_instance_id") REFERENCES "ccc_document_package_instances"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ccc_dispatches"
  ADD CONSTRAINT "ccc_dispatches_package_definition_id_fkey"
  FOREIGN KEY ("package_definition_id") REFERENCES "ccc_document_package_definitions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ccc_dispatch_items" (
  "id" TEXT NOT NULL,
  "dispatch_id" TEXT NOT NULL,
  "organization_document_id" TEXT NOT NULL,
  "document_version_number" INTEGER NOT NULL,
  "document_type_label" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,

  CONSTRAINT "ccc_dispatch_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccc_dispatch_item_dispatch_idx"
  ON "ccc_dispatch_items"("dispatch_id");

ALTER TABLE "ccc_dispatch_items"
  ADD CONSTRAINT "ccc_dispatch_items_dispatch_id_fkey"
  FOREIGN KEY ("dispatch_id") REFERENCES "ccc_dispatches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ccc_dispatch_items"
  ADD CONSTRAINT "ccc_dispatch_items_organization_document_id_fkey"
  FOREIGN KEY ("organization_document_id") REFERENCES "organization_documents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_documents"
  ADD CONSTRAINT "organization_documents_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "ccc_legal_entities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
