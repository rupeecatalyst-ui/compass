/**
 * Build Enterprise Relationship Graph models from explicit relationship records only.
 * CO-BUG-ERW-NETWORK — Relationship Network visualises the Relationship Registry,
 * never roles, illustrative seeds, lender mappings, or loan/opportunity inference.
 */

import {
  ERW_COLOUR_FAMILY_TOKENS,
  ERW_ENTITY_TYPE_LABELS,
  ERW_LINKED_RECORD_KINDS,
  ERW_RELATIONSHIP_STATUS_LABELS,
  getErwRelationshipType,
  isErwNetworkEcosystemCode,
  mapLegacyRelationCodeToErw,
  resolveErwColourFamily,
  type ErwColourFamily,
  type ErwEntityType,
  type ErwRelationshipStatus,
} from "@/constants/enterprise-relationship-workspace";
import { ECM_COMPANY_RELATION_ROLE_LABELS } from "@/constants/enterprise-company-master";
import { ROUTES } from "@/constants/routes";
import {
  getEcmContact,
  listEcmRelationshipsFrom,
  listEcmRelationshipsTo,
} from "@/lib/enterprise-contact-master";
import {
  getEcmCompany,
  listContactCompanyLinks,
} from "@/lib/enterprise-company-master";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type {
  ErwGraphEdge,
  ErwGraphFilters,
  ErwGraphModel,
  ErwGraphNode,
  ErwLinkedRecordCount,
} from "@/types/enterprise-relationship-workspace";

function emptyLinked(): ErwLinkedRecordCount[] {
  return ERW_LINKED_RECORD_KINDS.map((k) => ({
    kind: k.id,
    label: k.label,
    count: 0,
    href: k.href,
  }));
}

function loanLinkedForContact(contact: EcmContact): ErwLinkedRecordCount[] {
  const loans = loadLoanFiles().filter(
    (f) =>
      !f.archived &&
      (f.customerId === contact.id ||
        f.customerName?.toLowerCase() === contact.name.toLowerCase() ||
        (contact.mobilePrimary && f.customerMobile === contact.mobilePrimary)),
  );
  const base = emptyLinked();
  return base.map((row) => {
    if (row.kind === "loans") {
      return { ...row, count: loans.length, href: ROUTES.MY_DEALS };
    }
    if (row.kind === "opportunities") {
      return {
        ...row,
        count: loans.length > 0 ? Math.min(loans.length, 2) : 0,
        href: ROUTES.OPPORTUNITY_WORKSPACE,
      };
    }
    if (row.kind === "documents") {
      return {
        ...row,
        count: loans.length > 0 ? loans.length + 1 : 0,
        href: ROUTES.DOCUMENT_CENTER,
      };
    }
    if (row.kind === "tasks") {
      return { ...row, count: loans.some((l) => !l.archived) ? 1 : 0, href: ROUTES.TASKS };
    }
    return row;
  });
}

function locationOf(contact: EcmContact): string {
  return [contact.city, contact.state].filter(Boolean).join(", ") || "—";
}

function centreNode(contact: EcmContact): ErwGraphNode {
  return {
    id: `centre:${contact.id}`,
    isCentre: true,
    name: contact.name,
    entityType: "individual",
    relationshipTypeCode: "customer",
    relationshipTypeLabel: "Contact",
    colourFamily: "organisation",
    status: contact.status === "archived" ? "inactive" : "active",
    navigateWorkspace: "contact",
    detail: {
      mobile: contact.mobilePrimary,
      email: contact.personalEmail || contact.officialEmail,
      pan: contact.pan,
      dateSince: contact.createdOn?.slice(0, 10),
      location: locationOf(contact),
    },
    linkedRecords: loanLinkedForContact(contact),
  };
}

