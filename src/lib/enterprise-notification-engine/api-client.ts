/**
 * CO-NOTIFICATION-001 — Client API for Enterprise Notification Engine.
 */

import {
  ENE_API_PATH,
  ENE_PREFS_API_PATH,
  ENE_SOUND_PREF_STORAGE_KEY,
} from "@/constants/enterprise-notification-engine";
import {
  listSessionEneForUser,
  markSessionEneRead,
  rememberEneNotifications,
} from "@/lib/enterprise-notification-engine/session-registry";
import type {
  EnterpriseNotificationItem,
  EnterpriseNotificationSoundPreference,
  ListEnterpriseNotificationsQuery,
} from "@/types/enterprise-notification-engine";

function buildQuery(params: ListEnterpriseNotificationsQuery): string {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.since) q.set("since", params.since);
  if (params.unreadOnly) q.set("unreadOnly", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listEnterpriseNotifications(
  query: ListEnterpriseNotificationsQuery = {},
  userId?: string | null,
): Promise<EnterpriseNotificationItem[]> {
  try {
    const res = await fetch(`${ENE_API_PATH}${buildQuery(query)}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return userId
        ? listSessionEneForUser(userId, query)
        : [];
    }
    const payload = (await res.json()) as {
      data?: { items?: EnterpriseNotificationItem[] };
      items?: EnterpriseNotificationItem[];
    };
    const items = payload.data?.items ?? payload.items ?? [];
    if (items.length) rememberEneNotifications(items);
    return items;
  } catch {
    return userId ? listSessionEneForUser(userId, query) : [];
  }
}

export async function markEnterpriseNotificationRead(
  id: string,
  userId?: string | null,
): Promise<EnterpriseNotificationItem | null> {
  markSessionEneRead(id, userId ?? undefined);
  try {
    const res = await fetch(`${ENE_API_PATH}/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read" }),
    });
    if (!res.ok) return markSessionEneRead(id, userId ?? undefined);
    const payload = (await res.json()) as {
      data?: { item?: EnterpriseNotificationItem };
      item?: EnterpriseNotificationItem;
    };
    return payload.data?.item ?? payload.item ?? null;
  } catch {
    return markSessionEneRead(id, userId ?? undefined);
  }
}

export function readLocalSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(ENE_SOUND_PREF_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

export function writeLocalSoundPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENE_SOUND_PREF_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function fetchNotificationSoundPreference(): Promise<boolean> {
  try {
    const res = await fetch(ENE_PREFS_API_PATH, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return readLocalSoundPreference();
    const payload = (await res.json()) as {
      data?: EnterpriseNotificationSoundPreference;
    };
    const enabled = payload.data?.soundEnabled;
    if (typeof enabled === "boolean") {
      writeLocalSoundPreference(enabled);
      return enabled;
    }
  } catch {
    /* local */
  }
  return readLocalSoundPreference();
}

export async function saveNotificationSoundPreference(
  soundEnabled: boolean,
): Promise<void> {
  writeLocalSoundPreference(soundEnabled);
  try {
    await fetch(ENE_PREFS_API_PATH, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundEnabled }),
    });
  } catch {
    /* local persists */
  }
}
