import type { LucideIcon } from "lucide-react";

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface CommandItem {
  id: string;
  title: string;
  href: string;
  icon?: LucideIcon;
  keywords?: string[];
  group?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  type: "info" | "success" | "warning" | "error";
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}
