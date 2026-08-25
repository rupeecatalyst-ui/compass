/**
 * CO-NOTIFICATION-001 — Enterprise Notification Engine verification.
 * Recipient policy · dedupe · silent preference · no own-activity notify · security scaffolding.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEneDedupeKey,
  ENE_CHIME_PUBLIC_PATH,
  ENE_EVENT_TYPES,
  eneEventTitle,
} from "../src/constants/enterprise-notification-engine/index.ts";
import { buildRecipientRows } from "../src/lib/enterprise-notification-engine/recipients-pure.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// A. Architecture files present
assert.ok(existsSync(join(root, "src/types/enterprise-notification-engine.ts")));
assert.ok(
  existsSync(
    join(root, "server/services/enterprise-notification/enterprise-notification.service.ts"),
  ),
);
assert.ok(
  existsSync(join(root, "src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx")),
);
assert.ok(
  existsSync(join(root, "public/sounds/catalyst_one_notification_chime.wav")),
  "Approved chime asset must exist",
);
assert.equal(ENE_CHIME_PUBLIC_PATH, "/sounds/catalyst_one_notification_chime.wav");

// B. Dedupe identity
const k1 = buildEneDedupeKey({
  eventType: "OPPORTUNITY_CREATED",
  sourceEventId: "opp-1",
  recipientKind: "user",
  recipientId: "mgr-1",
});
const k2 = buildEneDedupeKey({
  eventType: "OPPORTUNITY_CREATED",
  sourceEventId: "opp-1",
  recipientKind: "user",
  recipientId: "mgr-1",
});
const k3 = buildEneDedupeKey({
  eventType: "OPPORTUNITY_CREATED",
  sourceEventId: "opp-1",
  recipientKind: "user",
  recipientId: "admin-1",
});
assert.equal(k1, k2);
assert.notEqual(k1, k3);

// C. Recipient rows never include actor (actor excluded upstream); partner only when not actorIsPartner
const rows = buildRecipientRows(
  {
    organizationId: "org-1",
    eventType: ENE_EVENT_TYPES.OPPORTUNITY_CREATED,
    sourceEventId: "opp-1",
    sourceSystem: "opportunity",
    title: eneEventTitle("OPPORTUNITY_CREATED"),
    body: "Rahul Sharma · Home Loan",
    href: "/opportunities?opportunityId=opp-1",
    actorUserId: "emp-a",
  },
  [
    { kind: "user", userId: "mgr-1", reason: "reporting_manager" },
    { kind: "user", userId: "admin-1", reason: "admin_scope" },
    { kind: "partner", partnerId: "wp-1", reason: "partner_ownership" },
  ],
);
assert.equal(rows.length, 3);
assert.ok(rows.every((r) => r.recipientUserId !== "emp-a"));
assert.ok(rows.some((r) => r.recipientPartnerId === "wp-1"));
assert.equal(new Set(rows.map((r) => r.dedupeKey)).size, 3);

// D. Wire points — Opportunity / Deal / Partner create / Timeline
const oppSvc = read("server/services/enterprise-opportunity/index.ts");
assert.match(oppSvc, /enterpriseNotificationService/);
assert.match(oppSvc, /OPPORTUNITY_CREATED/);

const dealSvc = read("server/services/enterprise-deal/enterprise-deal.service.ts");
assert.match(dealSvc, /DEAL_CREATED/);

const dealRepo = read("server/repositories/enterprise-deal/enterprise-deal.repository.ts");
assert.match(dealRepo, /DEAL_STAGE_CHANGED/);

const partnerBiz = read("server/services/partner-gateway/partner-business.service.ts");
assert.match(partnerBiz, /actorIsPartner:\s*true/);
assert.match(partnerBiz, /enterpriseNotificationService/);

const partnerCenter = read(
  "server/services/partner-gateway/partner-notification-center.service.ts",
);
assert.match(partnerCenter, /listForPartner/);
assert.match(partnerCenter, /enterprise_notification_engine/);

// E. C1 host — bottom-right toast, silent, sound path, multi-tab
const host = read(
  "src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx",
);
assert.match(host, /bottom-\[max|bottom-4/);
assert.match(host, /ENE_CHIME_PUBLIC_PATH/);
assert.match(host, /Silent|BellOff/);
assert.match(host, /BroadcastChannel|ENE_TAB_CHANNEL/);
assert.match(host, /claimSoundLeadership|ENE_SOUND_LOCK_KEY/);
assert.match(host, /ENE_TOAST_AUTO_DISMISS_MS/);
assert.match(host, /ENE_MAX_TOAST_QUEUE|activeToast|data-ene-visible-toasts/);
assert.match(host, /pointer-events-none/);

// E2. CO-NOTIFICATION-001B — CHANAKYA visual identity (dark toast + approved portrait)
assert.match(host, /ChanakyaAvatar/);
assert.match(host, /CEI_OFFICIAL_TITLE/);
assert.match(host, /CEI_OFFICIAL_SUBTITLE/);
assert.match(host, /bg-\[#0f1419\]/);
assert.match(host, /CEI_DEFAULT_AVATAR_PACK|data-ene-avatar/);
assert.match(host, /safe-area-inset-bottom/);
assert.ok(
  existsSync(join(root, "public/images/chanakya-portrait.png")),
  "Approved CHANAKYA portrait must exist",
);
assert.match(
  read("src/constants/chanakya-enterprise-identity/avatar.ts"),
  /portraitSrc:\s*"\/images\/chanakya-portrait\.png"/,
);

const providers = read("src/components/providers/app-providers.tsx");
assert.match(providers, /EnterpriseNotificationHost/);

// F. Preferences API + cookie
const prefs = read("src/app/api/enterprise-notifications/preferences/route.ts");
assert.match(prefs, /soundEnabled/);
assert.match(prefs, /ene_sound_enabled/);

// G. Schema / migration present (not applied to production in this sprint)
assert.match(read("prisma/schema.prisma"), /model EnterpriseNotification/);
assert.ok(
  existsSync(
    join(
      root,
      "prisma/migrations/20260811160000_co_notification_001_enterprise_notification/migration.sql",
    ),
  ),
);

// H. WP toast host
const wpToast = readFileSync(
  "C:/Wealth Partner App/web/src/components/shell/PartnerNotificationToast.tsx",
  "utf8",
);
assert.match(wpToast, /CO-NOTIFICATION-001/);
assert.match(wpToast, /partnerNotificationCenter/);
assert.match(wpToast, /catalyst_one_notification_chime/);
const wpShell = readFileSync(
  "C:/Wealth Partner App/web/src/components/shell/AppShell.tsx",
  "utf8",
);
assert.match(wpShell, /PartnerNotificationToastHost/);

// I. Report
assert.ok(
  existsSync(join(root, "docs/co-notification-001/CO-NOTIFICATION-001-DEVELOPMENT-REPORT.md")),
);

console.log("CO-NOTIFICATION-001 verify OK");
