#!/usr/bin/env node
/**
 * Toast at-most-once — engineering verifier.
 * Does not apply production migrations or log notification content.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  claimToastRows,
  simulateTwoTabToastClaim,
} from "../src/lib/enterprise-notification-engine/toast-claim.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const host = read(
  "src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx",
);
assert.match(host, /claimPendingToastNotifications/);
assert.match(host, /pollInFlightRef/);
assert.doesNotMatch(host, /unreadOnly:\s*true/);
assert.doesNotMatch(host, /listEnterpriseNotifications/);
assert.doesNotMatch(host, /loadPresentedToastIds|rememberPresentedToastId|sessionStorage/);

const panel = read("src/components/layout/notifications-panel.tsx");
assert.match(panel, /listEnterpriseNotifications/);
assert.doesNotMatch(panel, /toast-claim|claimPendingToastNotifications/);

const markReadRepo = read(
  "server/repositories/enterprise-notification/enterprise-notification.repository.ts",
);
assert.match(markReadRepo, /readState:\s*"READ"/);
assert.doesNotMatch(
  markReadRepo.slice(markReadRepo.indexOf("async markRead"), markReadRepo.indexOf("claimPendingToastsForUser")),
  /toastPresentedAt:\s*new Date/,
);
assert.match(markReadRepo, /FOR UPDATE SKIP LOCKED/);
assert.match(markReadRepo, /toastPresentedAt: null/);

const migration = read(
  "prisma/migrations/20260831190000_co_notification_toast_presented_once/migration.sql",
);
assert.match(migration, /toast_presented_at/);
assert.match(migration, /WHERE "toast_presented_at" IS NULL/);
assert.doesNotMatch(migration, /SET "read_state"/);
assert.doesNotMatch(migration, /DELETE FROM "enterprise_notifications"/);

assert.match(read("prisma/schema.prisma"), /toastPresentedAt/);
assert.ok(existsSync(join(root, "src/app/api/enterprise-notifications/toast-claim/route.ts")));
assert.match(read("src/app/api/enterprise-notifications/toast-claim/route.ts"), /claimPendingToastsForUser/);
assert.doesNotMatch(read("src/app/api/enterprise-notifications/toast-claim/route.ts"), /markRead/);

const historical = [
  {
    id: "n-old-1",
    organizationId: "org-1",
    recipientUserId: "user-a",
    toastPresentedAt: "2026-08-01T00:00:00.000Z",
    readAt: null,
    readState: "UNREAD",
    occurredAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "n-old-2",
    organizationId: "org-1",
    recipientUserId: "user-a",
    toastPresentedAt: "2026-08-20T00:00:00.000Z",
    readAt: null,
    readState: "UNREAD",
    occurredAt: "2026-08-20T00:00:00.000Z",
  },
];
const afterBackfill = claimToastRows(historical, {
  organizationId: "org-1",
  userId: "user-a",
  limit: 20,
  presentedAt: "2026-08-31T16:00:00.000Z",
});
assert.equal(afterBackfill.length, 0, "historical already presented must not toast");
assert.equal(historical.every((row) => row.readState === "UNREAD"), true);
assert.equal(historical.every((row) => row.readAt == null), true);

const fresh = [
  {
    id: "n-new",
    organizationId: "org-1",
    recipientUserId: "user-a",
    toastPresentedAt: null,
    readAt: null,
    readState: "UNREAD",
    occurredAt: "2026-08-31T16:10:00.000Z",
  },
];
const first = claimToastRows(fresh, {
  organizationId: "org-1",
  userId: "user-a",
  limit: 20,
  presentedAt: "2026-08-31T16:11:00.000Z",
});
assert.equal(first.length, 1);
assert.equal(first[0].id, "n-new");
assert.equal(first[0].readState, "UNREAD");
assert.equal(first[0].readAt, null);
const refresh = claimToastRows(fresh, {
  organizationId: "org-1",
  userId: "user-a",
  limit: 20,
  presentedAt: "2026-08-31T16:12:00.000Z",
});
assert.equal(refresh.length, 0, "refresh must not replay");

const twoUsers = [
  {
    id: "n-a",
    organizationId: "org-1",
    recipientUserId: "user-a",
    toastPresentedAt: null,
    readAt: null,
    readState: "UNREAD",
    occurredAt: "2026-08-31T16:10:00.000Z",
  },
  {
    id: "n-b",
    organizationId: "org-1",
    recipientUserId: "user-b",
    toastPresentedAt: null,
    readAt: null,
    readState: "UNREAD",
    occurredAt: "2026-08-31T16:10:00.000Z",
  },
];
const forA = claimToastRows(twoUsers.map((row) => ({ ...row })), {
  organizationId: "org-1",
  userId: "user-a",
  limit: 20,
  presentedAt: "2026-08-31T16:11:00.000Z",
});
const forB = claimToastRows(twoUsers.map((row) => ({ ...row })), {
  organizationId: "org-1",
  userId: "user-b",
  limit: 20,
  presentedAt: "2026-08-31T16:11:00.000Z",
});
assert.deepEqual(forA.map((row) => row.id), ["n-a"]);
assert.deepEqual(forB.map((row) => row.id), ["n-b"]);

const otherOrg = claimToastRows(twoUsers.map((row) => ({ ...row })), {
  organizationId: "org-2",
  userId: "user-a",
  limit: 20,
  presentedAt: "2026-08-31T16:11:00.000Z",
});
assert.equal(otherOrg.length, 0);

const tabRace = simulateTwoTabToastClaim(
  [
    {
      id: "n-race",
      organizationId: "org-1",
      recipientUserId: "user-a",
      toastPresentedAt: null,
      readAt: null,
      readState: "UNREAD",
      occurredAt: "2026-08-31T16:10:00.000Z",
    },
  ],
  { organizationId: "org-1", userId: "user-a", limit: 20 },
);
assert.equal(tabRace.tabA.length, 1);
assert.equal(tabRace.tabB.length, 0);
assert.equal(tabRace.overlap.length, 0);

const claimRoute = read("src/app/api/enterprise-notifications/toast-claim/route.ts");
assert.doesNotMatch(claimRoute, /customerName|amountLabel|console\.log/);

console.log("CO-NOTIFICATION-TOAST-ONCE verify: PASS");
