/**
 * Alert Target Registry — placeholder routing destinations.
 */

import type { AlertTargetRegistryPort, EnterpriseAlertTarget } from "../contracts";

const SEED_TARGETS: EnterpriseAlertTarget[] = [
  {
    id: "target-executives",
    label: "Executive audience",
    channelId: "channel-mission-control",
    addressHint: "mission-control://executives",
  },
  {
    id: "target-security-ops",
    label: "Security operations desk",
    channelId: "channel-mission-control",
    addressHint: "mission-control://security-operations",
  },
  {
    id: "target-email-placeholder",
    label: "Email distribution (placeholder)",
    channelId: "channel-email",
    addressHint: "email://placeholder",
  },
  {
    id: "target-teams-placeholder",
    label: "Microsoft Teams room (placeholder)",
    channelId: "channel-microsoft-teams",
    addressHint: "teams://placeholder",
  },
  {
    id: "target-slack-placeholder",
    label: "Slack channel (placeholder)",
    channelId: "channel-slack",
    addressHint: "slack://placeholder",
  },
];

export function createAlertTargetRegistry(
  seed: EnterpriseAlertTarget[] = SEED_TARGETS,
): AlertTargetRegistryPort {
  const store = new Map<string, EnterpriseAlertTarget>(seed.map((t) => [t.id, t]));

  return {
    register(target) {
      store.set(target.id, target);
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
    listByChannel(channelId) {
      return [...store.values()].filter((t) => t.channelId === channelId);
    },
  };
}

export const defaultAlertTargetRegistry = createAlertTargetRegistry();

export function listRegisteredAlertTargets(): EnterpriseAlertTarget[] {
  return defaultAlertTargetRegistry.list();
}
