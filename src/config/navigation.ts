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
  Columns3,
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
  Briefcase,
  Workflow,
  Brain,
  Sparkles,
  SlidersHorizontal,
  ToggleLeft,
  Shield,
  Orbit,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ROLES, type Role } from "@/constants/roles";

export interface NavSubItem {
  title: string;
  href: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: Role[];
  expandableKey?: string;
  children?: NavSubItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: Role[];
}

/**
 * Official Business & Functional Certification navigation hierarchy.
 *
 * Navigation Compliance (Contacts Certification R1):
 * - Organizations (customer/legal-entity master) is NOT yet a production module.
 *   Do not substitute Customers or Enterprise Administration → Organization.
 *   Enterprise Administration → Organization = brokerage company profile (distinct).
 * - Opportunity Compass vs Opportunity Workspace: DISTINCT (health vs work surface).
 * - Loan Files vs Loan Board: DISTINCT (file workspace vs stage pipeline).
 * - Dialogue vs Communication: DISTINCT (EDC timeline vs ENCE notifications).
 */

/**
 * Section 1 — Prompt 011 business-journey order.
 * LIFE is not a nav item (intelligence inside Loan Workflow). Lenders = Lender Master / ELW.
 */
export const businessOperationsNavigation: NavGroup = {
  title: "Business Operations",
  items: [
    { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { title: "Directory", href: ROUTES.CONTACTS, icon: Contact },
    { title: "Opportunity Workspace", href: ROUTES.OPPORTUNITY_WORKSPACE, icon: Briefcase },
    { title: "Loan Workflow", href: ROUTES.LOAN_FILES, icon: FileStack },
    { title: "Credit Workspace", href: ROUTES.DOCUMENTS, icon: FolderOpen },
    { title: "Tasks", href: ROUTES.TASKS, icon: ListTodo, badge: "17" },
    { title: "Dialogue", href: ROUTES.DIALOGUE, icon: MessagesSquare },
    { title: "Lenders", href: ROUTES.LENDERS, icon: Building2 },
    { title: "Accounting", href: ROUTES.ACCOUNTING, icon: Calculator },
    { title: "Settings", href: ROUTES.SETTINGS, icon: Settings },
  ],
};

/** Section 2 — supporting modules (not the primary business-journey spine) */
export const systemAdministrationNavigation: NavGroup = {
  title: "System Administration",
  items: [
    { title: "Customers", href: ROUTES.CUSTOMERS, icon: Users, badge: "18" },
    { title: "Opportunity Compass", href: ROUTES.OPPORTUNITY_COMPASS, icon: Compass },
    { title: "Loan Board", href: ROUTES.PIPELINE, icon: Columns3 },
    { title: "Communication", href: ROUTES.COMMUNICATION, icon: Megaphone },
    { title: "Reports", href: ROUTES.REPORTS, icon: BarChart3 },
    { title: "Horizon", href: ROUTES.HORIZON, icon: Orbit },
    { title: "Workflow (EWOE)", href: ROUTES.WORKFLOW, icon: Workflow },
    { title: "Experience Console (EEI)", href: ROUTES.DECISIONS, icon: Brain },
    { title: "AI Assistant", href: ROUTES.AI_ASSISTANT, icon: Bot },
  ],
};

/** Organization sub-pages (titles/routes unchanged) */
const organizationChildren: NavSubItem[] = [
  { title: "Dashboard", href: ROUTES.ORGANIZATION },
  { title: "Company Profile", href: ROUTES.ORGANIZATION_COMPANY_PROFILE },
  { title: "Directors", href: ROUTES.ORGANIZATION_DIRECTORS },
  { title: "Corporate Repository", href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY },
  { title: "Bank Accounts", href: ROUTES.ORGANIZATION_BANK_ACCOUNTS },
  { title: "Digital Signatures", href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES },
  { title: "Company Seal", href: ROUTES.ORGANIZATION_COMPANY_SEAL },
];

/**
 * Section 3 — enterprise configuration & executive oversight.
 * Mission Control is always last.
 */
export const enterpriseAdministrationNavigation: NavGroup = {
  title: "Enterprise Administration",
  roles: [ROLES.SUPER_ADMIN],
  items: [
    {
      title: "Organization",
      href: ROUTES.ORGANIZATION,
      icon: Building2,
      expandableKey: "organization",
      children: organizationChildren,
    },
    {
      title: "Product Library",
      href: ROUTES.ADMIN_PRODUCT_LIBRARY,
      icon: Package,
    },
    {
      title: "Enterprise Asset Library",
      href: ROUTES.ADMIN_ENTERPRISE_ASSETS,
      icon: Boxes,
    },
    {
      title: "Foundation Libraries",
      href: ROUTES.ADMIN_FOUNDATION_LIBRARIES,
      icon: BookMarked,
    },
    {
      title: "Universal Guided Journey",
      href: ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY,
      icon: MessageSquareHeart,
    },
    {
      title: "CHANAKYA Identity",
      href: ROUTES.ADMIN_CHANAKYA_ENTERPRISE_IDENTITY,
      icon: Sparkles,
    },
    {
      title: "CHANAKYA Phase 5",
      href: ROUTES.ADMIN_CHANAKYA_PHASE5_INTELLIGENCE,
      icon: Brain,
    },
    {
      title: "Credit & Risk Engine",
      href: ROUTES.ADMIN_CREDIT_RISK_ENGINE,
      icon: Scale,
    },
    {
      title: "Architecture",
      href: ROUTES.ADMIN_ARCHITECTURE,
      icon: Network,
    },
    {
      title: "Workflow Engine",
      href: ROUTES.ADMIN_WORKFLOW_ENGINE,
      icon: GitBranch,
    },
    {
      title: "ECG",
      href: ROUTES.ADMIN_ECG,
      icon: SlidersHorizontal,
    },
    {
      title: "System Modes",
      href: ROUTES.ADMIN_SYSTEM_MODES,
      icon: ToggleLeft,
    },
    {
      title: "Mission Control",
      href: ROUTES.MISSION_CONTROL,
      icon: Shield,
    },
  ],
};

/** @deprecated Prefer section exports; retained for consumers expecting a flat primary list */
export const mainNavigation: NavGroup[] = [
  {
    title: "Catalyst One",
    items: [
      ...businessOperationsNavigation.items,
      ...systemAdministrationNavigation.items,
    ],
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
    { title: "Bank Accounts", href: ROUTES.ORGANIZATION_BANK_ACCOUNTS, icon: Landmark },
    { title: "Digital Signatures", href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES, icon: PenLine },
    { title: "Company Seal", href: ROUTES.ORGANIZATION_COMPANY_SEAL, icon: Stamp },
  ],
};

/** Admin Console flat list for command palette (Mission Control last; Horizon lives in Business Operations) */
export const adminConsoleNavigation: NavGroup = {
  title: "Admin Console",
  roles: [ROLES.SUPER_ADMIN],
  items: enterpriseAdministrationNavigation.items.filter(
    (item) => item.title !== "Organization",
  ),
};

/** Official sidebar hierarchy for certification review */
export const allNavigationGroups: NavGroup[] = [
  businessOperationsNavigation,
  systemAdministrationNavigation,
  enterpriseAdministrationNavigation,
];

export const recentPages = [
  { title: "Dashboard", href: ROUTES.DASHBOARD },
  { title: "Directory", href: ROUTES.CONTACTS },
  { title: "Opportunity Workspace", href: ROUTES.OPPORTUNITY_WORKSPACE },
  { title: "Loan Workflow", href: ROUTES.LOAN_FILES },
  { title: "Tasks", href: ROUTES.TASKS },
];

export const favoritePages = [
  { title: "Directory", href: ROUTES.CONTACTS },
  { title: "Loan Workflow", href: ROUTES.LOAN_FILES },
];

export const pinnedPages = [
  { title: "Directory", href: ROUTES.CONTACTS, icon: Contact },
  { title: "Loan Workflow", href: ROUTES.LOAN_FILES, icon: FileStack },
];

export const workspaces = [
  { id: "rc", name: "Rupee Catalyst", slug: "rupee-catalyst" },
  { id: "demo", name: "Demo Workspace", slug: "demo" },
];

function flattenNavItems(items: NavItem[]) {
  return items.flatMap((item) =>
    item.children
      ? [
          item,
          ...item.children.map((c) => ({
            title: `${item.title} · ${c.title}`,
            href: c.href,
            icon: item.icon,
          })),
        ]
      : [item],
  );
}

export const businessOperationsCommandPaletteRoutes = flattenNavItems(
  businessOperationsNavigation.items,
);

export const systemAdministrationCommandPaletteRoutes = flattenNavItems(
  systemAdministrationNavigation.items,
);

/** Flatten nav for command palette (business + system) */
export const commandPaletteRoutes = [
  ...businessOperationsCommandPaletteRoutes,
  ...systemAdministrationCommandPaletteRoutes,
];

export const organizationCommandPaletteRoutes = organizationNavigation.items;
export const adminConsoleCommandPaletteRoutes = adminConsoleNavigation.items;
