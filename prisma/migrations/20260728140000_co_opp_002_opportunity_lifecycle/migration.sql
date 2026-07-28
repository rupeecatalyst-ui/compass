-- CO-OPP-002 — Additive Opportunity lifecycle enum values only.
-- Does NOT update, migrate, or rewrite any existing Opportunity rows.
-- Historical `draft` / `active` / `won` / `archived` values remain valid in the DB.
-- Idempotent: safe if partially applied.

ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'dialogue';
ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'converted_to_deal';
ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'completed';
