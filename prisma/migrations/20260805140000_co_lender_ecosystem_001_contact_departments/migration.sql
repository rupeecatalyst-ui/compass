-- CO-LENDER-ECOSYSTEM-001 — Additive contact department values only.
-- Does NOT modify, delete, or migrate existing contact rows.
-- Safe to re-run: IF NOT EXISTS (PostgreSQL 9.1+).

ALTER TYPE "LenderContactDepartment" ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE "LenderContactDepartment" ADD VALUE IF NOT EXISTS 'regional_head';
