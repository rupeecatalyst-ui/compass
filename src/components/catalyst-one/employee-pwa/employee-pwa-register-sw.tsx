"use client";

import { useEffect, useState } from "react";
import { EMPLOYEE_PWA_SW_PATH } from "@/constants/employee-pwa";
import { Button } from "@/components/ui/button";

export function EmployeePwaRegisterSw() {
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void navigator.serviceWorker
      .register(EMPLOYEE_PWA_SW_PATH, { scope: "/pwa/" })
      .then((reg) => {
        if (cancelled) return;
        setRegistration(reg);
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      data-employee-pwa-update="true"
      className="border-b border-border bg-secondary px-4 py-2 text-xs text-secondary-foreground"
    >
      A Catalyst One update is ready.
      <Button
        type="button"
        size="sm"
        className="ml-2 h-8"
        onClick={() => {
          registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        }}
      >
        Refresh
      </Button>
    </div>
  );
}
