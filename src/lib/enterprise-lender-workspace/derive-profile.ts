import { ECM_MASTER_CATALOGS } from "@/constants/enterprise-contact-master/masters";
import {
  normalizeLenderId,
  toLenderRef,
} from "@/constants/enterprise-lender-workspace";
import { getLifeRegistrySnapshot, seedLifeContactsIfEmpty } from "@/lib/enterprise-life-engine";
import type {
  ElwLenderProfile,
  ElwRegistryEntry,
  ElwRelationshipContact,
} from "@/types/enterprise-lender-workspace";
import type { LifeLenderContact } from "@/types/enterprise-life-engine";

function productLabel(ref: string): string {
  return ref
    .replace(/^product:/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function designationFromContact(contact: LifeLenderContact): string {
  if (contact.roles.includes("relationship_manager")) return "Relationship Manager";
  if (contact.roles.includes("credit")) return "Credit Officer";
  if (contact.roles.includes("operations")) return "Operations";
  if (contact.lenderExecutor) return "Lender Executive";
  return "Lender Contact";
}

function contactsForLender(lenderRef: string): LifeLenderContact[] {
  seedLifeContactsIfEmpty();
  return getLifeRegistrySnapshot().contacts.filter(
    (c) => c.lenderRef === lenderRef && c.enabled && c.activeStatus === "active",
  );
}

function metricsFromContacts(contacts: LifeLenderContact[]): ElwLenderProfile["metrics"] {
  const executorCount = contacts.filter((c) => c.lenderExecutor).length;
  const base = 62 + Math.min(28, executorCount * 6 + contacts.length * 2);
  return {
    successProbability: Math.min(94, base),
    approvalRateLabel: `${Math.min(88, 58 + executorCount * 5)}%`,
    averageTatDays: Math.max(4, 12 - executorCount),
    activeCases: Math.max(1, executorCount * 3),
    relationshipStrength:
      executorCount >= 2 ? "strong" : executorCount === 1 ? "steady" : "building",
  };
}

function policyForLender(name: string): ElwLenderProfile["policy"] {
  return {
    headline: `${name} · indicative policy posture for Relationship Managers`,
    bullets: [
      "Prefers complete income documentation before pre-login.",
      "Metro and Tier-1 cities receive priority processing windows.",
      "Relationship Managers should confirm product eligibility before login.",
      "Policy variances require branch credit acknowledgement — not auto-approved.",
    ],
  };
}

function documentsForLender(lenderId: string): ElwLenderProfile["documents"] {
  return [
    {
      id: `${lenderId}-doc-policy`,
      title: "Product policy summary",
      category: "Policy",
      status: "available",
    },
    {
      id: `${lenderId}-doc-checklist`,
      title: "Document checklist — Home Loan",
      category: "Checklist",
      status: "available",
    },
    {
      id: `${lenderId}-doc-tat`,
      title: "TAT service commitment",
      category: "Operations",
      status: "request",
    },
  ];
}

function chanakyaInsight(
  name: string,
  metrics: ElwLenderProfile["metrics"],
): ElwLenderProfile["chanakya"] {
  return {
    headline: `${name} fits this workflow when documentation is ready.`,
    body: `Success outlook around ${metrics.successProbability}% with ${metrics.relationshipStrength} relationship strength. Keep the conversation on timelines and eligibility — not product pitching.`,
    recommendation:
      metrics.relationshipStrength === "strong"
        ? "Select this lender if the customer profile matches stated eligibility."
        : "Review contacts and policy, then select consciously before login.",
  };
}

function profileFromContacts(
  lenderId: string,
  lenderRef: string,
  name: string,
  headquartersCity: string | undefined,
  contacts: LifeLenderContact[],
): ElwLenderProfile {
  const metrics = metricsFromContacts(contacts);
  const productRefs = [...new Set(contacts.flatMap((c) => c.productRefs))];
  const cities = [...new Set(contacts.map((c) => c.city).filter(Boolean))];
  const branchNames = [
    ...new Set(contacts.map((c) => c.branchName).filter(Boolean) as string[]),
  ];

  const mappedContacts: ElwRelationshipContact[] = contacts.map((c) => ({
    contactId: c.id,
    name: c.contactName,
    designation: designationFromContact(c),
    branchName: c.branchName,
    city: c.city,
    mobile: c.mobile,
    email: c.email,
    isExecutor: c.lenderExecutor,
  }));

  return {
    lenderId,
    lenderRef,
    name,
    code: lenderId.toUpperCase().slice(0, 6),
    headquartersCity,
    overview: `${name} is available as an enterprise lending partner. Evaluate products, policy, and relationship contacts here — then return to your workflow to continue.`,
    metrics,
    products: productRefs.map((ref) => ({ productRef: ref, label: productLabel(ref) })),
    policy: policyForLender(name),
    contacts: mappedContacts,
    documents: documentsForLender(lenderId),
    chanakya: chanakyaInsight(name, metrics),
    cities,
    branchNames,
  };
}

/** Resolve a dedicated ELW profile for any known lender id / ref. */
export function deriveElwLenderProfile(rawLenderId: string): ElwLenderProfile | null {
  const lenderId = normalizeLenderId(rawLenderId);
  if (!lenderId || lenderId === "other") return null;

  const lenderRef = toLenderRef(lenderId);
  const contacts = contactsForLender(lenderRef);
  const master = ECM_MASTER_CATALOGS.lender.find((l) => l.id === lenderId);
  const nameFromContacts = contacts[0]?.lenderName;
  const name = master?.label ?? nameFromContacts;

  if (!name && contacts.length === 0) {
    // Still allow opening a thin workspace for known ECM ids with no LIFE contacts yet
    if (!master) return null;
  }

  return profileFromContacts(
    lenderId,
    lenderRef,
    name ?? master!.label,
    typeof master?.meta?.city === "string" ? master.meta.city : contacts[0]?.city,
    contacts,
  );
}

export function listElwRegistryEntries(): ElwRegistryEntry[] {
  seedLifeContactsIfEmpty();
  const byRef = new Map<string, ElwRegistryEntry>();

  for (const contact of getLifeRegistrySnapshot().contacts) {
    if (!contact.enabled) continue;
    const lenderId = normalizeLenderId(contact.lenderRef);
    const existing = byRef.get(contact.lenderRef);
    if (existing) {
      existing.contactCount += 1;
      existing.productCount = Math.max(existing.productCount, contact.productRefs.length);
    } else {
      byRef.set(contact.lenderRef, {
        lenderId,
        lenderRef: contact.lenderRef,
        name: contact.lenderName,
        contactCount: 1,
        productCount: contact.productRefs.length,
        headquartersCity: contact.city,
      });
    }
  }

  for (const master of ECM_MASTER_CATALOGS.lender) {
    if (master.id === "other") continue;
    const ref = toLenderRef(master.id);
    if (byRef.has(ref)) continue;
    byRef.set(ref, {
      lenderId: master.id,
      lenderRef: ref,
      name: master.label,
      contactCount: 0,
      productCount: 0,
      headquartersCity: typeof master.meta?.city === "string" ? master.meta.city : undefined,
    });
  }

  return [...byRef.values()].sort((a, b) => a.name.localeCompare(b.name));
}
