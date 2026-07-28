/**
 * CO-WP-003 — Wealth Partner Network Intelligence (read-only).
 * Builds hierarchical Business Network tree with Opportunity/Deal projections.
 * Never writes Contacts, Companies, Opportunities, Deals, or Commission Engine.
 */

import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { wealthPartnerRegistryRepository } from "@server/repositories/wealth-partner-registry";
import { mapWealthPartner } from "@server/repositories/wealth-partner-registry/mappers";
import {
  WEALTH_PARTNER_NETWORK_INTELLIGENCE_DEFINITION,
  WEALTH_PARTNER_NETWORK_RELATIONSHIP_TYPES,
  WEALTH_PARTNER_TYPE_OPTIONS,
  buildCompanyWorkspaceHref,
  buildContactWorkspaceHref,
  buildWealthPartnerWorkspaceHref,
  wealthPartnerTypeLabel,
} from "@/constants/enterprise-wealth-partner-registry";
import type {
  EnterpriseWealthPartnerRecord,
  WealthPartnerNetworkFilterOptions,
  WealthPartnerNetworkIntelligenceBundle,
  WealthPartnerNetworkIntelligenceFilters,
  WealthPartnerNetworkNodeHealth,
  WealthPartnerNetworkNodeKind,
  WealthPartnerNetworkNodeMetrics,
  WealthPartnerNetworkTreeNode,
  WealthPartnerOperationalStatus,
  WealthPartnerLifecycleStatus,
} from "@/types/enterprise-wealth-partner-registry";
import { WealthPartnerValidationError } from "./wealth-partner-registry.service";

const MAX_DEPTH = 24;

type OppRow = {
  id: string;
  sourceContactId: string | null;
  companyId: string | null;
  productCode: string | null;
  productLabel: string | null;
  branchId: string | null;
  stateLabel: string | null;
  cityLabel: string | null;
  requestedAmount: { toNumber?: () => number } | number | null;
  createdAt: Date;
};

type DealRow = {
  id: string;
  opportunityId: string | null;
  sourceContactId: string | null;
  companyId: string | null;
  productCode: string | null;
  productLabel: string | null;
  branchId: string | null;
  fulfilledAmount: { toNumber?: () => number } | number | null;
  revenueReceived: { toNumber?: () => number } | number | null;
  requestedAmount: { toNumber?: () => number } | number | null;
  grossStage: string | null;
  createdAt: Date;
};

