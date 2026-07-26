-- ADR-018 Wave 1a — Extend OpportunityLifecycleStatus enum only.
-- Must commit before the new values are referenced (PostgreSQL 55P04).

ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "OpportunityLifecycleStatus" ADD VALUE IF NOT EXISTS 'requirement_captured';
