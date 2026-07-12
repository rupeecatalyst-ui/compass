export interface MissionControlNotificationItem {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  createdOn: string;
}

export interface MissionControlNotificationsPort {
  listUnread(): Promise<MissionControlNotificationItem[]>;
}

export function createMissionControlNotificationsStub(): MissionControlNotificationsPort {
  return {
    async listUnread() {
      return [];
    },
  };
}