function num(v: { toNumber?: () => number } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v.toNumber === "function") {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function emptyMetrics(): WealthPartnerNetworkNodeMetrics {
  return {
    businessVolume: 0,
    opportunitiesGenerated: 0,
    dealsConverted: 0,
    conversionRatio: 0,
    commissionPayable: 0,
    lastActivityAt: null,
  };
}

function conversionRatio(opps: number, dealsWonOrConverted: number): number {
  if (opps <= 0) return 0;
  return Math.round((dealsWonOrConverted / opps) * 1000) / 10;
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function resolvePeriodRange(
  filters: WealthPartnerNetworkIntelligenceFilters,
  now = new Date(),
): { from: Date | null; to: Date | null } {
  const period = filters.period ?? "all";
  if (period === "all") return { from: null, to: null };

  if (period === "month") {
    const key = filters.periodKey?.trim();
    let y = now.getUTCFullYear();
    let m = now.getUTCMonth();
    if (key && /^\d{4}-\d{2}$/.test(key)) {
      y = Number(key.slice(0, 4));
      m = Number(key.slice(5, 7)) - 1;
    }
    const from = new Date(Date.UTC(y, m, 1));
    const to = new Date(Date.UTC(y, m + 1, 1));
    return { from, to };
  }

  if (period === "quarter") {
    const key = filters.periodKey?.trim();
    let y = now.getUTCFullYear();
    let q = Math.floor(now.getUTCMonth() / 3) + 1;
    const m = key?.match(/^(\d{4})-Q([1-4])$/i);
    if (m) {
      y = Number(m[1]);
      q = Number(m[2]);
    }
    const startMonth = (q - 1) * 3;
    const from = new Date(Date.UTC(y, startMonth, 1));
    const to = new Date(Date.UTC(y, startMonth + 3, 1));
    return { from, to };
  }

  // Indian FY: Apr (Y) → Mar (Y+1). periodKey = start year as string.
  let startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const key = filters.periodKey?.trim();
  if (key && /^\d{4}$/.test(key)) startYear = Number(key);
  else if (key) {
    const fy = key.match(/FY\s*(\d{4})/i);
    if (fy) startYear = Number(fy[1]);
  }
  return {
    from: new Date(Date.UTC(startYear, 3, 1)),
    to: new Date(Date.UTC(startYear + 1, 3, 1)),
  };
}

function inRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (from && d < from) return false;
  if (to && d >= to) return false;
  return true;
}

function mapNodeKind(
  partnerType: string | null | undefined,
  identityKind: "contact" | "company" | "root",
  isRoot: boolean,
): WealthPartnerNetworkNodeKind {
  if (isRoot) return "wealth_partner";
  if (identityKind === "company" && (!partnerType || partnerType === "corporate" || partnerType === "others")) {
    return "company";
  }
  const t = (partnerType ?? "").toLowerCase();
  const known: WealthPartnerNetworkNodeKind[] = [
    "chartered_accountant",
    "builder",
    "dsa",
    "architect",
    "property_consultant",
    "financial_consultant",
    "referral_associate",
  ];
  if ((known as string[]).includes(t)) return t as WealthPartnerNetworkNodeKind;
  if (t === "corporate") return "company";
  return "other";
}

function resolveHealth(input: {
  status?: string | null;
  operationalStatus?: WealthPartnerOperationalStatus | string | null;
  lifecycleStatus?: WealthPartnerLifecycleStatus | string | null;
}): WealthPartnerNetworkNodeHealth {
  const status = (input.status ?? "").toLowerCase();
  const operational = (input.operationalStatus ?? "").toLowerCase();
  const lifecycle = (input.lifecycleStatus ?? "").toLowerCase();

  if (
    status === "inactive" ||
    status === "ended" ||
    operational === "inactive" ||
    lifecycle === "retired" ||
    lifecycle === "suspended"
  ) {
    return "inactive";
  }
  if (operational === "restricted" || lifecycle === "onboarding" || lifecycle === "draft") {
    return "needs_attention";
  }
  return "active";
}

function relationshipLabel(code: string): string {
  return (
    WEALTH_PARTNER_NETWORK_RELATIONSHIP_TYPES.find((o) => o.value === code)?.label ??
    code
  );
}

function buildFilterOptions(
  opps: OppRow[],
  deals: DealRow[],
  now = new Date(),
): WealthPartnerNetworkFilterOptions {
  const products = new Map<string, string>();
  const branches = new Map<string, string>();
  const regions = new Map<string, string>();

  for (const o of opps) {
    if (o.productCode) {
      products.set(o.productCode, o.productLabel || o.productCode);
    }
    if (o.branchId) branches.set(o.branchId, o.branchId);
    const region = o.stateLabel || o.cityLabel;
    if (region) regions.set(region, region);
  }
  for (const d of deals) {
    if (d.productCode) {
      products.set(d.productCode, d.productLabel || d.productCode);
    }
    if (d.branchId) branches.set(d.branchId, d.branchId);
  }

  const months: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
    months.push({ value, label });
  }

  const quarters: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i * 3, 1));
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    const value = `${d.getUTCFullYear()}-Q${q}`;
    quarters.push({ value, label: value });
  }

  const fyStart = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const financialYears: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 5; i++) {
    const y = fyStart - i;
    financialYears.push({
      value: String(y),
      label: `FY ${y}-${String(y + 1).slice(-2)}`,
    });
  }

  return {
    products: [...products.entries()].map(([value, label]) => ({ value, label })),
    branches: [...branches.entries()].map(([value, label]) => ({ value, label })),
    regions: [...regions.entries()].map(([value, label]) => ({ value, label })),
    partnerTypes: WEALTH_PARTNER_TYPE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    })),
    months,
    quarters,
    financialYears,
  };
}

