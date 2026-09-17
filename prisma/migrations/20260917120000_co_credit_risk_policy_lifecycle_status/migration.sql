-- Additive policy-version lifecycle states. Existing values and rows are unchanged.
-- No new enum value is used by this migration; PostgreSQL may commit additions first.
ALTER TYPE "DurablePolicyStatus" ADD VALUE IF NOT EXISTS 'validated';
ALTER TYPE "DurablePolicyStatus" ADD VALUE IF NOT EXISTS 'testing';
ALTER TYPE "DurablePolicyStatus" ADD VALUE IF NOT EXISTS 'approved';
