import {
  Boxes,
  FolderTree,
  History,
  LayoutDashboard,
  Library,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { EnterpriseAssetLibrarySectionId } from "@/types/enterprise-asset-library";

export const ENTERPRISE_ASSET_LIBRARY_ICON = Boxes;

export interface EnterpriseAssetNavItem {
  id: EnterpriseAssetLibrarySectionId;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const ENTERPRISE_ASSET_LIBRARY_NAV: EnterpriseAssetNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    href: ROUTES.ADMIN_ENTERPRISE_ASSETS,
    icon: LayoutDashboard,
    description: "Enterprise Asset Library executive dashboard.",
  },
  {
    id: "registry",
    title: "Asset Registry",
    href: ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY,
    icon: Library,
    description: "Governed catalog of reusable enterprise assets.",
  },
  {
    id: "categories",
    title: "Categories",
    href: ROUTES.ADMIN_ENTERPRISE_ASSETS_CATEGORIES,
    icon: FolderTree,
    description: "Generic asset category taxonomy.",
  },
  {
    id: "lifecycle",
    title: "Lifecycle",
    href: ROUTES.ADMIN_ENTERPRISE_ASSETS_LIFECYCLE,
    icon: RefreshCw,
    description: "Asset governance lifecycle pipeline.",
  },
  {
    id: "audit",
    title: "Audit Trail",
    href: ROUTES.ADMIN_ENTERPRISE_ASSETS_AUDIT,
    icon: History,
    description: "Append-only audit log for asset changes.",
  },
];
