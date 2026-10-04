-- Field Control Master V2.0.
-- Additive placement and custom-value tables only.
-- Does not alter EnterpriseDeal, contacts, companies, opportunities, accounting, or field definitions.
-- Does not backfill. Does not change controls_runtime or customer_facing_activation.
-- entity_id has no foreign key because one value table serves every launch domain.
-- DO NOT APPLY THIS MIGRATION TO PRODUCTION until a later authorised cutover.

CREATE TABLE "field_control_placements" (
    "id" TEXT NOT NULL,
    "field_lineage_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "owning_domain" "FieldControlOwningDomain" NOT NULL,
    "screen_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "show_on_create" BOOLEAN NOT NULL,
    "show_on_edit" BOOLEAN NOT NULL,
    "show_on_view" BOOLEAN NOT NULL,
    "required_on_placement" BOOLEAN NOT NULL,
    "display_order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,

    CONSTRAINT "field_control_placements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fcm_placement_launch_screen" CHECK (
        ("owning_domain"::text = 'contact' AND "screen_id" = 'contact_workspace' AND "section_id" = 'custom_fields')
        OR ("owning_domain"::text = 'company' AND "screen_id" = 'company_workspace' AND "section_id" = 'custom_fields')
        OR ("owning_domain"::text = 'opportunity' AND "screen_id" = 'opportunity_workspace' AND "section_id" = 'custom_fields')
        OR ("owning_domain"::text = 'deal' AND "screen_id" = 'deal_workspace' AND "section_id" = 'custom_fields')
        OR ("owning_domain"::text = 'accounting' AND "screen_id" = 'accounting_workspace' AND "section_id" = 'custom_fields')
    )
);

CREATE UNIQUE INDEX "fcm_placement_lineage_screen_key"
    ON "field_control_placements" ("field_lineage_id", "owning_domain", "screen_id", "section_id");

CREATE INDEX "fcm_placement_domain_screen_idx"
    ON "field_control_placements" ("owning_domain", "screen_id", "active");

ALTER TABLE "field_control_placements" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "field_control_custom_values" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "field_lineage_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "definition_version_id" TEXT NOT NULL,
    "entity_domain" "FieldControlOwningDomain" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,

    CONSTRAINT "field_control_custom_values_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fcm_custom_value_launch_domain" CHECK (
        "entity_domain"::text IN ('contact', 'company', 'opportunity', 'deal', 'accounting')
    ),
    CONSTRAINT "fcm_custom_value_present" CHECK (jsonb_typeof("value_json") <> 'null'),
    CONSTRAINT "fcm_custom_value_organization_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fcm_custom_value_definition_version_fkey"
        FOREIGN KEY ("definition_version_id") REFERENCES "field_control_definitions"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "fcm_custom_value_org_lineage_entity_key"
    ON "field_control_custom_values" ("organization_id", "field_lineage_id", "entity_domain", "entity_id");

CREATE INDEX "fcm_custom_value_org_entity_idx"
    ON "field_control_custom_values" ("organization_id", "entity_domain", "entity_id");

ALTER TABLE "field_control_custom_values" ENABLE ROW LEVEL SECURITY;
