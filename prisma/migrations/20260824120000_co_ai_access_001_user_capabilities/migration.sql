-- CO-AI-ACCESS-001 — Explicit per-user AI capabilities (default OFF; not role-inherited).

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "ai_capabilities_json" JSONB NOT NULL DEFAULT '{}';
