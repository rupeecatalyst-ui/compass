"use client";

/**
 * CO-NOTIFICATION-001 / CO-NOTIFICATION-001B — CHANAKYA Enterprise Notification toast host.
 * Visual: CHANAKYA portrait identity · mandatory premium dark card · bottom-right.
 * Behaviour unchanged: non-blocking · ~10s dismiss · sound + Silent · multi-tab sound lock.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, X } from "lucide-react";
import { ChanakyaAvatar } from "@/components/catalyst-one/chanakya-enterprise-identity/chanakya-avatar";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  CEI_DEFAULT_AVATAR_PACK,
  CEI_OFFICIAL_SUBTITLE,
  CEI_OFFICIAL_TITLE,
} from "@/constants/chanakya-enterprise-identity";
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

function buildBusinessContext(item: EnterpriseNotificationItem): string | null {
  const parts = [item.customerName, item.productLabel, item.amountLabel].filter(
    (p): p is string => Boolean(p?.trim()),
  );
  if (parts.length) return parts.join(" · ");
  if (item.body?.trim()) return item.body.trim();
  return null;
}

function buildFactualMessage(item: EnterpriseNotificationItem): string | null {
  const context = buildBusinessContext(item);
  if (item.description?.trim()) return item.description.trim();
  if (item.body?.trim() && context !== item.body.trim()) return item.body.trim();
  return null;
}

function buildActorLine(item: EnterpriseNotificationItem): string | null {
  if (item.previousValue && item.newValue) {
    return `${item.previousValue} → ${item.newValue}`;
  }
  if (item.actorName?.trim()) return `Created by ${item.actorName.trim()}`;
  return null;
}

function openActionLabel(item: EnterpriseNotificationItem): string {
  if (item.opportunityId && !item.dealId) return "Open Opportunity →";
  if (item.dealId) return "Open Deal →";
  if (item.contactId) return "Open Contact →";
  return "Open →";
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
      className={cn(
        "pointer-events-none fixed z-[80] flex w-[min(100vw-1.5rem,22.5rem)] flex-col-reverse gap-2",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]",
        "max-sm:bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.75rem))]",
      )}
      data-sprint="CO-NOTIFICATION-001B"
      data-ene-avatar={CEI_DEFAULT_AVATAR_PACK.portraitSrc}
      role="region"
      aria-label="CHANAKYA notifications"
    >
      {toasts.map((item) => {
        const context = buildBusinessContext(item);
        const message = buildFactualMessage(item);
        const actorLine = buildActorLine(item);

        return (
          <article
            key={item.toastKey}
            className={cn(
              "pointer-events-auto overflow-hidden rounded-xl border border-zinc-700/80",
              "bg-[#0f1419] text-zinc-100 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]",
              "ring-1 ring-teal-500/15",
            )}
            onMouseEnter={() => setHovering(item.id)}
            onMouseLeave={() => setHovering(null)}
          >
            <div className="flex gap-3 p-3.5">
              <ChanakyaAvatar
                size="md"
                shape="circle"
                animate={false}
                className="mt-0.5 ring-1 ring-teal-400/25"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold tracking-wide text-zinc-50">
                      {CEI_OFFICIAL_TITLE}
                    </p>
                    <p className="text-[10px] font-medium tracking-[0.04em] text-zinc-400">
                      {CEI_OFFICIAL_SUBTITLE}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors",
                      "hover:bg-zinc-800 hover:text-zinc-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                    aria-label="Dismiss"
                    onClick={() => dismiss(item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h3 className="mt-2 text-[14px] font-semibold leading-snug text-zinc-50">
                  {item.title}
                </h3>

                {context ? (
                  <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-zinc-200">
                    {context}
                  </p>
                ) : null}

                {actorLine ? (
                  <p className="mt-0.5 text-[11.5px] text-zinc-400">{actorLine}</p>
                ) : null}

                {message ? (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-300">
                    “{message}”
                  </p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-1 py-0.5 text-[12px] font-semibold text-teal-300",
                      "hover:text-teal-200 hover:underline",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                    onClick={() => void onOpen(item)}
                  >
                    {openActionLabel(item)}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium",
                      soundEnabled
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        : "bg-zinc-800/80 text-amber-200/90",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                    title={
                      soundEnabled
                        ? "Silent — keep visual, mute sound"
                        : "Sound muted (Silent on)"
                    }
                    aria-label={
                      soundEnabled
                        ? "Mute notification sound"
                        : "Enable notification sound"
                    }
                    aria-pressed={!soundEnabled}
                    onClick={() => void toggleSilent()}
                  >
                    <BellOff className="h-3.5 w-3.5" aria-hidden />
                    <span>{soundEnabled ? "Silent" : "Silent on"}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
