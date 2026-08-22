-- CO-C1-COMMUNICATION-002 — Inbound operational email ingestion ledger

CREATE TABLE "enterprise_inbound_email_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "in_reply_to" TEXT,
    "references_header" TEXT,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "to_emails_json" JSONB NOT NULL,
    "cc_emails_json" JSONB,
    "reply_to_email" TEXT,
    "subject" TEXT NOT NULL,
    "text_body" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "sender_role" TEXT,
    "match_status" TEXT NOT NULL DEFAULT 'received',
    "match_reason" TEXT,
    "opportunity_id" TEXT,
    "deal_id" TEXT,
    "contact_id" TEXT,
    "outbound_source_event_id" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "source_mailbox" TEXT,
    "imap_uid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_inbound_email_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enterprise_inbound_email_attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "inbound_email_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_inbound_email_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eie_org_message_uidx" ON "enterprise_inbound_email_messages"("organization_id", "message_id");
CREATE INDEX "eie_org_status_received_idx" ON "enterprise_inbound_email_messages"("organization_id", "match_status", "received_at" DESC);
CREATE INDEX "eie_org_opp_idx" ON "enterprise_inbound_email_messages"("organization_id", "opportunity_id");
CREATE INDEX "eie_org_deal_idx" ON "enterprise_inbound_email_messages"("organization_id", "deal_id");
CREATE UNIQUE INDEX "eie_attach_hash_uidx" ON "enterprise_inbound_email_attachments"("organization_id", "inbound_email_id", "content_hash");
CREATE INDEX "eie_attach_doc_idx" ON "enterprise_inbound_email_attachments"("organization_id", "document_id");

ALTER TABLE "enterprise_inbound_email_messages" ADD CONSTRAINT "enterprise_inbound_email_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_inbound_email_attachments" ADD CONSTRAINT "enterprise_inbound_email_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enterprise_inbound_email_attachments" ADD CONSTRAINT "enterprise_inbound_email_attachments_inbound_email_id_fkey" FOREIGN KEY ("inbound_email_id") REFERENCES "enterprise_inbound_email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
