"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { pwaConfig } from "@/config/pwa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "compass-pwa-update-dismissed";

export function PwaUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setWaiting(registration.waiting);
        setVisible(sessionStorage.getItem(DISMISS_KEY) !== "1");
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(registration.waiting);
            setVisible(sessionStorage.getItem(DISMISS_KEY) !== "1");
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waiting?.postMessage({ type: "SKIP_WAITING" });
    sessionStorage.removeItem(DISMISS_KEY);
  }, [waiting]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  if (!visible || !waiting) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] border-b border-primary/25 bg-[#0a0f17]/95 px-4 py-3 backdrop-blur-md",
        "flex items-center justify-between gap-3 text-sm",
      )}
    >
      <p className="text-muted-foreground">A new version of COMPASS is ready.</p>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" className="h-8" onClick={applyUpdate}>
          Update
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss update notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