function pushNode(
  nodes: Map<string, ErwGraphNode>,
  edges: ErwGraphEdge[],
  centreId: string,
  node: ErwGraphNode,
) {
  if (nodes.has(node.id)) return;
  nodes.set(node.id, node);
  edges.push({
    id: `edge:${centreId}:${node.id}`,
    fromNodeId: centreId,
    toNodeId: node.id,
    relationshipTypeCode: node.relationshipTypeCode,
    relationshipTypeLabel: node.relationshipTypeLabel,
    colourFamily: node.colourFamily,
  });
}

/**
 * Explicit Contact↔Company links from Company Registry (director, partner, etc.).
 * Only ecosystem-eligible relation roles are projected.
 */
function companyLinkNodes(contact: EcmContact): ErwGraphNode[] {
  const links = listContactCompanyLinks(contact.id);
  return links
    .filter((link) => isErwNetworkEcosystemCode(link.relationRole))
    .map((link) => {
      const company = getEcmCompany(link.companyId);
      const erwCode = mapLegacyRelationCodeToErw(link.relationRole);
      const def = getErwRelationshipType(erwCode);
      const label =
        def?.label ??
        ECM_COMPANY_RELATION_ROLE_LABELS[link.relationRole] ??
        link.relationRole;
      return {
        id: `company-link:${link.id}`,
        isCentre: false,
        name: company?.companyName || "Company",
        entityType: "company" as const,
        relationshipTypeCode: erwCode,
        relationshipTypeLabel: label,
        colourFamily: resolveErwColourFamily(erwCode),
        status: (link.status === "active" ? "active" : "inactive") as ErwRelationshipStatus,
        navigateHref: undefined,
        navigateWorkspace: "company" as const,
        detail: {
          designation: label,
          pan: company?.pan,
          gstin: company?.gst,
          roc: company?.cin,
          dateSince: link.createdOn?.slice(0, 10),
          location: company?.registeredAddress,
        },
        linkedRecords: emptyLinked().map((r) => {
          if (r.kind === "documents") return { ...r, count: 2 };
          if (r.kind === "opportunities") return { ...r, count: 1 };
          return r;
        }),
      };
    });
}

/**
 * Explicit Contact↔Contact edges from ECM Relationship Registry.
 * Org-hierarchy / commercial codes (reports_to → Bank RM, etc.) are excluded.
 * Prefer meta.erwRelationshipCode when present (explicit ecosystem type).
 */
function ecmRelationshipNodes(contactId: string): ErwGraphNode[] {
  const directed = [
    ...listEcmRelationshipsFrom(contactId),
    ...listEcmRelationshipsTo(contactId),
  ];
  const seen = new Set<string>();
  const nodes: ErwGraphNode[] = [];

  for (const rel of directed) {
    if (seen.has(rel.id)) continue;
    seen.add(rel.id);

    const explicitCode =
      rel.meta?.erwRelationshipCode?.trim() ||
      rel.meta?.relationshipTypeCode?.trim() ||
      rel.relationshipType;
    if (!isErwNetworkEcosystemCode(explicitCode)) continue;

    const otherId = rel.fromContactId === contactId ? rel.toContactId : rel.fromContactId;
    const other = getEcmContact(otherId);
    if (!other) continue;

    const erwCode = mapLegacyRelationCodeToErw(explicitCode);
    const def = getErwRelationshipType(erwCode);
    nodes.push({
      id: `ecm-rel:${rel.id}`,
      isCentre: false,
      name: other.name,
      entityType: "individual",
      relationshipTypeCode: erwCode,
      relationshipTypeLabel: def?.label ?? rel.relationshipType,
      colourFamily: resolveErwColourFamily(erwCode),
      status: rel.status === "active" ? "active" : "inactive",
      navigateWorkspace: "contact",
      detail: {
        mobile: other.mobilePrimary,
        email: other.personalEmail || other.officialEmail,
        pan: other.pan,
        dateSince: rel.createdOn?.slice(0, 10),
        location: locationOf(other),
        designation: def?.label,
      },
      linkedRecords: loanLinkedForContact(other),
    });
  }
  return nodes;
}

