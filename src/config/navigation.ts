import {
  LayoutDashboard,
  Users,
  FileStack,
  Building2,
  FolderOpen,
  ListTodo,
  Calculator,
  BarChart3,
  Bot,
  Settings,
  Landmark,
  PenLine,
  Stamp,
  Scale,
  Network,
  GitBranch,
  Package,
  Boxes,
  BookMarked,
  MessageSquareHeart,
  MessagesSquare,
  Contact,
  Compass,
  Megaphone,
  Workflow,
  Brain,
  Sparkles,
  SlidersHorizontal,
  ToggleLeft,
  Shield,
  Orbit,
  Briefcase,
  Radar,
  LineChart,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ROLES, type Role } from "@/constants/roles";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";

export interface NavSubItem {
  title: string;
  href: string;
  /** Render a subtle separator above this child (domain folders / context panel). */
  separatorBefore?: boolean;
}

export interface NavItem {
  title: string;
  /** Omit or use "#" for context-domain parents (Administration, Settings). */
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: Role[];
  /**
   * Context domain key — children render in Column 2 (Context Navigation Panel).
   * Primary nav never expands inline.
   */
  expandableKey?: string;
  children?: NavSubItem[];
  /**
   * Context domain parent — selecting opens Context Panel; does not expand primary nav.
   */
  folder?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: Role[];
  /** When true, sidebar omits the group heading (flat domain list). */
  hideTitle?: boolean;
}

/**
 * Catalyst One — Enterprise Context Navigation Standard
 *
 * Column 1: Primary Navigation (stable, never expands)
 * Column 2: Context Navigation Panel (Administration / Settings children)
 * Column 3: Workspace
 *
 * Contacts is the single Enterprise Party Registry (people + companies).
 * Administration holds configuration only — never operational workspaces.
 */

const settingsChildren: NavSubItem[] = [
  { title: "My Profile", href: `${ROUTES.SETTINGS}#profile` },
  { title: "Preferences", href: `${ROUTES.SETTINGS}#preferences` },
  { title: "Notifications", href: `${ROUTES.SETTINGS}#notifications` },
  { title: "Appearance", href: `${ROUTES.SETTINGS}#appearance` },
];

/** Organization sub-pages under Administration */
const organizationChildren: NavSubItem[] = [
  { title: "Organization", href: ROUTES.ORGANIZATION },
  { title: "Company Profile", href: ROUTES.ORGANIZATION_COMPANY_PROFILE },
  { title: "Directors", href: ROUTES.ORGANIZATION_DIRECTORS },
  { title: "Corporate Repository", href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY },
  { title: "Organization Documents", href: ROUTES.ORGANIZATION_DOCUMENTS },
  { title: "Bank Accounts", href: ROUTES.ORGANIZATION_BANK_ACCOUNTS },
  { title: "Digital Signatures", href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES },
  { title: "Company Seal", href: ROUTES.ORGANIZATION_COMPANY_SEAL },
];

/** Configuration-only Administration children. */
const administrationChildren: NavSubItem[] = [
  ...organizationChildren,
  { title: "Users", href: ROUTES.ADMIN_USERS, separatorBefore: true },
  { title: "Roles & Permissions", href: ROUTES.ADMIN_ROLES_PERMISSIONS },
  { title: "Product Library", href: ROUTES.ADMIN_PRODUCT_LIBRARY, separatorBefore: true },
  { title: "Enterprise Asset Library", href: ROUTES.ADMIN_ENTERPRISE_ASSETS },
  { title: "Enterprise Decision Ledger", href: ROUTES.ADMIN_ENTERPRISE_DECISION_LEDGER },
  { title: "Foundation Libraries", href: ROUTES.ADMIN_FOUNDATION_LIBRARIES },
  { title: "Universal Guided Journey", href: ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY },
  { title: "CHANAKYA Identity", href: ROUTES.ADMIN_CHANAKYA_ENTERPRISE_IDENTITY },
  { title: "CHANAKYA Phase 5", href: ROUTES.ADMIN_CHANAKYA_PHASE5_INTELLIGENCE },
  { title: "Credit Knowledge Framework", href: ROUTES.ADMIN_CREDIT_KNOWLEDGE_FRAMEWORK },
  { title: "Credit & Risk Engine", href: ROUTES.ADMIN_CREDIT_RISK_ENGINE },
  { title: "Architecture", href: ROUTES.ADMIN_ARCHITECTURE },
  { title: "Workflow Engine", href: ROUTES.ADMIN_WORKFLOW_ENGINE },
  { title: "ECG", href: ROUTES.ADMIN_ECG },
  { title: "System Modes", href: ROUTES.ADMIN_SYSTEM_MODES },
];

