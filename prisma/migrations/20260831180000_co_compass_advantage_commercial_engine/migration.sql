-- CO-COMPASS Advantage commercial rule engine (additive only).
-- Do not apply to Hostinger production without explicit Product Owner approval.

CREATE TYPE "CompassAdvantageScheduleStatus" AS ENUM ('draft', 'published', 'suspended', 'retired');

CREATE TABLE "compass_advantage_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "CompassAdvantageScheduleStatus" NOT NULL DEFAULT 'draft',
    "advantage_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "change_reason" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "published_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "compass_advantage_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compass_advantage_ranges" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "range_from_rupees" DECIMAL(18,0) NOT NULL,
    "range_to_rupees" DECIMAL(18,0),
    "no_upper_limit" BOOLEAN NOT NULL DEFAULT false,
    "percentage_rate" DECIMAL(18,10) NOT NULL,
    "customer_description" TEXT,
    "internal_note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compass_advantage_ranges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compass_advantage_fixed_benefits" (
    "id" TEXT NOT NULL,
    "range_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount_rupees" DECIMAL(18,0) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "customer_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compass_advantage_fixed_benefits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compass_advantage_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "opportunity_reference" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "requested_loan_amount" DECIMAL(18,0) NOT NULL,
    "matched_range_from" DECIMAL(18,0),
    "matched_range_to" DECIMAL(18,0),
    "matched_range_no_upper_limit" BOOLEAN NOT NULL DEFAULT false,
    "percentage_rate" DECIMAL(18,10),
    "percentage_benefit_amount" DECIMAL(18,0) NOT NULL,
    "fixed_benefit_components" JSONB NOT NULL,
    "total_fixed_benefit_amount" DECIMAL(18,0) NOT NULL,
    "total_advantage_amount" DECIMAL(18,0) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "schedule_id" TEXT,
    "schedule_version" INTEGER,
    "case_received_at" TIMESTAMP(3) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "effective_timestamp" TIMESTAMP(3) NOT NULL,
    "customer_explanation" TEXT NOT NULL,
    "calculation_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compass_advantage_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compass_advantage_audits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "product_code" TEXT,
    "version_number" INTEGER,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_label" TEXT NOT NULL,
    "reason" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compass_advantage_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cas_org_product_version_uidx" ON "compass_advantage_schedules"("organization_id", "product_code", "version_number");
CREATE INDEX "cas_org_product_status_eff_idx" ON "compass_advantage_schedules"("organization_id", "product_code", "status", "effective_from");
CREATE INDEX "car_schedule_order_idx" ON "compass_advantage_ranges"("schedule_id", "display_order");
CREATE INDEX "cafb_range_order_idx" ON "compass_advantage_fixed_benefits"("range_id", "display_order");
CREATE UNIQUE INDEX "compass_advantage_snapshots_opportunity_id_key" ON "compass_advantage_snapshots"("opportunity_id");
CREATE INDEX "casnap_org_product_idx" ON "compass_advantage_snapshots"("organization_id", "product_code");
CREATE INDEX "caaud_org_created_idx" ON "compass_advantage_audits"("organization_id", "created_at" DESC);
CREATE INDEX "caaud_schedule_created_idx" ON "compass_advantage_audits"("schedule_id", "created_at" DESC);

ALTER TABLE "compass_advantage_schedules" ADD CONSTRAINT "compass_advantage_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_ranges" ADD CONSTRAINT "compass_advantage_ranges_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "compass_advantage_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_fixed_benefits" ADD CONSTRAINT "compass_advantage_fixed_benefits_range_id_fkey" FOREIGN KEY ("range_id") REFERENCES "compass_advantage_ranges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_snapshots" ADD CONSTRAINT "compass_advantage_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_snapshots" ADD CONSTRAINT "compass_advantage_snapshots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "compass_advantage_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_audits" ADD CONSTRAINT "compass_advantage_audits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compass_advantage_audits" ADD CONSTRAINT "compass_advantage_audits_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "compass_advantage_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
