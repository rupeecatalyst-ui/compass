/**
 * Virus scan hook — pluggable pre-ingest gate for Customer Portal uploads.
 * Current certification adapter always passes; swap for AV provider later.
 */

export type VirusScanHookResult =
  | { ok: true; provider: string; scannedAt: string }
  | { ok: false; provider: string; scannedAt: string; reason: string };

export type VirusScanHook = (file: File) => Promise<VirusScanHookResult>;

const defaultVirusScanHook: VirusScanHook = async (file) => {
  // Placeholder adapter — real AV integration lands behind this contract only.
  if (!file || file.size <= 0) {
    return {
      ok: false,
      provider: "noop-av-hook",
      scannedAt: new Date().toISOString(),
      reason: "Empty file rejected by virus scan hook.",
    };
  }
  return {
    ok: true,
    provider: "noop-av-hook",
    scannedAt: new Date().toISOString(),
  };
};

let activeHook: VirusScanHook = defaultVirusScanHook;

export function configureCustomerPortalVirusScanHook(hook: VirusScanHook): void {
  activeHook = hook;
}

export function resetCustomerPortalVirusScanHook(): void {
  activeHook = defaultVirusScanHook;
}

export async function runCustomerPortalVirusScan(file: File): Promise<VirusScanHookResult> {
  return activeHook(file);
}
