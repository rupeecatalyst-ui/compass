/**
 * EOWE foundation validation — smoke checks for Sprint 4 deliverable verification.
 * Not a test suite; invoked manually or by CI when needed.
 */

import {
  EOWE_LIFECYCLE_STATUS,
  EOWE_NODE_TYPES,
  EOWE_OWNERSHIP_TYPES,
} from "@/constants/enterprise-organization-workspace-engine";
import {
  createEoweHierarchyNode,
  getEoweRegistrySnapshot,
  getEoweReportingChain,
  listEoweDirectReports,
  registerEoweOwnership,
  registerEoweTenantBoundary,
  registerEoweWorkspace,
  resetEoweComposition,
  transitionEoweOrgLifecycle,
  upsertEoweOrganizationMetadata,
  validateEoweParentChildRelationship,
} from "./index";

export function runEoweFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEoweComposition();

  const tenant = registerEoweTenantBoundary({
    tenantId: "T1",
    tenantCode: "ACME",
    displayName: "Acme Corp",
  });

  const org = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "ORG1",
    nodeType: EOWE_NODE_TYPES.ORGANIZATION,
    displayName: "Acme",
    createdBy: "system",
    legalName: "Acme Ltd",
  });

  const bu = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "BU1",
    nodeType: EOWE_NODE_TYPES.BUSINESS_UNIT,
    displayName: "Retail",
    parentNodeId: org.id,
    createdBy: "system",
  });

  const region = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "R1",
    nodeType: EOWE_NODE_TYPES.REGION,
    displayName: "West",
    parentNodeId: bu.id,
    createdBy: "system",
  });

  const zone = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "Z1",
    nodeType: EOWE_NODE_TYPES.ZONE,
    displayName: "Zone A",
    parentNodeId: region.id,
    createdBy: "system",
  });

  const branch = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "B1",
    nodeType: EOWE_NODE_TYPES.BRANCH,
    displayName: "Mumbai",
    parentNodeId: zone.id,
    createdBy: "system",
  });

  const dept = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "D1",
    nodeType: EOWE_NODE_TYPES.DEPARTMENT,
    displayName: "Sales",
    parentNodeId: branch.id,
    createdBy: "system",
  });

  const team = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "TM1",
    nodeType: EOWE_NODE_TYPES.TEAM,
    displayName: "Alpha",
    parentNodeId: dept.id,
    createdBy: "system",
  });

  const mgr = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "P1",
    nodeType: EOWE_NODE_TYPES.POSITION,
    displayName: "Manager",
    parentNodeId: team.id,
    createdBy: "system",
    positionLevel: 2,
  });

  const rep = createEoweHierarchyNode({
    tenantId: "T1",
    nodeCode: "P2",
    nodeType: EOWE_NODE_TYPES.POSITION,
    displayName: "Rep",
    parentNodeId: team.id,
    createdBy: "system",
    reportsToPositionId: mgr.id,
    positionLevel: 1,
  });

  const activated = transitionEoweOrgLifecycle({
    nodeId: org.id,
    action: "activate",
    actorId: "system",
  });

  registerEoweWorkspace({
    tenantId: "T1",
    workspaceCode: "WS1",
    displayName: "Retail WS",
    anchorNodeId: bu.id,
    createdBy: "system",
  });

  registerEoweOwnership({
    tenantId: "T1",
    entityNodeId: branch.id,
    ownerRef: "identity-1",
    ownershipType: EOWE_OWNERSHIP_TYPES.PRIMARY,
    createdBy: "system",
  });

  upsertEoweOrganizationMetadata({
    tenantId: "T1",
    nodeId: branch.id,
    metadata: { city: "Mumbai" },
    modifiedBy: "system",
  });

  const snap = getEoweRegistrySnapshot();
  const chain = getEoweReportingChain(rep.id);
  const reports = listEoweDirectReports(mgr.id);

  let rejectionChecks = 0;
  try {
    validateEoweParentChildRelationship("branch", { ...branch, nodeType: "organization" } as never);
  } catch {
    rejectionChecks += 1;
  }

  try {
    createEoweHierarchyNode({
      tenantId: "T1",
      nodeCode: "ORG1",
      nodeType: EOWE_NODE_TYPES.ORGANIZATION,
      displayName: "Dup",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    transitionEoweOrgLifecycle({ nodeId: org.id, action: "archive", actorId: "system" });
    transitionEoweOrgLifecycle({ nodeId: org.id, action: "activate", actorId: "system" });
  } catch {
    rejectionChecks += 1;
  }

  const passed =
    snap.nodes.length === 9 &&
    snap.workspaces.length === 1 &&
    snap.ownerships.length === 1 &&
    snap.metadata.length === 1 &&
    chain.length === 2 &&
    reports.length === 1 &&
    rejectionChecks === 3 &&
    activated?.lifecycleStatus === EOWE_LIFECYCLE_STATUS.ACTIVE &&
    tenant.tenantCode === "ACME";

  return {
    passed,
    details: {
      tenant: tenant.tenantCode,
      nodes: snap.nodes.length,
      workspaces: snap.workspaces.length,
      ownerships: snap.ownerships.length,
      metadata: snap.metadata.length,
      reportingChain: chain.length,
      directReports: reports.length,
      rejectionChecks,
      orgLifecycle: activated?.lifecycleStatus,
    },
  };
}
