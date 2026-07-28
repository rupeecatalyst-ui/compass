-- CO-UX Business Source — Source Contact name for MIS / commissions analytics
ALTER TABLE "enterprise_opportunities"
  ADD COLUMN IF NOT EXISTS "source_contact_name" TEXT;
