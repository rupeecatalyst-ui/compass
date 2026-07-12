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

  MessagesSquare,

  Contact,

  Compass,

  Megaphone,

  Briefcase,

  Workflow,

  Brain,

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



/** Catalyst One — primary navigation (Sprint 9 flat structure) */

export const mainNavigation: NavGroup[] = [

  {

    title: "Catalyst One",

    items: [

      { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },

      { title: "Customers", href: ROUTES.CUSTOMERS, icon: Users, badge: "18" },

      { title: "Loan Board", href: ROUTES.PIPELINE, icon: Columns3 },

      { title: "Loan Files", href: ROUTES.LOAN_FILES, icon: FileStack },

      { title: "Opportunity Workspace", href: ROUTES.OPPORTUNITY_WORKSPACE, icon: Briefcase },

      { title: "Workflow (EWOE)", href: ROUTES.WORKFLOW, icon: Workflow },

      { title: "Experience Console (EEI)", href: ROUTES.DECISIONS, icon: Brain },

      { title: "Lenders", href: ROUTES.LENDERS, icon: Building2 },

      { title: "Documents", href: ROUTES.DOCUMENTS, icon: FolderOpen },

      { title: "Tasks", href: ROUTES.TASKS, icon: ListTodo, badge: "17" },

      { title: "Dialogue", href: ROUTES.DIALOGUE, icon: MessagesSquare },

      { title: "Contacts", href: ROUTES.CONTACTS, icon: Contact },

      { title: "Opportunity Compass", href: ROUTES.OPPORTUNITY_COMPASS, icon: Compass },

      { title: "Horizon", href: ROUTES.HORIZON, icon: Orbit },

      { title: "Communication", href: ROUTES.COMMUNICATION, icon: Megaphone },

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



/** Admin Console — Super Admin policy administration modules */

export const adminConsoleNavigation: NavGroup = {

  title: "Admin Console",

  roles: [ROLES.SUPER_ADMIN],

  items: [

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

    {

      title: "Horizon",

      href: ROUTES.HORIZON,

      icon: Orbit,

    },

  ],

};



export const allNavigationGroups: NavGroup[] = [

  ...mainNavigation,

  organizationNavigation,

  adminConsoleNavigation,

];



export const recentPages = [

  { title: "Dashboard", href: ROUTES.DASHBOARD },

  { title: "Loan Board", href: ROUTES.PIPELINE },

  { title: "Customers", href: ROUTES.CUSTOMERS },

  { title: "Tasks", href: ROUTES.TASKS },

];



export const favoritePages = [

  { title: "Dashboard", href: ROUTES.DASHBOARD },

  { title: "Loan Board", href: ROUTES.PIPELINE },

];



export const pinnedPages = [

  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },

  { title: "Loan Board", href: ROUTES.PIPELINE, icon: Columns3 },

];



export const workspaces = [

  { id: "rc", name: "Rupee Catalyst", slug: "rupee-catalyst" },

  { id: "demo", name: "Demo Workspace", slug: "demo" },

];



/** Flatten nav for command palette */

export const commandPaletteRoutes = mainNavigation[0].items.flatMap((item) =>

  item.children

    ? [item, ...item.children.map((c) => ({ title: `${item.title} · ${c.title}`, href: c.href, icon: item.icon }))]

    : [item],

);



export const organizationCommandPaletteRoutes = organizationNavigation.items;

export const adminConsoleCommandPaletteRoutes = adminConsoleNavigation.items;

