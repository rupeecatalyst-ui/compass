"use client";

import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaServiceWorkerRegister } from "@/components/pwa/pwa-service-worker-register";
import { PwaUpdateBanner } from "@/components/pwa/pwa-update-banner";

export function PwaShell() {
  return (
    <>
      <PwaServiceWorkerRegister />
      <PwaUpdateBanner />
      <PwaInstallPrompt />
    </>
  );
}
