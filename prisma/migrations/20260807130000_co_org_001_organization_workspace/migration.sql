-- CO-ORG-001 — Enterprise Organization Workspace durable backend

CREATE TABLE "organization_workspace_profiles" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "company_name" TEXT NOT NULL,
  "legal_entity_name" TEXT,
  "brand_name" TEXT NOT NULL,
  "logo_initials" TEXT,
  "logo_document_id" TEXT,
  "gst" TEXT NOT NULL DEFAULT '',
  "pan" TEXT NOT NULL DEFAULT '',
  "cin" TEXT NOT NULL DEFAULT '',
  "msme" TEXT NOT NULL DEFAULT '',
  "incorporation_date" TEXT,
  "incorporation_details" TEXT,
  "registered_address" TEXT,
  "corporate_address" TEXT,
  "website" TEXT NOT NULL DEFAULT '',
  "phone_numbers_json" JSONB NOT NULL DEFAULT '[]',
  "official_emails_json" JSONB NOT NULL DEFAULT '[]',
  "email_domains_json" JSONB NOT NULL DEFAULT '[]',
  "social_links_json" JSONB NOT NULL DEFAULT '{}',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_workspace_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_workspace_profiles_organization_id_key"
  ON "organization_workspace_profiles"("organization_id");

ALTER TABLE "organization_workspace_profiles"
  ADD CONSTRAINT "organization_workspace_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_workspace_settings" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "working_days_json" JSONB NOT NULL DEFAULT '[]',
  "working_hours_json" JSONB NOT NULL DEFAULT '{}',
  "holiday_calendar_json" JSONB NOT NULL DEFAULT '[]',
  "financial_year_start_month" INTEGER NOT NULL DEFAULT 4,
  "time_zone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "number_format" TEXT NOT NULL DEFAULT 'en-IN',
  "date_format" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_workspace_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_workspace_settings_organization_id_key"
  ON "organization_workspace_settings"("organization_id");

ALTER TABLE "organization_workspace_settings"
  ADD CONSTRAINT "organization_workspace_settings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_business_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "business_type" TEXT,
  "products_offered_json" JSONB NOT NULL DEFAULT '[]',
  "operating_states_json" JSONB NOT NULL DEFAULT '[]',
  "branches_json" JSONB NOT NULL DEFAULT '[]',
  "departments_json" JSONB NOT NULL DEFAULT '[]',
  "teams_json" JSONB NOT NULL DEFAULT '[]',
  "designations_json" JSONB NOT NULL DEFAULT '[]',
  "roles_config_json" JSONB NOT NULL DEFAULT '[]',
  "hierarchy_json" JSONB NOT NULL DEFAULT '[]',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_business_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_business_configs_organization_id_key"
  ON "organization_business_configs"("organization_id");

ALTER TABLE "organization_business_configs"
  ADD CONSTRAINT "organization_business_configs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_security_configs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "permissions_json" JSONB NOT NULL DEFAULT '[]',
  "feature_flags_json" JSONB NOT NULL DEFAULT '{}',
  "defaults_json" JSONB NOT NULL DEFAULT '{}',
  "branding_json" JSONB NOT NULL DEFAULT '{}',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_security_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_security_configs_organization_id_key"
  ON "organization_security_configs"("organization_id");

ALTER TABLE "organization_security_configs"
  ADD CONSTRAINT "organization_security_configs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_directors" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL DEFAULT '',
  "din" TEXT NOT NULL DEFAULT '',
  "pan" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "mobile" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "photograph_initials" TEXT NOT NULL DEFAULT '',
  "address" TEXT,
  "documents_json" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_directors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_directors_org_deleted_idx"
  ON "organization_directors"("organization_id", "is_deleted");

CREATE INDEX "org_directors_org_sort_idx"
  ON "organization_directors"("organization_id", "sort_order");

ALTER TABLE "organization_directors"
  ADD CONSTRAINT "organization_directors_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_bank_accounts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "bank" TEXT NOT NULL,
  "branch" TEXT NOT NULL DEFAULT '',
  "account_number" TEXT NOT NULL,
  "ifsc" TEXT NOT NULL DEFAULT '',
  "is_current_account" BOOLEAN NOT NULL DEFAULT true,
  "cancelled_cheque_available" BOOLEAN NOT NULL DEFAULT false,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_bank_accounts_org_deleted_idx"
  ON "organization_bank_accounts"("organization_id", "is_deleted");

ALTER TABLE "organization_bank_accounts"
  ADD CONSTRAINT "organization_bank_accounts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_digital_signatures" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "person" TEXT NOT NULL,
  "designation" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiry" TEXT NOT NULL DEFAULT '',
  "initials" TEXT NOT NULL DEFAULT '',
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_digital_signatures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_digital_signatures_org_deleted_idx"
  ON "organization_digital_signatures"("organization_id", "is_deleted");

ALTER TABLE "organization_digital_signatures"
  ADD CONSTRAINT "organization_digital_signatures_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_seals" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "last_updated" TEXT,
  "version" TEXT DEFAULT '',
  "initials" TEXT DEFAULT '',
  "document_id" TEXT,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_seals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_seals_organization_id_key"
  ON "organization_seals"("organization_id");

ALTER TABLE "organization_seals"
  ADD CONSTRAINT "organization_seals_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_documents" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "client_record_id" TEXT,
  "original_filename" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "document_type_id" TEXT NOT NULL,
  "document_type_label" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "tags_json" JSONB,
  "content_bytes" BYTEA,
  "versions_json" JSONB NOT NULL DEFAULT '[]',
  "uploaded_by" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_documents_org_client_key"
  ON "organization_documents"("organization_id", "client_record_id");

CREATE INDEX "org_documents_org_status_idx"
  ON "organization_documents"("organization_id", "status");

CREATE INDEX "org_documents_org_category_idx"
  ON "organization_documents"("organization_id", "category_id");

ALTER TABLE "organization_documents"
  ADD CONSTRAINT "organization_documents_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_document_template_types" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "type_code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_document_template_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_doc_template_org_code_key"
  ON "organization_document_template_types"("organization_id", "type_code");

CREATE INDEX "org_doc_template_org_deleted_idx"
  ON "organization_document_template_types"("organization_id", "is_deleted");

ALTER TABLE "organization_document_template_types"
  ADD CONSTRAINT "organization_document_template_types_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_activity_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_type" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "actor_user_id" TEXT,
  "actor_name" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "organization_activity_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_activity_org_occurred_idx"
  ON "organization_activity_events"("organization_id", "occurred_at" DESC);

ALTER TABLE "organization_activity_events"
  ADD CONSTRAINT "organization_activity_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "organization_audit_entries" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "actor_user_id" TEXT NOT NULL,
  "actor_name" TEXT,
  "justification" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "organization_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_audit_org_occurred_idx"
  ON "organization_audit_entries"("organization_id", "occurred_at" DESC);

ALTER TABLE "organization_audit_entries"
  ADD CONSTRAINT "organization_audit_entries_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
