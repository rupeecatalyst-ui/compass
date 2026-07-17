/**
 * Enterprise Lender Workspace — relationship hierarchy (UI architecture).
 * Vacant ranks always remain visible.
 */

import {
  ELW_HIERARCHY_RANKS,
  ELW_HIERARCHY_STORAGE_KEY,
} from "@/constants/enterprise-lender-workspace";
import type {
  ElwHierarchyNode,
  ElwHierarchyPerson,
  ElwHierarchyRank,
} from "@/types/enterprise-lender-workspace";

type AssignmentMap = Record<string, Partial<Record<ElwHierarchyRank, ElwHierarchyPerson>>>;

function readAssignments(): AssignmentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ELW_HIERARCHY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AssignmentMap;
  } catch {
    return {};
  }
}

function writeAssignments(map: AssignmentMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ELW_HIERARCHY_STORAGE_KEY, JSON.stringify(map));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Demo seed — some ranks filled, some vacant (always show all levels). */
function seedForLender(lenderId: string): Partial<Record<ElwHierarchyRank, ElwHierarchyPerson>> {
  const base: Partial<Record<ElwHierarchyRank, ElwHierarchyPerson>> = {
    vice_president: {
      contactId: `${lenderId}-vp`,
      name: "Meera Krishnan",
      designation: "Vice President — Retail Lending",
      phone: "+91 98100 20001",
      email: `vp.${lenderId}@partner.example`,
      territory: "India",
      productsHandled: ["Home Loan", "LAP"],
      photoInitials: "MK",
      directReportsCount: 1,
    },
    national_head: {
      contactId: `${lenderId}-nh`,
      name: "Sanjay Oberoi",
      designation: "National Head",
      phone: "+91 98100 20002",
      email: `nh.${lenderId}@partner.example`,
      territory: "National",
      productsHandled: ["Home Loan", "LAP", "Business Loan"],
      photoInitials: "SO",
      directReportsCount: 1,
    },
    // regional_head intentionally vacant in seed for most lenders
    state_head: {
      contactId: `${lenderId}-sh`,
      name: "Neha Kulkarni",
      designation: "State Head — Maharashtra",
      phone: "+91 98100 20004",
      email: `sh.${lenderId}@partner.example`,
      territory: "Maharashtra",
      productsHandled: ["Home Loan"],
      photoInitials: "NK",
      directReportsCount: 1,
    },
    relationship_manager: {
      contactId: `${lenderId}-rm`,
      name: "Aarav Malhotra",
      designation: "Relationship Manager",
      phone: "+91 98100 20006",
      email: `rm.${lenderId}@partner.example`,
      territory: "Mumbai Metro",
      productsHandled: ["Home Loan", "LAP"],
      photoInitials: "AM",
      directReportsCount: 0,
    },
  };

  // HDFC gets a fuller chain for demo richness
  if (lenderId === "hdfc") {
    base.regional_head = {
      contactId: `${lenderId}-rh`,
      name: "Vikram Sethi",
      designation: "Regional Head — West",
      phone: "+91 98100 20003",
      email: `rh.${lenderId}@partner.example`,
      territory: "West",
      productsHandled: ["Home Loan", "LAP"],
      photoInitials: "VS",
      directReportsCount: 1,
    };
    base.cluster_head = {
      contactId: `${lenderId}-ch`,
      name: "Isha Banerjee",
      designation: "Cluster Head — Mumbai",
      phone: "+91 98100 20005",
      email: `ch.${lenderId}@partner.example`,
      territory: "Mumbai Cluster",
      productsHandled: ["Home Loan"],
      photoInitials: "IB",
      directReportsCount: 1,
    };
  }

  return base;
}

export function deriveElwHierarchy(lenderId: string): ElwHierarchyNode[] {
  const stored = readAssignments()[lenderId] ?? {};
  const seeded = seedForLender(lenderId);
  const merged: Partial<Record<ElwHierarchyRank, ElwHierarchyPerson>> = {
    ...seeded,
    ...stored,
  };

  return ELW_HIERARCHY_RANKS.map((rankDef, index) => {
    const person = merged[rankDef.rank] ?? null;
    return {
      id: `${lenderId}-${rankDef.rank}`,
      rank: rankDef.rank,
      rankLabel: rankDef.label,
      levelIndex: index,
      person,
      parentId: index === 0 ? null : `${lenderId}-${ELW_HIERARCHY_RANKS[index - 1].rank}`,
    };
  });
}

export function assignElwHierarchyContact(
  lenderId: string,
  rank: ElwHierarchyRank,
  input: {
    name: string;
    phone: string;
    email: string;
    state: string;
    city: string;
  },
): ElwHierarchyPerson {
  const person: ElwHierarchyPerson = {
    contactId: `${lenderId}-${rank}-${Date.now().toString(36)}`,
    name: input.name.trim(),
    designation: ELW_HIERARCHY_RANKS.find((r) => r.rank === rank)?.label ?? rank,
    phone: input.phone.trim(),
    email: input.email.trim(),
    territory: [input.city, input.state].filter(Boolean).join(", "),
    productsHandled: [],
    photoInitials: initials(input.name.trim()) || "??",
    directReportsCount: 0,
  };

  const map = readAssignments();
  map[lenderId] = { ...(map[lenderId] ?? {}), [rank]: person };
  writeAssignments(map);

  // bump parent direct reports if present (UI-only)
  const nodes = deriveElwHierarchy(lenderId);
  const idx = nodes.findIndex((n) => n.rank === rank);
  if (idx > 0) {
    const parentRank = nodes[idx - 1].rank;
    const parent = map[lenderId]?.[parentRank] ?? seedForLender(lenderId)[parentRank];
    if (parent) {
      const nextParent = {
        ...parent,
        directReportsCount: (parent.directReportsCount ?? 0) + 1,
      };
      map[lenderId] = { ...(map[lenderId] ?? {}), [parentRank]: nextParent };
      writeAssignments(map);
    }
  }

  return person;
}

export function getReportingManagerLabel(lenderId: string, rank: ElwHierarchyRank): string {
  const nodes = deriveElwHierarchy(lenderId);
  const idx = nodes.findIndex((n) => n.rank === rank);
  if (idx <= 0) return "—";
  const parent = nodes[idx - 1];
  return parent.person ? `${parent.person.name} · ${parent.rankLabel}` : `${parent.rankLabel} (Vacant)`;
}