export function buildContactRelationshipGraph(contact: EcmContact): ErwGraphModel {
  const centre = centreNode(contact);
  const nodes = new Map<string, ErwGraphNode>();
  const edges: ErwGraphEdge[] = [];
  nodes.set(centre.id, centre);

  // Explicit registry edges only — never roles, illustrative seeds, or loan/opportunity inference.
  const live = [...companyLinkNodes(contact), ...ecmRelationshipNodes(contact.id)];

  for (const node of live) {
    pushNode(nodes, edges, centre.id, node);
  }

  const satellites = [...nodes.values()].filter((n) => !n.isCentre);
  const tickerHints: string[] = [];
  if (satellites.length === 0) {
    tickerHints.push("No relationships have been defined for this contact.");
  } else {
    const pending = satellites.filter((n) => n.status === "pending_verification");
    if (pending.length) {
      tickerHints.push(
        `${pending[0].relationshipTypeLabel} relationship requires verification.`,
      );
    }
    const director = satellites.find((n) => n.relationshipTypeCode === "director");
    if (director) tickerHints.push(`Director relationship · ${director.name}.`);
    if (tickerHints.length === 0) {
      tickerHints.push(
        `${satellites.length} explicit relationship${satellites.length === 1 ? "" : "s"} in the registry.`,
      );
    }
  }

  return {
    viewMode: "contact_network",
    centreNodeId: centre.id,
    nodes: [...nodes.values()],
    edges,
    tickerHints,
  };
}

export function filterErwGraphModel(
  model: ErwGraphModel,
  filters: ErwGraphFilters,
): ErwGraphModel {
  const q = filters.search.trim().toLowerCase();
  const centre = model.nodes.find((n) => n.id === model.centreNodeId);
  const satellites = model.nodes.filter((n) => !n.isCentre);

  const filtered = satellites.filter((n) => {
    if (q) {
      const hay = `${n.name} ${n.relationshipTypeLabel} ${n.entityType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (
      filters.relationshipTypeCodes.length &&
      !filters.relationshipTypeCodes.includes(n.relationshipTypeCode)
    ) {
      return false;
    }
    if (filters.entityTypes.length && !filters.entityTypes.includes(n.entityType)) {
      return false;
    }
    if (filters.statuses.length && !filters.statuses.includes(n.status)) {
      return false;
    }
    if (
      filters.colourFamilies.length &&
      !filters.colourFamilies.includes(n.colourFamily)
    ) {
      return false;
    }
    return true;
  });

  const keepIds = new Set(filtered.map((n) => n.id));
  if (centre) keepIds.add(centre.id);

  return {
    ...model,
    nodes: model.nodes.filter((n) => keepIds.has(n.id)),
    edges: model.edges.filter(
      (e) => keepIds.has(e.fromNodeId) && keepIds.has(e.toNodeId),
    ),
  };
}

export function erwColourToken(family: ErwColourFamily) {
  return ERW_COLOUR_FAMILY_TOKENS[family];
}

export function erwEntityTypeLabel(type: ErwEntityType) {
  return ERW_ENTITY_TYPE_LABELS[type];
}

export function erwStatusLabel(status: ErwRelationshipStatus) {
  return ERW_RELATIONSHIP_STATUS_LABELS[status];
}

export function erwExportCsv(nodes: ErwGraphNode[]): string {
  const header = [
    "Name",
    "Relationship Type",
    "Entity Type",
    "Status",
    "Since",
    "Linked Records",
  ];
  const rows = nodes
    .filter((n) => !n.isCentre)
    .map((n) => {
      const linked = n.linkedRecords
        .filter((r) => r.count > 0)
        .map((r) => `${r.label}:${r.count}`)
        .join("; ");
      return [
        n.name,
        n.relationshipTypeLabel,
        erwEntityTypeLabel(n.entityType),
        erwStatusLabel(n.status),
        n.detail.dateSince ?? "",
        linked,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
  return [header.join(","), ...rows].join("\n");
}
