"use client";

import { useEffect } from "react";

/** Registers the COMPASS service worker in production only. */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Non-blocking — site remains usable without PWA.
      });
  }, []);

  return null;
}