function metricsForIdentity(
  identity: { contactId: string | null; companyId: string | null },
  opps: OppRow[],
  deals: DealRow[],
  filters: WealthPartnerNetworkIntelligenceFilters,
  range: { from: Date | null; to: Date | null },
): WealthPartnerNetworkNodeMetrics {
  const product = filters.productCode && filters.productCode !== "all" ? filters.productCode : null;
  const branch = filters.branchId && filters.branchId !== "all" ? filters.branchId : null;
  const region = filters.region && filters.region !== "all" ? filters.region : null;

  const matchedOpps = opps.filter((o) => {
    const identityOk =
      (identity.contactId && o.sourceContactId === identity.contactId) ||
      (identity.companyId && o.companyId === identity.companyId);
    if (!identityOk) return false;
    if (!inRange(o.createdAt, range.from, range.to)) return false;
    if (product && o.productCode !== product) return false;
    if (branch && o.branchId !== branch) return false;
    if (region) {
      const r = o.stateLabel || o.cityLabel || "";
      if (r !== region) return false;
    }
    return true;
  });

  const oppIds = new Set(matchedOpps.map((o) => o.id));

  const matchedDeals = deals.filter((d) => {
    const identityOk =
      (identity.contactId &&
        (d.sourceContactId === identity.contactId ||
          (d.opportunityId != null && oppIds.has(d.opportunityId)))) ||
      (identity.companyId &&
        (d.companyId === identity.companyId ||
          (d.opportunityId != null && oppIds.has(d.opportunityId))));
    if (!identityOk) return false;
    if (!inRange(d.createdAt, range.from, range.to)) return false;
    if (product && d.productCode !== product) return false;
    if (branch && d.branchId !== branch) return false;
    return true;
  });

  let businessVolume = 0;
  let commissionPayable = 0;
  let last: string | null = null;
  for (const o of matchedOpps) {
    businessVolume += num(o.requestedAmount);
    last = maxIso(last, o.createdAt.toISOString());
  }
  for (const d of matchedDeals) {
    const fulfilled = num(d.fulfilledAmount);
    const requested = num(d.requestedAmount);
    businessVolume += fulfilled > 0 ? fulfilled : requested;
    commissionPayable += num(d.revenueReceived);
    last = maxIso(last, d.createdAt.toISOString());
  }

  return {
    businessVolume,
    opportunitiesGenerated: matchedOpps.length,
    dealsConverted: matchedDeals.length,
    conversionRatio: conversionRatio(matchedOpps.length, matchedDeals.length),
    commissionPayable,
    lastActivityAt: last,
  };
}

function rollUp(node: WealthPartnerNetworkTreeNode): void {
  for (const child of node.children) rollUp(child);
  const rolled = { ...node.own };
  for (const child of node.children) {
    rolled.businessVolume += child.rolled.businessVolume;
    rolled.opportunitiesGenerated += child.rolled.opportunitiesGenerated;
    rolled.dealsConverted += child.rolled.dealsConverted;
    rolled.commissionPayable += child.rolled.commissionPayable;
    rolled.lastActivityAt = maxIso(rolled.lastActivityAt, child.rolled.lastActivityAt);
  }
  rolled.conversionRatio = conversionRatio(
    rolled.opportunitiesGenerated,
    rolled.dealsConverted,
  );
  node.rolled = rolled;
}

function countMembers(node: WealthPartnerNetworkTreeNode): {
  total: number;
  active: number;
} {
  let total = 0;
  let active = 0;
  function walk(n: WealthPartnerNetworkTreeNode, isRoot: boolean) {
    if (!isRoot) {
      total += 1;
      if (n.health === "active") active += 1;
    }
    for (const c of n.children) walk(c, false);
  }
  walk(node, true);
  return { total, active };
}

function nodeMatchesPartnerType(
  node: WealthPartnerNetworkTreeNode,
  partnerType: string,
): boolean {
  if (node.nodeKind === partnerType) return true;
  const option = WEALTH_PARTNER_TYPE_OPTIONS.find((o) => o.value === partnerType);
  if (option && node.partnerTypeLabel === option.label) return true;
  return false;
}

