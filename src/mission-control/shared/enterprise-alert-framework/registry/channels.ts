/**
 * Alert Channel Registry — future delivery channels (metadata only).
 * No email / SMS / WhatsApp / push / webhook / Teams / Slack transport.
 */

import type { AlertChannelRegistryPort, EnterpriseAlertChannel } from "../contracts";

const SEED_CHANNELS: EnterpriseAlertChannel[] = [
  {
    id: "channel-mission-control",
    kind: "mission_control",
    displayName: "Mission Control",
    status: "enabled",
    description: "In-app Alert Center / Situation Room surfaces",
  },
  {
    id: "channel-email",
    kind: "email",
    displayName: "Email",
    status: "planned",
    description: "Future email transport — not implemented",
  },
  {
    id: "channel-sms",
    kind: "sms",
    displayName: "SMS",
    status: "planned",
    description: "Future SMS transport — not implemented",
  },
  {
    id: "channel-whatsapp",
    kind: "whatsapp",
    displayName: "WhatsApp",
    status: "planned",
    description: "Future WhatsApp transport — not implemented",
  },
  {
    id: "channel-push",
    kind: "push",
    displayName: "Push",
    status: "planned",
    description: "Future push notifications — not implemented",
  },
  {
    id: "channel-webhook",
    kind: "webhook",
    displayName: "Webhook",
    status: "planned",
    description: "Future webhook fan-out — not implemented",
  },
  {
    id: "channel-mobile",
    kind: "mobile",
    displayName: "Mobile",
    status: "planned",
    description: "Future mobile client channel — not implemented",
  },
  {
    id: "channel-microsoft-teams",
    kind: "microsoft_teams",
    displayName: "Microsoft Teams",
    status: "planned",
    description: "Future Microsoft Teams transport — not implemented",
  },
  {
    id: "channel-slack",
    kind: "slack",
    displayName: "Slack",
    status: "planned",
    description: "Future Slack transport — not implemented",
  },
];

export function createAlertChannelRegistry(
  seed: EnterpriseAlertChannel[] = SEED_CHANNELS,
): AlertChannelRegistryPort {
  const store = new Map<string, EnterpriseAlertChannel>(seed.map((c) => [c.id, c]));

  return {
    register(channel) {
      store.set(channel.id, channel);
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
    listEnabled() {
      return [...store.values()].filter((c) => c.status === "enabled");
    },
  };
}

export const defaultAlertChannelRegistry = createAlertChannelRegistry();

export function listRegisteredAlertChannels(): EnterpriseAlertChannel[] {
  return defaultAlertChannelRegistry.list();
}
