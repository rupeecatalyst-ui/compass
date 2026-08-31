-- CO-NOTIFICATION toast at-most-once presentation (additive).
-- Backfill treats existing rows as already toast-presented.
-- Does NOT change read_state, read_at, title, body, or recipient identity.
-- Do not apply to Hostinger production without explicit Product Owner approval.

ALTER TABLE "enterprise_notifications" ADD COLUMN "toast_presented_at" TIMESTAMP(3);

CREATE INDEX "ene_org_user_toast_idx" ON "enterprise_notifications"("organization_id", "recipient_user_id", "toast_presented_at");

UPDATE "enterprise_notifications"
SET "toast_presented_at" = COALESCE("read_at", "occurred_at", "created_at")
WHERE "toast_presented_at" IS NULL;
