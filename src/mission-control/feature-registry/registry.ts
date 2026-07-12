/**
 * In-memory Feature Registry — scaffold. No remote config yet.
 */

import type { MissionControlFeatureModule, FeatureRegistryPort } from "./types";

const MODULES: MissionControlFeatureModule[] = [
  {
    id: "mc-executive-briefing",
    displayName: "Executive Briefing",
    route: "/mission-control",
    icon: "Briefcase",
    permissions: [{ id: "mc.briefing.view", resource: "mission-control.briefing", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "CHANAKYA Executive Briefing — Mission Control landing",
  },
  {
    id: "mc-dashboard",
    displayName: "Dashboard",
    route: "/mission-control/dashboard",
    icon: "LayoutDashboard",
    permissions: [{ id: "mc.dashboard.view", resource: "mission-control.dashboard", action: "view" }],
    featureFlag: "preview",
    version: "0.1.0",
    status: "planned",
    dependencies: ["mc-executive-briefing"],
    description: "Command center overview (future)",
  },
  {
    id: "mc-executive-briefing-alias",
    displayName: "Executive Briefing",
    route: "/mission-control/executive-briefing",
    icon: "Briefcase",
    permissions: [{ id: "mc.briefing.view", resource: "mission-control.briefing", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Alias route for Executive Briefing",
  },
  {
    id: "mc-situation-room",
    displayName: "Situation Room",
    route: "/mission-control/situation-room",
    icon: "Radar",
    permissions: [{ id: "mc.situation.view", resource: "mission-control.situation", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Executive Situation Room — operational awareness war room",
  },
  {
    id: "mc-alert-center",
    displayName: "Alert Center",
    route: "/mission-control/alert-center",
    icon: "Bell",
    permissions: [{ id: "mc.alerts.view", resource: "mission-control.alerts", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Enterprise Alert Center — centralized executive alerts",
  },
  {
    id: "mc-search",
    displayName: "Search Center",
    route: "/mission-control/search",
    icon: "Search",
    permissions: [{ id: "mc.search.view", resource: "mission-control.search", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Enterprise Search Center — unified Catalyst One search",
  },
  {
    id: "mc-security-operations",
    displayName: "Security Operations",
    route: "/mission-control/security-operations",
    icon: "Shield",
    permissions: [{ id: "mc.security.view", resource: "mission-control.security", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Security Operations Center — executive security workspace",
  },
  {
    id: "mc-observability",
    displayName: "Observability",
    route: "/mission-control/observability",
    icon: "Activity",
    permissions: [{ id: "mc.observability.view", resource: "mission-control.observability", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
    description: "Enterprise Observability Center — platform and engine health workspace",
  },
  {
    id: "mc-ai-control-tower",
    displayName: "AI Control Tower",
    route: "/mission-control/ai-control-tower",
    icon: "Bot",
    permissions: [{ id: "mc.ai.view", resource: "mission-control.ai", action: "view" }],
    featureFlag: "disabled",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-configuration",
    displayName: "Configuration",
    route: "/mission-control/configuration",
    icon: "SlidersHorizontal",
    permissions: [{ id: "mc.config.view", resource: "mission-control.config", action: "view" }],
    featureFlag: "preview",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-command-console",
    displayName: "Command Console",
    route: "/mission-control/command-console",
    icon: "Terminal",
    permissions: [{ id: "mc.command.view", resource: "mission-control.command", action: "view" }],
    featureFlag: "preview",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-mission-replay",
    displayName: "Mission Replay",
    route: "/mission-control/mission-replay",
    icon: "History",
    permissions: [{ id: "mc.replay.view", resource: "mission-control.replay", action: "view" }],
    featureFlag: "preview",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-digital-twin",
    displayName: "Digital Twin",
    route: "/mission-control/digital-twin",
    icon: "Boxes",
    permissions: [{ id: "mc.twin.view", resource: "mission-control.twin", action: "view" }],
    featureFlag: "disabled",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-audit",
    displayName: "Audit",
    route: "/mission-control/audit",
    icon: "FileSearch",
    permissions: [{ id: "mc.audit.view", resource: "mission-control.audit", action: "view" }],
    featureFlag: "preview",
    version: "0.1.0",
    status: "planned",
    dependencies: [],
  },
  {
    id: "mc-settings",
    displayName: "Settings",
    route: "/mission-control/settings",
    icon: "Settings",
    permissions: [{ id: "mc.settings.view", resource: "mission-control.settings", action: "view" }],
    featureFlag: "enabled",
    version: "0.1.0",
    status: "scaffold",
    dependencies: [],
  },
];

export function createInMemoryFeatureRegistry(
  seed: MissionControlFeatureModule[] = MODULES,
): FeatureRegistryPort {
  const store = new Map<string, MissionControlFeatureModule>(seed.map((m) => [m.id, m]));

  return {
    register(module) {
      store.set(module.id, module);
    },
    unregister(id) {
      store.delete(id);
    },
    get(id) {
      return store.get(id);
    },
    list() {
      return [...store.values()];
    },
    listActive() {
      return [...store.values()].filter(
        (m) => m.featureFlag !== "disabled" && m.status !== "deprecated",
      );
    },
  };
}

export const defaultMissionControlFeatureRegistry = createInMemoryFeatureRegistry();

export function listMissionControlNavModules(): MissionControlFeatureModule[] {
  return defaultMissionControlFeatureRegistry
    .list()
    .filter((m) => !m.id.endsWith("-alias") && m.featureFlag !== "disabled");
}

export function getMissionControlFeatureByRoute(
  route: string,
): MissionControlFeatureModule | undefined {
  const modules = defaultMissionControlFeatureRegistry.list();
  const exact = modules.find((m) => m.route === route);
  if (exact) return exact;

  const prefixMatches = modules
    .filter((m) => route.startsWith(`${m.route}/`))
    .sort((a, b) => b.route.length - a.route.length);
  return prefixMatches[0];
}
