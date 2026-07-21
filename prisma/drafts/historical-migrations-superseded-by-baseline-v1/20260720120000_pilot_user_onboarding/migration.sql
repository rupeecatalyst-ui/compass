-- Pilot Phase 1 — User onboarding fields (non-destructive)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reporting_manager_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "eum_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_id_key" ON "users"("employee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_eum_user_id_key" ON "users"("eum_user_id");
CREATE INDEX IF NOT EXISTS "users_reporting_manager_id_idx" ON "users"("reporting_manager_id");
CREATE INDEX IF NOT EXISTS "users_created_by_id_idx" ON "users"("created_by_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_created_by_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_reporting_manager_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_reporting_manager_id_fkey"
      FOREIGN KEY ("reporting_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
