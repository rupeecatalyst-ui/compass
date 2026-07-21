-- =============================================================================
-- CO-SPRINT-117 — Read-only database compatibility audit
-- Run against the target PostgreSQL BEFORE prisma migrate deploy.
-- Does NOT modify any objects.
-- =============================================================================

-- 1) Tables (public)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2) Enums
SELECT t.typname AS enum_name, e.enumlabel AS enum_value, e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 3) Indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4) Foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 5) Prisma migration history
SELECT id, migration_name, finished_at, applied_steps_count, rolled_back_at
FROM "_prisma_migrations"
ORDER BY finished_at NULLS LAST, migration_name;

-- 6) Naming conflicts with CO-SPRINT-117 (should return 0 rows if clean)
WITH expected AS (
  SELECT unnest(ARRAY[
    'organizations',
    'ecm_contacts',
    'ecm_contact_relationships',
    'ecm_contact_audit_references',
    'ecm_companies',
    'ecm_company_contact_links'
  ]) AS object_name, 'table' AS object_kind
  UNION ALL
  SELECT unnest(ARRAY[
    'EcmContactRole',
    'EcmContactStatus',
    'EcmPlatformAccess',
    'EcmContactRelationshipType',
    'EcmContactRelationshipStatus',
    'EcmAuditEntityType',
    'EcmCompanyStatus',
    'EcmCompanyRelationRole',
    'EcmCompanyLinkStatus'
  ]), 'enum'
  UNION ALL
  SELECT unnest(ARRAY[
    'organizations_slug_key',
    'ecm_contacts_org_mobile_key',
    'ecm_contacts_organization_id_status_idx',
    'ecm_contacts_organization_id_updated_at_idx',
    'ecm_contacts_organization_id_last_active_at_idx',
    'ecm_contacts_organization_id_contact_score_idx',
    'ecm_contacts_organization_id_primary_role_idx',
    'ecm_contacts_linked_user_id_idx',
    'ecm_contact_relationships_organization_id_from_contact_id_idx',
    'ecm_contact_relationships_organization_id_to_contact_id_idx',
    'ecm_contact_relationships_organization_id_relationship_type_idx',
    'ecm_contact_audit_references_organization_id_entity_id_idx',
    'ecm_contact_audit_references_organization_id_recorded_at_idx',
    'ecm_companies_organization_id_status_idx',
    'ecm_companies_organization_id_updated_at_idx',
    'ecm_company_contact_role_key',
    'ecm_company_contact_links_organization_id_company_id_idx',
    'ecm_company_contact_links_organization_id_contact_id_idx',
    'ecm_companies_org_name_ci_key'
  ]), 'index'
)
SELECT e.object_kind, e.object_name, 'ALREADY_EXISTS' AS conflict
FROM expected e
WHERE
  (e.object_kind = 'table' AND EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = e.object_name
  ))
  OR (e.object_kind = 'enum' AND EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_namespace n ON n.oid = typ.typnamespace
    WHERE n.nspname = 'public' AND typ.typname = e.object_name
  ))
  OR (e.object_kind = 'index' AND EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = 'public' AND i.indexname = e.object_name
  ))
ORDER BY e.object_kind, e.object_name;

-- 7) Auth prerequisites for CO-SPRINT-117 FK to users
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') AS users_exists,
  EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='Role') AS role_enum_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='refresh_tokens') AS refresh_tokens_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='password_reset_tokens') AS password_reset_tokens_exists;
