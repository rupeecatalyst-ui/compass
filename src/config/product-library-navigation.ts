import {
  FolderTree,
  History,
  LayoutDashboard,
  Library,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { ProductLibrarySectionId } from "@/types/product-library";

export const PRODUCT_LIBRARY_ICON = Library;

export interface ProductLibraryNavItem {
  id: ProductLibrarySectionId;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const PRODUCT_LIBRARY_NAV: ProductLibraryNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    href: ROUTES.ADMIN_PRODUCT_LIBRARY,
    icon: LayoutDashboard,
    description: "Product Library executive dashboard and platform metrics.",
  },
  {
    id: "registry",
    title: "Product Registry",
    href: ROUTES.ADMIN_PRODUCT_REGISTRY,
    icon: Library,
    description: "Enterprise catalog of governed product definitions.",
  },
  {
    id: "categories",
    title: "Categories & Groups",
    href: ROUTES.ADMIN_PRODUCT_CATEGORIES,
    icon: FolderTree,
    description: "Product categories and group taxonomy.",
  },
  {
    id: "lifecycle",
    title: "Lifecycle",
    href: ROUTES.ADMIN_PRODUCT_LIFECYCLE,
    icon: RefreshCw,
    description: "Product lifecycle pipeline and governance stages.",
  },
  {
    id: "audit",
    title: "Audit Trail",
    href: ROUTES.ADMIN_PRODUCT_AUDIT,
    icon: History,
    description: "Append-only audit log for product definition changes.",
  },
];
