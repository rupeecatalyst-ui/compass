import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Database,
  Gauge,
  LayoutDashboard,
  Map,
  Network,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { ArchitectureSectionId } from "@/types/enterprise-architecture";

export interface ArchitectureNavItem {
  id: ArchitectureSectionId;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** CARB v1 — Catalyst Architecture Review Board navigation. */
export const ARCHITECTURE_NAV: ArchitectureNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    href: ROUTES.ADMIN_ARCHITECTURE,
    icon: LayoutDashboard,
    description: "Enterprise architecture health and CARB executive dashboard.",
  },
  {
    id: "atlas",
    title: "ATLAS",
    href: ROUTES.ADMIN_ARCHITECTURE_ATLAS,
    icon: Map,
    description: "Architectural Topology, Lifecycle & Asset System — enterprise catalog.",
  },
  {
    id: "compliance",
    title: "Compliance",
    href: ROUTES.ADMIN_ARCHITECTURE_COMPLIANCE,
    icon: ClipboardCheck,
    description: "Architecture compliance evaluations across all registered artifacts.",
  },
  {
    id: "registry",
    title: "Registry",
    href: ROUTES.ADMIN_ARCHITECTURE_REGISTRY,
    icon: Database,
    description: "Enterprise artifact catalog — not a graph database.",
  },
  {
    id: "performance",
    title: "Performance",
    href: ROUTES.ADMIN_ARCHITECTURE_PERFORMANCE,
    icon: Gauge,
    description: "Design-time performance budgets — stored only, not enforced.",
  },
  {
    id: "documentation",
    title: "Documentation",
    href: ROUTES.ADMIN_ARCHITECTURE_DOCUMENTATION,
    icon: BookOpen,
    description: "Documentation readiness for SAGE integration (reserved).",
  },
  {
    id: "health",
    title: "Health",
    href: ROUTES.ADMIN_ARCHITECTURE_HEALTH,
    icon: Activity,
    description: "Platform architecture health indicators and extension hooks.",
  },
];

export function getArchitectureNavItem(id: ArchitectureSectionId): ArchitectureNavItem | undefined {
  return ARCHITECTURE_NAV.find((item) => item.id === id);
}

export const ARCHITECTURE_ENGINE_ICON = Network;

/** Reserved future module integration hooks — extension points only. */
export const FUTURE_MODULE_HOOKS = [
  { id: "atlas", label: "ATLAS", description: "Enterprise Architecture Catalog", status: "active" as const },
  { id: "forge", label: "FORGE", description: "Configuration Studio", status: "reserved" as const },
  { id: "sage", label: "SAGE", description: "Knowledge Hub", status: "reserved" as const },
  { id: "compass", label: "COMPASS", description: "AI Platform", status: "reserved" as const },
] as const;
