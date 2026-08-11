"use client";

/**
 * CO-NOTIFICATION-001 — Bottom-right enterprise notification toast host.
 * Non-blocking · auto-dismiss ~10s · sound + Silent · multi-tab sound lock.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, BellRing, X } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  ENE_CHIME_PUBLIC_PATH,
  ENE_MAX_STACK,
  ENE_POLL_INTERVAL_MS,
  ENE_SOUND_LOCK_KEY,
  ENE_SOUND_THROTTLE_MS,
  ENE_TAB_CHANNEL,
  ENE_TOAST_AUTO_DISMISS_MS,
} from "@/constants/enterprise-notification-engine";
import {
  fetchNotificationSoundPreference,
  listEnterpriseNotifications,
  markEnterpriseNotificationRead,
  saveNotificationSoundPreference,
} from "@/lib/enterprise-notification-engine";
import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";
import { cn } from "@/lib/utils";

type ToastItem = EnterpriseNotificationItem & { toastKey: string };

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function claimSoundLeadership(): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(ENE_SOUND_LOCK_KEY);
    const prev = raw ? Number(raw) : 0;
    if (prev && now - prev < ENE_SOUND_THROTTLE_MS) return false;
    localStorage.setItem(ENE_SOUND_LOCK_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

export function EnterpriseNotificationHost() {
  const { user, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hovering, setHovering] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());
  const lastSoundAt = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    void fetchNotificationSoundPreference().then(setSoundEnabled);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      channelRef.current = new BroadcastChannel(ENE_TAB_CHANNEL);
      channelRef.current.onmessage = (ev) => {
        const data = ev.data as { type?: string; id?: string };
        if (data?.type === "sound_played") {
          lastSoundAt.current = Date.now();
        }
        if (data?.type === "dismiss" && data.id) {
          setToasts((prev) => prev.filter((t) => t.id !== data.id));
        }
      };
    } catch {
      channelRef.current = null;
    }
    return () => {
      channelRef.current?.close();
    };
  }, []);

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastSoundAt.current < ENE_SOUND_THROTTLE_MS) return;
    if (!claimSoundLeadership()) return;
    lastSoundAt.current = now;
    channelRef.current?.postMessage({ type: "sound_played" });
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(ENE_CHIME_PUBLIC_PATH);
        audioRef.current.volume = 0.45;
      }
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {
        /* autoplay policies — silent fail */
      });
    } catch {
      /* ignore */
    }
  }, [soundEnabled]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
    channelRef.current?.postMessage({ type: "dismiss", id });
  }, []);

  const scheduleDismiss = useCallback(
    (id: string) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      const handle = window.setTimeout(() => {
        if (hovering === id) {
          scheduleDismiss(id);
          return;
        }
        dismiss(id);
      }, ENE_TOAST_AUTO_DISMISS_MS);
      timers.current.set(id, handle);
    },
    [dismiss, hovering],
  );

  const pushToast = useCallback(
    (item: EnterpriseNotificationItem) => {
      if (seenIds.current.has(item.id)) return;
      seenIds.current.add(item.id);
      setToasts((prev) => {
        const next = [{ ...item, toastKey: `${item.id}:${Date.now()}` }, ...prev];
        return next.slice(0, ENE_MAX_STACK);
      });
      scheduleDismiss(item.id);
      playChime();
    },
    [playChime, scheduleDismiss],
  );

  const poll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    const items = await listEnterpriseNotifications(
      { limit: 20, unreadOnly: true },
      user.id,
    );
    for (const item of items.slice().reverse()) {
      pushToast(item);
    }
  }, [isAuthenticated, user?.id, pushToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void poll();
    const id = window.setInterval(() => void poll(), ENE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, poll]);

  const onOpen = async (item: ToastItem) => {
    await markEnterpriseNotificationRead(item.id, user?.id);
    dismiss(item.id);
    if (item.href) router.push(item.href);
  };

  const toggleSilent = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await saveNotificationSoundPreference(next);
  };

  if (!isAuthenticated || toasts.length === 0) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] hidden" aria-hidden />
    );
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(100vw-1.5rem,22rem)] flex-col-reverse gap-2"
      data-sprint="CO-NOTIFICATION-001"
      role="region"
      aria-label="Enterprise notifications"
    >
      {toasts.map((item) => (
        <div
          key={item.toastKey}
          className={cn(
            "pointer-events-auto rounded-xl border border-border/80 bg-card/95 p-3 shadow-lg backdrop-blur-md",
            "ring-1 ring-black/5",
          )}
          onMouseEnter={() => setHovering(item.id)}
          onMouseLeave={() => setHovering(null)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">🔔 {item.title}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title={soundEnabled ? "Silent (mute sound)" : "Sound on"}
                aria-label={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
                onClick={() => void toggleSilent()}
              >
                {soundEnabled ? (
                  <BellRing className="h-3.5 w-3.5" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
                onClick={() => dismiss(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-[13px] font-medium leading-snug text-foreground/90">
            {item.body}
          </p>
          {item.description ? (
            <p className="mt-1 text-[12px] text-muted-foreground">{item.description}</p>
          ) : null}
          {item.actorName ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {item.previousValue && item.newValue
                ? `${item.previousValue} → ${item.newValue}`
                : `By ${item.actorName}`}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatTime(item.occurredAt)}
            </span>
            <button
              type="button"
              className="text-[11px] font-semibold text-teal-700 hover:underline dark:text-teal-300"
              onClick={() => void onOpen(item)}
            >
              Open →
            </button>
          </div>
          {!soundEnabled ? (
            <p className="mt-1 text-[10px] text-muted-foreground">🔕 Silent — sound muted</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
