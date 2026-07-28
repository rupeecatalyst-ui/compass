-- CO-MDM-001 — Extend Reference Master domains (additive only; no data loss).
ALTER TYPE "ReferenceMasterDomain" ADD VALUE IF NOT EXISTS 'business_source';
ALTER TYPE "ReferenceMasterDomain" ADD VALUE IF NOT EXISTS 'customer_segment';
ALTER TYPE "ReferenceMasterDomain" ADD VALUE IF NOT EXISTS 'relationship_type';
