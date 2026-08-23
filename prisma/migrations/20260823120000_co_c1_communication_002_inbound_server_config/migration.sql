-- CO-C1-COMMUNICATION-002 — Incoming Email Server settings (non-secret IMAP config)

CREATE TABLE "enterprise_inbound_email_server_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "imap_host" TEXT,
    "imap_port" INTEGER NOT NULL DEFAULT 993,
    "imap_username" TEXT,
    "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
    "internal_domains" TEXT NOT NULL DEFAULT 'rupeecatalyst.com',
    "last_probe_at" TIMESTAMP(3),
    "last_probe_ok" BOOLEAN,
    "last_probe_message" TEXT,
    "modified_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_inbound_email_server_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enterprise_inbound_email_server_configs_organization_id_key" ON "enterprise_inbound_email_server_configs"("organization_id");

ALTER TABLE "enterprise_inbound_email_server_configs" ADD CONSTRAINT "enterprise_inbound_email_server_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
