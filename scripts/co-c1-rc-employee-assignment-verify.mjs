/**
 * CO-C1-RC-EMPLOYEE-ASSIGNMENT-001 — focused verifier.
 * Pure inheritance/override helpers + wiring checks. No production writes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyDealRcEmployeeReconcile,
  mergeDealControlParticipants,
  overlayDealRcEmployeeDisplay,
  resolveCreateDealRcEmployee,
  shouldPropagateOpportunityAssignmentToDeal,
  isGenericRcEmployeeName,
  isPlaceholderRcEmployee,
} from "../src/lib/enterprise-deal/rc-employee-assignment.ts";
import { canManageRegistryAssignments } from "../src/lib/assigned-users/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) failures.push(`${rel} missing ${label}`);
}

function expect(name, condition) {
  if (!condition) failures.push(name);
}

const ketan = {
  relationshipManagerUserId: "user-ketan",
  relationshipManagerName: "Ketan Kapoor",
  primaryOwnerUserId: "user-ketan",
};
const actor = {
  relationshipManagerUserId: "user-admin",
  relationshipManagerName: "Admin User",
  primaryOwnerUserId: "user-admin",
};

const created = resolveCreateDealRcEmployee({
  opportunity: ketan,
  incoming: actor,
  actorUserId: "user-admin",
});
expect("create inherits Ketan over actor default", created.userId === "user-ketan" && created.source === "inherited");

const emptyIncoming = resolveCreateDealRcEmployee({
  opportunity: ketan,
  incoming: {},
  actorUserId: "user-admin",
});
expect("create inherits when incoming empty", emptyIncoming.userId === "user-ketan");

const overrideCreate = resolveCreateDealRcEmployee({
  opportunity: ketan,
  incoming: {
    relationshipManagerUserId: "user-other",
    relationshipManagerName: "Priya Shah",
    primaryOwnerUserId: "user-other",
  },
  actorUserId: "user-admin",
});
expect("explicit other employee is deal override on create", overrideCreate.source === "override" && overrideCreate.userId === "user-other");

expect("generic Admin User name is placeholder without id", isGenericRcEmployeeName("Admin User"));
expect("named employee is not placeholder", !isPlaceholderRcEmployee({ userId: "user-ketan", name: "Ketan Kapoor" }));

const inheritedDeal = {
  relationshipManagerUserId: "user-ketan",
  relationshipManagerName: "Ketan Kapoor",
  assignmentMode: "inherited",
};
const overrideDeal = {
  relationshipManagerUserId: "user-other",
  relationshipManagerName: "Priya Shah",
  assignmentMode: "override",
};
expect("inherited deals propagate", shouldPropagateOpportunityAssignmentToDeal(inheritedDeal) === true);
expect("override deals do not propagate", shouldPropagateOpportunityAssignmentToDeal(overrideDeal) === false);

expect(
  "existing deal without employee needs inherit",
  classifyDealRcEmployeeReconcile({
    deal: { relationshipManagerUserId: null, relationshipManagerName: null },
    opportunity: ketan,
  }) === "needs-inherit",
);
expect(
  "override class preserved",
  classifyDealRcEmployeeReconcile({ deal: overrideDeal, opportunity: ketan }) === "ok-override",
);
expect(
  "matching inherited is ok",
  classifyDealRcEmployeeReconcile({ deal: inheritedDeal, opportunity: ketan }) === "ok-inherited",
);

const display = overlayDealRcEmployeeDisplay({
  deal: { relationshipManagerUserId: null, relationshipManagerName: null, assignmentMode: "inherited" },
  opportunity: ketan,
});
expect("display resolves missing deal employee from opportunity", display.userId === "user-ketan" && display.resolvedFromOpportunity === true);

const overrideDisplay = overlayDealRcEmployeeDisplay({
  deal: overrideDeal,
  opportunity: ketan,
});
expect("override display keeps deal employee", overrideDisplay.userId === "user-other" && overrideDisplay.resolvedFromOpportunity === false);

const participants = mergeDealControlParticipants({
  customerName: "Anita Sharma",
  customerId: "c1",
  rcEmployeeName: "Ketan Kapoor",
  rcEmployeeUserId: "user-ketan",
  lenderSalesContactName: "Ravi Lender",
  lenderSalesContactId: "lender-emp-1",
  lenderSalesContactRole: "Lender Sales Contact",
});
expect("customer + rc + lender participants", participants.length === 3);
expect(
  "no duplicate rc employee",
  participants.filter((row) => row.role === "Rupee Catalyst Employee").length === 1,
);
expect(
  "lender sales remains separate",
  participants.some((row) => row.role === "Lender Sales Contact" && row.name === "Ravi Lender"),
);

const dupes = mergeDealControlParticipants({
  customerName: "Anita Sharma",
  rcEmployeeName: "Ketan Kapoor",
  rcEmployeeUserId: "user-ketan",
  lenderSalesContactName: "Ketan Kapoor",
  lenderSalesContactId: "other",
  lenderSalesContactRole: "Lender Sales Contact",
});
expect(
  "same display name allowed when roles differ",
  dupes.filter((row) => row.name === "Ketan Kapoor").length === 2,
);

expect("viewer cannot assign", canManageRegistryAssignments("VIEWER") === false);
expect("manager can assign", canManageRegistryAssignments("MANAGER") === true);
expect("analyst can assign", canManageRegistryAssignments("ANALYST") === true);
expect(
  "loan_workspace createEdit capability grants assign",
  canManageRegistryAssignments("VIEWER", [
    { moduleId: "loan_workspace", view: true, createEdit: true, admin: false },
  ]) === true,
);
expect(
  "loan_workspace view-only capability does not grant assign",
  canManageRegistryAssignments("VIEWER", [
    { moduleId: "loan_workspace", view: true, createEdit: false, admin: false },
  ]) === false,
);
mustContain(
  "src/components/catalyst-one/execution/rc-employee-assignment-control.tsx",
  "getEnterpriseUser",
  "RC picker uses EUM capabilities",
);

mustContain("server/services/enterprise-deal/enterprise-deal.service.ts", "stampCreateDealRcEmployee", "create uses inheritance stamp");
mustContain("server/services/enterprise-deal/enterprise-deal.service.ts", "rcEmployeeAssignment", "deal patch override action");
mustContain("server/services/enterprise-opportunity/index.ts", "propagateOpportunityRcEmployeeToInheritedDeals", "opportunity change propagates");
mustContain("src/components/catalyst-one/execution/deal-control-panel.tsx", "RcEmployeeAssignmentControl", "Deal Control picker");
mustContain("src/components/catalyst-one/execution/rc-employee-assignment-control.tsx", "Restore Opportunity inheritance", "restore inheritance CTA");
mustContain("src/components/catalyst-one/execution/deal-control-panel.tsx", "mergeDealControlParticipants", "deduped participants");
mustContain("server/services/enterprise-deal/deal-validation.ts", "DealForbiddenError", "403 forbidden class");
mustContain("src/app/api/enterprise-deals/_lib/route-utils.ts", "DealForbiddenError", "route maps 403");
mustContain("src/lib/enterprise-deal/deal-pipeline-runtime.ts", "deal.relationshipManagerName || derived?.relationshipManager", "Kanban RM prefers Deal column");
mustContain("scripts/co-c1-rc-employee-assignment-reconcile.mjs", "dryRun", "reconcile dry-run default");

if (failures.length) {
  console.error("CO-C1-RC-EMPLOYEE-ASSIGNMENT-001 FAIL");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("CO-C1-RC-EMPLOYEE-ASSIGNMENT-001 PASS");
console.log(JSON.stringify({
  createInheritsKetan: created.name,
  displayResolvesOpportunity: display.name,
  participantRoles: participants.map((row) => row.role),
}, null, 2));