function filterTreeByPartnerType(
  node: WealthPartnerNetworkTreeNode,
  partnerType: string | null,
  isRoot = true,
): WealthPartnerNetworkTreeNode | null {
  if (!partnerType) return node;
  const children = node.children
    .map((c) => filterTreeByPartnerType(c, partnerType, false))
    .filter((c): c is WealthPartnerNetworkTreeNode => c != null);
  if (isRoot) return { ...node, children };
  if (nodeMatchesPartnerType(node, partnerType) || children.length > 0) {
    return { ...node, children };
  }
  return null;
}

export async function buildWealthPartnerNetworkIntelligence(
  partnerId: string,
  filters: WealthPartnerNetworkIntelligenceFilters = {},
): Promise<WealthPartnerNetworkIntelligenceBundle> {
  const organizationId = await resolvePilotOrganizationId();
  const root = await wealthPartnerRegistryRepository.getById(organizationId, partnerId);
  if (!root) {
    throw new WealthPartnerValidationError("Wealth Partner not found.");
  }

  const range = resolvePeriodRange(filters);
  const visitedPartnerIds = new Set<string>();

  type MemberEdge = {
    memberId: string;
    parentPartnerId: string;
    name: string;
    identityKind: "contact" | "company";
    contactId: string | null;
    companyId: string | null;
    relationshipType: string;
    memberPartnerType: string | null;
    status: string;
    updatedAt: string;
    childWealthPartner: EnterpriseWealthPartnerRecord | null;
  };

  async function loadChildren(parentId: string): Promise<MemberEdge[]> {
    const members = await wealthPartnerRegistryRepository.listNetwork(
      organizationId,
      parentId,
    );
    const contactIds = members
      .filter((m) => m.identityKind === "contact" && m.childContactId)
      .map((m) => m.childContactId!) ;
    const companyIds = members
      .filter((m) => m.identityKind === "company" && m.childCompanyId)
      .map((m) => m.childCompanyId!);

    const linkedPartners =
      contactIds.length || companyIds.length
        ? await prisma.enterpriseWealthPartner.findMany({
            where: {
              organizationId,
              isDeleted: false,
              OR: [
                ...(contactIds.length ? [{ contactId: { in: contactIds } }] : []),
                ...(companyIds.length ? [{ companyId: { in: companyIds } }] : []),
              ],
            },
          })
        : [];

    const byContact = new Map(
      linkedPartners.filter((p) => p.contactId).map((p) => [p.contactId!, p]),
    );
    const byCompany = new Map(
      linkedPartners.filter((p) => p.companyId).map((p) => [p.companyId!, p]),
    );

    return members.map((m) => {
      const linked =
        m.identityKind === "contact" && m.childContactId
          ? byContact.get(m.childContactId) ?? null
          : m.identityKind === "company" && m.childCompanyId
            ? byCompany.get(m.childCompanyId) ?? null
            : null;
      return {
        memberId: m.id,
        parentPartnerId: m.parentPartnerId,
        name: m.childDisplayName,
        identityKind: m.identityKind,
        contactId: m.childContactId,
        companyId: m.childCompanyId,
        relationshipType: m.relationshipType,
        memberPartnerType: m.memberPartnerType,
        status: m.status,
        updatedAt: m.updatedAt,
        childWealthPartner: linked ? mapWealthPartner(linked) : null,
      };
    });
  }

  // BFS collect all edges + identity ids
  const edgesByParent = new Map<string, MemberEdge[]>();
  const queue: Array<{ partnerId: string; depth: number }> = [
    { partnerId: root.id, depth: 0 },
  ];
  const allContactIds = new Set<string>();
  const allCompanyIds = new Set<string>();
  if (root.contactId) allContactIds.add(root.contactId);
  if (root.companyId) allCompanyIds.add(root.companyId);

  while (queue.length) {
    const { partnerId: pid, depth } = queue.shift()!;
    if (visitedPartnerIds.has(pid) || depth > MAX_DEPTH) continue;
    visitedPartnerIds.add(pid);
    const children = await loadChildren(pid);
    edgesByParent.set(pid, children);
    for (const child of children) {
      if (child.contactId) allContactIds.add(child.contactId);
      if (child.companyId) allCompanyIds.add(child.companyId);
      if (child.childWealthPartner && !visitedPartnerIds.has(child.childWealthPartner.id)) {
        queue.push({ partnerId: child.childWealthPartner.id, depth: depth + 1 });
      }
    }
  }

  const contactList = [...allContactIds];
  const companyList = [...allCompanyIds];

  const [opps, deals] = await Promise.all([
    contactList.length || companyList.length
      ? prisma.enterpriseOpportunity.findMany({
          where: {
            organizationId,
            isDeleted: false,
            OR: [
              ...(contactList.length ? [{ sourceContactId: { in: contactList } }] : []),
              ...(companyList.length ? [{ companyId: { in: companyList } }] : []),
            ],
          },
          select: {
            id: true,
            sourceContactId: true,
            companyId: true,
            productCode: true,
            productLabel: true,
            branchId: true,
            stateLabel: true,
            cityLabel: true,
            requestedAmount: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    contactList.length || companyList.length
      ? prisma.enterpriseDeal.findMany({
          where: {
            organizationId,
            isDeleted: false,
            OR: [
              ...(contactList.length ? [{ sourceContactId: { in: contactList } }] : []),
              ...(companyList.length ? [{ companyId: { in: companyList } }] : []),
            ],
          },
          select: {
            id: true,
            opportunityId: true,
            sourceContactId: true,
            companyId: true,
            productCode: true,
            productLabel: true,
            branchId: true,
            fulfilledAmount: true,
            revenueReceived: true,
            requestedAmount: true,
            grossStage: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Also include deals linked via opportunity ids from matched opps (for company paths)
  const oppIdList = opps.map((o) => o.id);
  let extraDeals: DealRow[] = [];
  if (oppIdList.length) {
    const more = await prisma.enterpriseDeal.findMany({
      where: {
        organizationId,
        isDeleted: false,
        opportunityId: { in: oppIdList },
      },
      select: {
        id: true,
        opportunityId: true,
        sourceContactId: true,
        companyId: true,
        productCode: true,
        productLabel: true,
        branchId: true,
        fulfilledAmount: true,
        revenueReceived: true,
        requestedAmount: true,
        grossStage: true,
        createdAt: true,
      },
    });
    const seen = new Set(deals.map((d) => d.id));
    extraDeals = more.filter((d) => !seen.has(d.id));
  }
  const allDeals = [...deals, ...extraDeals] as DealRow[];
  const allOpps = opps as OppRow[];

  const builtPartnerNodes = new Set<string>();

  function buildPartnerNode(
    partner: EnterpriseWealthPartnerRecord,
    depth: number,
  ): WealthPartnerNetworkTreeNode {
    builtPartnerNodes.add(partner.id);
    const own = metricsForIdentity(
      { contactId: partner.contactId, companyId: partner.companyId },
      allOpps,
      allDeals,
      filters,
      range,
    );
    const edges = edgesByParent.get(partner.id) ?? [];
    const children: WealthPartnerNetworkTreeNode[] = [];
    for (const edge of edges) {
      if (edge.childWealthPartner && depth < MAX_DEPTH) {
        if (builtPartnerNodes.has(edge.childWealthPartner.id)) {
          // Cycle: show leaf without expanding
          children.push(buildMemberLeaf(edge, true));
        } else {
          const childTree = buildPartnerNode(edge.childWealthPartner, depth + 1);
          children.push({
            ...childTree,
            id: `member:${edge.memberId}`,
            relationshipType: edge.relationshipType,
            relationshipLabel: relationshipLabel(edge.relationshipType),
            status: edge.status as WealthPartnerNetworkTreeNode["status"],
            health: resolveHealth({
              status: edge.status,
              operationalStatus: edge.childWealthPartner.operationalStatus,
              lifecycleStatus: edge.childWealthPartner.lifecycleStatus,
            }),
          });
        }
      } else {
        children.push(buildMemberLeaf(edge, false));
      }
    }

    return {
      id: `wp:${partner.id}`,
      name: partner.displayName,
      nodeKind: depth === 0 ? "wealth_partner" : mapNodeKind(partner.partnerType, partner.identityKind, false),
      partnerTypeLabel: wealthPartnerTypeLabel(partner.partnerType),
      relationshipType: depth === 0 ? "root" : "wealth_partner",
      relationshipLabel: depth === 0 ? "Root" : "Wealth Partner",
      status: depth === 0 ? "root" : "active",
      health: resolveHealth({
        operationalStatus: partner.operationalStatus,
        lifecycleStatus: partner.lifecycleStatus,
        status: partner.status,
      }),
      identityKind: partner.identityKind,
      contactId: partner.contactId,
      companyId: partner.companyId,
      wealthPartnerId: partner.id,
      href: buildWealthPartnerWorkspaceHref(partner.id),
      own,
      rolled: emptyMetrics(),
      children,
    };
  }

  function buildMemberLeaf(
    edge: MemberEdge,
    cycleGuard: boolean,
  ): WealthPartnerNetworkTreeNode {
    const typeCode = edge.memberPartnerType || (edge.identityKind === "company" ? "corporate" : "others");
    const own = metricsForIdentity(
      { contactId: edge.contactId, companyId: edge.companyId },
      allOpps,
      allDeals,
      filters,
      range,
    );
    own.lastActivityAt = maxIso(own.lastActivityAt, edge.updatedAt);
    const href = edge.childWealthPartner
      ? buildWealthPartnerWorkspaceHref(edge.childWealthPartner.id)
      : edge.contactId
        ? buildContactWorkspaceHref(edge.contactId)
        : edge.companyId
          ? buildCompanyWorkspaceHref(edge.companyId)
          : null;

    return {
      id: `member:${edge.memberId}${cycleGuard ? ":cycle" : ""}`,
      name: edge.name,
      nodeKind: mapNodeKind(typeCode, edge.identityKind, false),
      partnerTypeLabel: wealthPartnerTypeLabel(typeCode),
      relationshipType: edge.relationshipType,
      relationshipLabel: relationshipLabel(edge.relationshipType),
      status: edge.status as WealthPartnerNetworkTreeNode["status"],
      health: resolveHealth({ status: edge.status }),
      identityKind: edge.identityKind,
      contactId: edge.contactId,
      companyId: edge.companyId,
      wealthPartnerId: edge.childWealthPartner?.id ?? null,
      href,
      own,
      rolled: { ...own },
      children: [],
    };
  }

  let tree = buildPartnerNode(root, 0);

  const partnerTypeFilter =
    filters.partnerType && filters.partnerType !== "all" ? filters.partnerType : null;
  if (partnerTypeFilter) {
    tree = filterTreeByPartnerType(tree, partnerTypeFilter) ?? tree;
  }

  rollUp(tree);
  const counts = countMembers(tree);

  return {
    rootPartnerId: root.id,
    rootPartnerCode: root.code,
    rootPartnerName: root.displayName,
    generatedAt: new Date().toISOString(),
    filtersApplied: {
      period: filters.period ?? "all",
      periodKey: filters.periodKey,
      productCode: filters.productCode ?? "all",
      branchId: filters.branchId ?? "all",
      region: filters.region ?? "all",
      partnerType: filters.partnerType ?? "all",
    },
    summary: {
      totalNetworkMembers: counts.total,
      activeMembers: counts.active,
      businessGenerated: tree.rolled.businessVolume,
      opportunities: tree.rolled.opportunitiesGenerated,
      deals: tree.rolled.dealsConverted,
      conversionRatio: tree.rolled.conversionRatio,
      commissionPayable: tree.rolled.commissionPayable,
    },
    filterOptions: buildFilterOptions(allOpps, allDeals),
    tree,
    definition: WEALTH_PARTNER_NETWORK_INTELLIGENCE_DEFINITION,
  };
}
