import {
  LayoutDashboard,
  Settings,
  Palette,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Platform navigation — no business modules in Sprint 1 */
export const mainNavigation: NavGroup[] = [
  {
    title: "Platform",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Design System",
        href: "/design-system",
        icon: Palette,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

export const recentPages = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Settings", href: "/settings" },
  { title: "Design System", href: "/design-system" },
];

export const favoritePages = [
  { title: "Dashboard", href: "/dashboard" },
];

export const pinnedPages = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export const workspaces = [
  { id: "rc", name: "Rupee Catalyst", slug: "rupee-catalyst" },
  { id: "demo", name: "Demo Workspace", slug: "demo" },
];
