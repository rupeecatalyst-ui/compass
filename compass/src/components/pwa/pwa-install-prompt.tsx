"use client";

import { useCallback, useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { useDiscoveryOptional } from "@/components/home-loan-experience/discovery/discovery-context";
import { pwaConfig } from "@/config/pwa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "compass-pwa-install-dismissed";
const ENGAGED_KEY = "compass-pwa-engaged";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const safari = /safari/i.test(ua) && !/crios|fxios/i.test(ua);
  return ios && safari;
}

function markEngaged() {
  try {
    sessionStorage.setItem(ENGAGED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Deferred install prompt — never blocks the customer journey. */
export function PwaInstallPrompt() {
  const discovery = useDiscoveryOptional();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onEngage = () => markEngaged();
    window.addEventListener("compass:customer-engaged", onEngage);

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    return () => {
      window.removeEventListener("compass:customer-engaged", onEngage);
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, []);

  useEffect(() => {
    if (discovery?.journeySessionToken) {
      markEngaged();
    }
  }, [discovery?.journeySessionToken]);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const engaged = sessionStorage.getItem(ENGAGED_KEY) === "1";
    const journeyStarted = Boolean(discovery?.journeySessionToken);
    if (!engaged && !journeyStarted) return;

    if (deferred) {
      const timer = window.setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }

    if (isIosSafari() && journeyStarted) {
      const timer = window.setTimeout(() => {
        setIosGuide(true);
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [deferred, discovery?.journeySessionToken]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setIosGuide(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (!visible || isStandalone()) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-4 bottom-4 z-[55] mx-auto max-w-md rounded-2xl border border-white/[0.1]",
        "bg-[#0d1119]/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-6",
      )}
      role="dialog"
      aria-label="Install COMPASS"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{pwaConfig.installPromptCopy}</p>
          {iosGuide ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Share className="h-3.5 w-3.5 shrink-0" />
              {pwaConfig.iosInstallSteps}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Optional — continue in your browser anytime.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred ? (
              <Button size="sm" className="h-9" onClick={() => void install()}>
                Install
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-9" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close install suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function signalCompassCustomerEngaged() {
  if (typeof window === "undefined") return;
  markEngaged();
  window.dispatchEvent(new CustomEvent("compass:customer-engaged"));
}
