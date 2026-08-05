/**
 * CO-UX-013 — Contact Strategy / Network Workspace live registry projection.
 *
 * Reads only Enterprise Contact Registry + ECM Contact Relationships.
 * Never seeds, mocks, or invents nodes for the production canvas.
 */

import {
  ECM_RELATIONSHIP_TYPE_LABELS,
  listEcmContactRelationships,
} from "@/lib/enterprise-contact-master/contact-relationships";
import {
  findOperationalEcmContactById,
  listOperationalEcmContacts,
} from "@/lib/enterprise-registry";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type { RicCategory, RicColourFamily, RicContact, RicRelationship } from "./ric-types";

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function roleToCategory(role: EcmContactRole | undefined): RicCategory {
  switch (role) {
    case "chartered_accountant":
      return "CA";
    case "builder":
      return "Builder";
    case "lender_employee":
      return "Bank";
    case "partner":
    case "investor":
      return "Lawyer";
    case "employee":
      return "Relationship Manager";
    case "customer":
    default:
      return "Customer";
  }
}

function roleToColour(role: EcmContactRole | undefined): RicColourFamily {
  switch (role) {
    case "chartered_accountant":
      return "professional";
    case "builder":
      return "business";
    case "lender_employee":
      return "financial";
    case "partner":
    case "investor":
      return "government_legal";
    case "employee":
      return "organisation";
    case "customer":
    default:
      return "organisation";
  }
}

function profileField(contact: EcmContact, keys: string[]): string {
  const profiles = contact.roleProfiles ?? {};
  const role = contact.primaryRole;
  const bag = (role && profiles[role]) || {};
  for (const key of keys) {
    const value = trimOrEmpty(bag[key]);
    if (value) return value;
  }
  for (const profile of Object.values(profiles)) {
    if (!profile) continue;
    for (const key of keys) {
      const value = trimOrEmpty(profile[key]);
      if (value) return value;
    }
  }
  return "";
}

/** Project an ECM Contact into the RIC node shape (display only). */
export function ecmContactToRicContact(contact: EcmContact): RicContact {
  const company =
    profileField(contact, ["firmName", "institution", "companyName", "employerName"]) ||
    trimOrEmpty(contact.city) ||
    "—";
  const businessRole =
    profileField(contact, ["designation", "title", "jobTitle"]) ||
    designationFallback(contact.primaryRole);

  return {
    id: contact.id,
    name: contact.name,
    category: roleToCategory(contact.primaryRole),
    businessRole,
    company,
    relationshipScore:
      typeof contact.contactScore === "number" && Number.isFinite(contact.contactScore)
        ? Math.round(contact.contactScore)
        : 0,
    colourFamily: roleToColour(contact.primaryRole),
    lastMeeting: undefined,
    lastCall: undefined,
    lastFollowUp: undefined,
  };
}

function designationFallback(role: EcmContactRole | undefined): string {
  if (!role) return "Contact";
  return role.replace(/_/g, " ");
}

/**
 * Network Workspace contact pool — all operational ECM contacts.
 * Strategic contacts (if flagged) sort first; never falls back to mock data.
 */
export function listNetworkWorkspaceContacts(options?: {
  query?: string;
}): RicContact[] {
  const q = options?.query?.trim().toLowerCase() ?? "";
  let rows = listOperationalEcmContacts();

  if (q) {
    rows = rows.filter((c) => {
      const hay = [c.name, c.mobilePrimary, c.personalEmail, c.officialEmail, c.city, c.primaryRole]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return rows
    .map(ecmContactToRicContact)
    .sort((a, b) => {
      const aRow = findOperationalEcmContactById(a.id);
      const bRow = findOperationalEcmContactById(b.id);
      const aStrategic = aRow?.strategicContact ? 0 : 1;
      const bStrategic = bRow?.strategicContact ? 0 : 1;
      if (aStrategic !== bStrategic) return aStrategic - bStrategic;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
}

export function getNetworkContactById(id: string): RicContact | undefined {
  const row = findOperationalEcmContactById(id);
  return row ? ecmContactToRicContact(row) : undefined;
}

/** First-level neighbours from live ECM relationship registry only. */
export function listNetworkFirstLevel(contactId: string): {
  centre: RicContact | undefined;
  neighbours: RicContact[];
  edges: RicRelationship[];
} {
  const centreRow = findOperationalEcmContactById(contactId);
  if (!centreRow) return { centre: undefined, neighbours: [], edges: [] };

  const centre = ecmContactToRicContact(centreRow);
  const operational = new Map(
    listOperationalEcmContacts().map((c) => [c.id, c] as const),
  );

  const edges: RicRelationship[] = [];
  const neighbourIds = new Set<string>();

  for (const rel of listEcmContactRelationships()) {
    const fromHere = rel.fromContactId === contactId;
    const toHere = rel.toContactId === contactId;
    if (!fromHere && !toHere) continue;

    const otherId = fromHere ? rel.toContactId : rel.fromContactId;
    if (!operational.has(otherId)) continue;

    neighbourIds.add(otherId);
    edges.push({
      id: rel.id,
      fromId: rel.fromContactId,
      toId: rel.toContactId,
      label: ECM_RELATIONSHIP_TYPE_LABELS[rel.relationshipType] ?? rel.relationshipType,
    });
  }

  const neighbours = [...neighbourIds]
    .map((id) => {
      const row = operational.get(id);
      return row ? ecmContactToRicContact(row) : undefined;
    })
    .filter((c): c is RicContact => Boolean(c))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  return { centre, neighbours, edges };
}
