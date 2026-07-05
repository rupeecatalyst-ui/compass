import {
  LayoutDashboard,
  Users,
  FileStack,
  GitBranch,
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
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ROLES, type Role } from "@/constants/roles";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: Role[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: Role[];
}

/** Catalyst One — Rupee Catalyst Loan Operating System navigation */
export const mainNavigation: NavGroup[] = [
  {
    title: "Catalyst One",
    items: [
      { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { title: "Customers", href: ROUTES.CUSTOMERS, icon: Users, badge: "18" },
      { title: "Loan Files", href: ROUTES.LOAN_FILES, icon: FileStack },
      { title: "Pipeline", href: ROUTES.PIPELINE, icon: GitBranch },
      { title: "Lenders", href: ROUTES.LENDERS, icon: Building2 },
      { title: "Documents", href: ROUTES.DOCUMENTS, icon: FolderOpen },
      { title: "Tasks", href: ROUTES.TASKS, icon: ListTodo, badge: "17" },
      { title: "Accounting", href: ROUTES.ACCOUNTING, icon: Calculator },
      { title: "Reports", href: ROUTES.REPORTS, icon: BarChart3 },
      { title: "AI Assistant", href: ROUTES.AI_ASSISTANT, icon: Bot },
      { title: "Settings", href: ROUTES.SETTINGS, icon: Settings },
    ],
  },
];

/** Organization module — visible to Super Admin (Master Admin) only */
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

export const allNavigationGroups: NavGroup[] = [...mainNavigation, organizationNavigation];

export const recentPages = [
  { title: "Dashboard", href: ROUTES.DASHBOARD },
  { title: "Customers", href: ROUTES.CUSTOMERS },
  { title: "Pipeline", href: ROUTES.PIPELINE },
  { title: "Tasks", href: ROUTES.TASKS },
];

export const favoritePages = [
  { title: "Dashboard", href: ROUTES.DASHBOARD },
  { title: "Customers", href: ROUTES.CUSTOMERS },
];

export const pinnedPages = [
  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { title: "Customers", href: ROUTES.CUSTOMERS, icon: Users },
];

export const workspaces = [
  { id: "rc", name: "Rupee Catalyst", slug: "rupee-catalyst" },
  { id: "demo", name: "Demo Workspace", slug: "demo" },
];

/** All navigable routes for command palette */
export const commandPaletteRoutes = mainNavigation[0].items;

export const organizationCommandPaletteRoutes = organizationNavigation.items;
