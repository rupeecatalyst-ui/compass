/**
 * CO-ORG-VISIBILITY-002 — Organizational visibility · Radar scope · multi-owner.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
} from "../src/lib/enterprise-case-visibility/index.ts";
import { defaultRadarScope } from "../src/lib/chanakya-radar/portfolio-scope.ts";
import { ROLES } from "../src/constants/roles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel: string, needle: string, label?: string) {
  assert.ok(read(rel).includes(needle), `${label ?? rel}: expected "${needle}"`);
}

assert.equal(hasOrgWideCaseVisibility(ROLES.SUPER_ADMIN), true);
assert.equal(hasOrgWideCaseVisibility(ROLES.ADMIN), true);
assert.equal(hasOrgWideCaseVisibility(ROLES.MANAGER), false);
assert.equal(hasOrgWideCaseVisibility(ROLES.ANALYST), false);

assert.equal(defaultRadarScope(ROLES.SUPER_ADMIN), "entire_organization");
assert.equal(defaultRadarScope(ROLES.ADMIN), "entire_organization");
assert.equal(defaultRadarScope(ROLES.MANAGER), "my_team");
assert.equal(defaultRadarScope(ROLES.VIEWER), "my_portfolio");

// Rahul SUPER_ADMIN — org-wide scope
assert.equal(
  actorCanSeeCase(
    { userId: "rahul", role: ROLES.SUPER_ADMIN },
    { primaryOwnerUserId: "ajay" },
    { scope: "entire_organization" },
  ),
  true,
);

// Ketan manager — sees Ajay via downline
assert.equal(
  actorCanSeeCase(
    { userId: "ketan", role: ROLES.MANAGER },
    { relationshipManagerUserId: "ajay" },
    { scope: "my_team", downlineUserIds: ["ketan", "ajay"] },
  ),
  true,
);

// Ketan — does not see unrelated peer case
assert.equal(
  actorCanSeeCase(
    { userId: "ketan", role: ROLES.MANAGER },
    { relationshipManagerUserId: "other-rm" },
    { scope: "my_team", downlineUserIds: ["ketan", "ajay"] },
  ),
  false,
);

// Ajay employee — own case
assert.equal(
  actorCanSeeCase(
    { userId: "ajay", role: ROLES.ANALYST },
    { primaryOwnerUserId: "ajay" },
    { scope: "my_portfolio", downlineUserIds: ["ajay"] },
  ),
  true,
);

// Ajay — does not see manager's unrelated case
assert.equal(
  actorCanSeeCase(
    { userId: "ajay", role: ROLES.ANALYST },
    { primaryOwnerUserId: "ketan" },
    { scope: "my_portfolio", downlineUserIds: ["ajay"] },
  ),
  false,
);

// Explicit co-owner — Ajay assigned with Ketan primary
assert.equal(
  actorCanSeeCase(
    { userId: "ajay", role: ROLES.ANALYST },
    {
      primaryOwnerUserId: "ketan",
      assignedUserIds: ["ketan", "ajay"],
    },
    { scope: "my_portfolio", downlineUserIds: ["ajay"] },
  ),
  true,
);

// Multi-owner — both see
assert.equal(
  actorCanSeeCase(
    { userId: "owner-a", role: ROLES.ANALYST },
    { assignedUserIds: ["owner-a", "owner-b"] },
    { scope: "my_portfolio", downlineUserIds: ["owner-a"] },
  ),
  true,
);
assert.equal(
  actorCanSeeCase(
    { userId: "owner-b", role: ROLES.ANALYST },
    { assignedUserIds: ["owner-a", "owner-b"] },
    { scope: "my_portfolio", downlineUserIds: ["owner-b"] },
  ),
  true,
);

// Hierarchy stamp — supervisor in hierarchyVisibilityUserIds
assert.equal(
  actorCanSeeCase(
    { userId: "ketan", role: ROLES.MANAGER },
    {
      primaryOwnerUserId: "ajay",
      hierarchyVisibilityUserIds: ["ketan", "rahul"],
    },
    { scope: "my_team", downlineUserIds: ["ketan"] },
  ),
  true,
);

mustContain(
  "src/components/catalyst-one/chanakya-radar/radar-status-scroll-card.tsx",
  "row.borrower?.trim()",
  "Radar card borrower primary",
);
mustContain(
  "src/components/catalyst-one/chanakya-radar/radar-status-scroll-card.tsx",
  "opportunityNumber",
  "Radar card opportunity secondary",
);
mustContain(
  "src/app/api/users/downline/route.ts",
  "resolveDownlineUserIds",
  "Downline API",
);
mustContain(
  "src/types/assigned-users.ts",
  "ASSIGNED_USER_IDS_EXTENSION_KEY",
  "assignedUserIds extension key",
);
mustContain(
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts",
  "buildDealVisibilityOrFilters",
  "Deal search uses visibility SSOT",
);
mustContain(
  "src/lib/chanakya-radar/portfolio-scope.ts",
  'return "entire_organization"',
  "SUPER_ADMIN default Radar scope",
);

console.log("CO-ORG-VISIBILITY-002 verify OK — role · hierarchy · multi-owner · Radar UI.");