/**
 * Primary domain navigation — Column 1 (Architecture Freeze).
 * Dashboard · CHANAKYA Radar · Contacts · My Deals · Loan Workspace · Investments ·
 * Tasks · Documents · Lenders · Accounting · Mission Control · Horizon · Administration · Settings
 * Administration is configuration only. Do not change structure without approval.
 */
export const primaryDomainNavigation: NavGroup = {
  title: "Catalyst One",
  hideTitle: true,
  items: [
    { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { title: "CHANAKYA Radar", href: ROUTES.CHANAKYA_RADAR, icon: Radar },
    { title: "Contacts", href: ROUTES.CONTACTS, icon: Contact },
    { title: "My Deals", href: ROUTES.MY_DEALS, icon: Briefcase },
    {
      title: "Loan Workspace",
      href: buildDashboardHref(ROUTES.LOAN_FILES),
      icon: Landmark,
    },
    { title: "Investments", href: ROUTES.INVESTMENTS, icon: LineChart, badge: "Soon" },
    { title: "Tasks", href: ROUTES.TASKS, icon: ListTodo },
    {
      title: "Documents",
      href: buildDashboardHref(ROUTES.DOCUMENT_CENTER),
      icon: FileStack,
    },
    { title: "Lenders", href: ROUTES.LENDERS, icon: Building2 },
    { title: "Accounting", href: ROUTES.ACCOUNTING, icon: Calculator },
    { title: "Mission Control", href: ROUTES.MISSION_CONTROL, icon: Gauge },
    { title: "Horizon", href: ROUTES.HORIZON, icon: Orbit },
    {
      title: "Administration",
      href: "#",
      icon: Shield,
      folder: true,
      expandableKey: "administration",
      roles: [ROLES.SUPER_ADMIN],
      children: administrationChildren,
    },
    {
      title: "Settings",
      href: "#",
      icon: Settings,
      folder: true,
      expandableKey: "settings",
      children: settingsChildren,
    },
  ],
};

/** True when the primary item opens Column 2 instead of expanding inline. */
export function isContextDomain(item: NavItem): boolean {
  return Boolean(item.folder && item.expandableKey);
}

export function getPrimaryNavItems(): NavItem[] {
  return primaryDomainNavigation.items;
}

export function getContextDomainByKey(key: string): NavItem | undefined {
  return primaryDomainNavigation.items.find((i) => i.expandableKey === key);
}

function hrefPathOnly(href: string): string {
  return href.split("?")[0]!.split("#")[0]!;
}

/** Resolve which context domain owns the current pathname (if any). */
export function resolveContextKeyForPath(pathname: string): string | null {
  for (const item of primaryDomainNavigation.items) {
    if (!isContextDomain(item)) continue;
    if (
      item.children?.some((c) => {
        const path = hrefPathOnly(c.href);
        if (pathname === path) return true;
        if (path === "/dashboard" || path === "/organization") return false;
        return pathname.startsWith(path) && path !== "/";
      })
    ) {
      return item.expandableKey ?? null;
    }
  }
  return null;
}

export function isNavHrefActive(pathname: string, href: string, hash = ""): boolean {
  if (!href || href === "#") return false;
  const [pathPart, hashPart] = href.split("#");
  const hrefPath = (pathPart ?? "").split("?")[0]!;
  if (hashPart) {
    return pathname === hrefPath && (hash === `#${hashPart}` || hash === hashPart);
  }
  if (pathname === hrefPath) return true;
  if (
    hrefPath === "/dashboard" ||
    hrefPath === "/organization" ||
    hrefPath === ROUTES.ADMIN_CREDIT_RISK_ENGINE ||
    hrefPath === ROUTES.ADMIN_ARCHITECTURE ||
    hrefPath === ROUTES.ADMIN_WORKFLOW_ENGINE ||
    hrefPath === ROUTES.ADMIN_PRODUCT_LIBRARY ||
    hrefPath === ROUTES.ADMIN_ENTERPRISE_ASSETS ||
    hrefPath === ROUTES.ADMIN_FOUNDATION_LIBRARIES ||
    hrefPath === ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY
  ) {
    return false;
  }
  return pathname.startsWith(hrefPath);
}

/** @deprecated Use primaryDomainNavigation — retained alias for certification continuity */
export const businessOperationsNavigation: NavGroup = primaryDomainNavigation;

/** @deprecated Domain IA consolidates supporting modules under command palette */
export const systemAdministrationNavigation: NavGroup = {
  title: "System Administration",
  items: [],
};

/** @deprecated Prefer Administration context children */
export const enterpriseAdministrationNavigation: NavGroup = {
  title: "Administration",
  roles: [ROLES.SUPER_ADMIN],
  items: [],
};

/** @deprecated Prefer section exports; retained for consumers expecting a flat primary list */
export const mainNavigation: NavGroup[] = [
  {
    title: "Catalyst One",
    items: [...primaryDomainNavigation.items],
  },
];

/** Organization module — flat list for command palette / legacy consumers */
export const organizationNavigation: NavGroup = {
  title: "Organization",
  roles: [ROLES.SUPER_ADMIN],
  items: [
    { title: "Dashboard", href: ROUTES.ORGANIZATION, icon: LayoutDashboard },
    { title: "Company Profile", href: ROUTES.ORGANIZATION_COMPANY_PROFILE, icon: Building2 },
    { title: "Directors", href: ROUTES.ORGANIZATION_DIRECTORS, icon: Users },
    { title: "Corporate Repository", href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY, icon: FolderOpen },
    { title: "Organization Documents", href: ROUTES.ORGANIZATION_DOCUMENTS, icon: FileStack },
    { title: "Bank Accounts", href: ROUTES.ORGANIZATION_BANK_ACCOUNTS, icon: Landmark },
    { title: "Digital Signatures", href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES, icon: PenLine },
    { title: "Company Seal", href: ROUTES.ORGANIZATION_COMPANY_SEAL, icon: Stamp },
  ],
};

/** Admin Console flat list for command palette — configuration only */
export const adminConsoleNavigation: NavGroup = {
  title: "Admin Console",
  roles: [ROLES.SUPER_ADMIN],
  items: [
    { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
    { title: "Roles & Permissions", href: ROUTES.ADMIN_ROLES_PERMISSIONS, icon: Shield },
    { title: "Product Library", href: ROUTES.ADMIN_PRODUCT_LIBRARY, icon: Package },
    { title: "Enterprise Asset Library", href: ROUTES.ADMIN_ENTERPRISE_ASSETS, icon: Boxes },
    { title: "Enterprise Decision Ledger", href: ROUTES.ADMIN_ENTERPRISE_DECISION_LEDGER, icon: Scale },
    { title: "Foundation Libraries", href: ROUTES.ADMIN_FOUNDATION_LIBRARIES, icon: BookMarked },
    { title: "Universal Guided Journey", href: ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY, icon: MessageSquareHeart },
    { title: "CHANAKYA Identity", href: ROUTES.ADMIN_CHANAKYA_ENTERPRISE_IDENTITY, icon: Sparkles },
    { title: "CHANAKYA Phase 5", href: ROUTES.ADMIN_CHANAKYA_PHASE5_INTELLIGENCE, icon: Brain },
    { title: "Credit Knowledge Framework", href: ROUTES.ADMIN_CREDIT_KNOWLEDGE_FRAMEWORK, icon: BookMarked },
    { title: "Credit & Risk Engine", href: ROUTES.ADMIN_CREDIT_RISK_ENGINE, icon: Scale },
    { title: "Architecture", href: ROUTES.ADMIN_ARCHITECTURE, icon: Network },
    { title: "Workflow Engine", href: ROUTES.ADMIN_WORKFLOW_ENGINE, icon: GitBranch },
    { title: "ECG", href: ROUTES.ADMIN_ECG, icon: SlidersHorizontal },
    { title: "System Modes", href: ROUTES.ADMIN_SYSTEM_MODES, icon: ToggleLeft },
    { title: "Enterprise Intelligence", href: ROUTES.REPORTS, icon: BarChart3 },
  ],
};

/** Official sidebar hierarchy */
export const allNavigationGroups: NavGroup[] = [primaryDomainNavigation];

export const recentPages = [
  { title: "Dashboard", href: ROUTES.DASHBOARD },
  { title: "CHANAKYA Radar", href: ROUTES.CHANAKYA_RADAR },
  { title: "Contacts", href: ROUTES.CONTACTS },
  { title: "My Deals", href: ROUTES.MY_DEALS },
  { title: "Loan Workspace", href: ROUTES.LOAN_FILES },
];

export const favoritePages = [
  { title: "CHANAKYA Radar", href: ROUTES.CHANAKYA_RADAR },
  { title: "My Deals", href: ROUTES.MY_DEALS },
  { title: "Contacts", href: ROUTES.CONTACTS },
];

export const pinnedPages = [
  { title: "CHANAKYA Radar", href: ROUTES.CHANAKYA_RADAR, icon: Radar },
  { title: "My Deals", href: ROUTES.MY_DEALS, icon: Briefcase },
  { title: "Contacts", href: ROUTES.CONTACTS, icon: Contact },
];

export const workspaces = [
  { id: "rc", name: "Rupee Catalyst", slug: "rupee-catalyst" },
  { id: "demo", name: "Demo Workspace", slug: "demo" },
];

function flattenNavItems(items: NavItem[]) {
  return items.flatMap((item) => {
    if (!item.children?.length) {
      if (item.folder) return [];
      return [item];
    }
    return [
      ...(item.folder ? [] : [item]),
      ...item.children.map((c) => ({
        title: `${item.title} · ${c.title}`,
        href: c.href,
        icon: item.icon,
      })),
    ];
  });
}

export const businessOperationsCommandPaletteRoutes = flattenNavItems(
  primaryDomainNavigation.items,
);

/** Journey / supporting modules reachable via command palette (not primary nav). */
export const systemAdministrationCommandPaletteRoutes = [
  {
    title: "Opportunity Workspace",
    href: buildDashboardHref(ROUTES.CREDIT_BENCH),
    icon: Sparkles,
  },
  {
    title: "Strategic Workspace",
    href: buildDashboardHref(ROUTES.OPPORTUNITY_WORKSPACE),
    icon: Sparkles,
  },
  {
    title: "Credit Workbench",
    href: buildDashboardHref(ROUTES.CREDIT_WORKBENCH),
    icon: Scale,
  },
  { title: "Dialogue", href: ROUTES.DIALOGUE, icon: MessagesSquare },
  { title: "Mission Control", href: ROUTES.MISSION_CONTROL, icon: Gauge },
  { title: "Customers", href: ROUTES.CUSTOMERS, icon: Users },
  { title: "Opportunity Compass", href: ROUTES.OPPORTUNITY_COMPASS, icon: Compass },
  { title: "Enterprise Intelligence", href: ROUTES.REPORTS, icon: BarChart3 },
  { title: "Communication", href: ROUTES.COMMUNICATION, icon: Megaphone },
  { title: "Workflow (EWOE)", href: ROUTES.WORKFLOW, icon: Workflow },
  { title: "Experience Console (EEI)", href: ROUTES.DECISIONS, icon: Brain },
  { title: "AI Assistant", href: ROUTES.AI_ASSISTANT, icon: Bot },
];

/** Flatten nav for command palette (primary + supporting modules) */
export const commandPaletteRoutes = [
  ...businessOperationsCommandPaletteRoutes,
  ...systemAdministrationCommandPaletteRoutes,
];

export const organizationCommandPaletteRoutes = organizationNavigation.items;
export const adminConsoleCommandPaletteRoutes = adminConsoleNavigation.items;
