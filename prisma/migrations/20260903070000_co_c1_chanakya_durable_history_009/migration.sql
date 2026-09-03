-- CO-C1-CHANAKYA-DURABLE-HISTORY-009A
-- Prepared locally. Do not apply from this correction.
-- Additive only: chanakya_conversation_sessions + chanakya_conversation_messages.
-- No DROP / TRUNCATE of existing Catalyst One tables.
-- No ownership backfill. No mutation of contacts, companies, Opportunities,
-- Deals, documents, proposals, tasks, activities, or accounting records.
--
-- Rollback / forward recovery:
--   DROP TABLE IF EXISTS "chanakya_conversation_messages";
--   DROP TABLE IF EXISTS "chanakya_conversation_sessions";
-- Historical business records are untouched. New tables hold no production
-- rows until employees open CHANAKYA chats after deploy.

CREATE TABLE IF NOT EXISTS "chanakya_conversation_sessions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'New chat',
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "opportunity_id" TEXT,
  "deal_id" TEXT,
  "last_intent" TEXT,
  "focus_entities_json" JSONB NOT NULL DEFAULT '[]',
  "metadata_json" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "chanakya_conversation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chanakya_chat_owner_updated_idx"
  ON "chanakya_conversation_sessions" ("organization_id", "owner_user_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "chanakya_chat_expires_idx"
  ON "chanakya_conversation_sessions" ("expires_at");

CREATE INDEX IF NOT EXISTS "chanakya_chat_owner_expires_idx"
  ON "chanakya_conversation_sessions" ("organization_id", "owner_user_id", "expires_at");

CREATE INDEX IF NOT EXISTS "chanakya_chat_context_idx"
  ON "chanakya_conversation_sessions" ("organization_id", "opportunity_id", "deal_id");

DO $$ BEGIN
  ALTER TABLE "chanakya_conversation_sessions"
    ADD CONSTRAINT "chanakya_conversation_sessions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chanakya_conversation_sessions"
    ADD CONSTRAINT "chanakya_conversation_sessions_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chanakya_conversation_messages" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sequence" INTEGER NOT NULL,
  "completion_status" TEXT NOT NULL DEFAULT 'complete',
  "stream_status" TEXT NOT NULL DEFAULT 'idle',
  "evidence_json" JSONB NOT NULL DEFAULT '[]',
  "entity_refs_json" JSONB NOT NULL DEFAULT '{}',
  "intent" TEXT,
  "feedback" TEXT,
  "idempotency_key" TEXT,
  "proposal_draft_id" TEXT,
  CONSTRAINT "chanakya_conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chanakya_msg_idempotency_key"
  ON "chanakya_conversation_messages" ("session_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "chanakya_msg_session_seq_idx"
  ON "chanakya_conversation_messages" ("session_id", "sequence");

DO $$ BEGIN
  ALTER TABLE "chanakya_conversation_messages"
    ADD CONSTRAINT "chanakya_conversation_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "chanakya_conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
