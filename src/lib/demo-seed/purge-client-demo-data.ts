/**
 * CO-HOTFIX-003 — Clear sticky browser demo/business caches when demo seeds are off.
 * Call once on authenticated shell mount. Idempotent.
 */

import { STORAGE_KEYS } from "@/constants/animations";
import { DOCUMENT_REGISTRY_STORAGE_KEY } from "@/constants/document-registry";
import { ELW_HIERARCHY_STORAGE_KEY } from "@/constants/enterprise-lender-workspace";
import { EUM_STORAGE_KEY } from "@/constants/enterprise-user-management";
import { ORG_DOC_STORAGE_KEY } from "@/constants/organization-documents";
import { SDE_STORAGE_KEY } from "@/constants/system-driven-enterprise";
import { isDemoSeedEnabled } from "@/lib/demo-seed/environment";

const DEMO_BUSINESS_STORAGE_KEYS = [
  STORAGE_KEYS.LOAN_FILES_SAVED_VIEWS,
  STORAGE_KEYS.CUSTOMERS_DATA,
  DOCUMENT_REGISTRY_STORAGE_KEY,
  ELW_HIERARCHY_STORAGE_KEY,
  EUM_STORAGE_KEY,
  ORG_DOC_STORAGE_KEY,
  SDE_STORAGE_KEY,
  "catalyst.strategic.deviation-mitigant",
  "chanakya.ugj.sessions.v1",
  "chanakya.coaching.responses.v1",
  "chanakya.stage.transitions.v1",
  "c1:chanakya-radar:daily-operational-work",
  "catalyst-one:chanakya-radar:view-state",
  "catalyst.enterprise.outbox",
  "catalyst.contact-strategy.actions",
] as const;

let purgedThisSession = false;

/** Removes known demo / transactional browser caches when production/prisma mode. */
export function purgeClientDemoBusinessDataIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (isDemoSeedEnabled()) return;
  if (purgedThisSession) return;
  purgedThisSession = true;

  try {
    for (const key of DEMO_BUSINESS_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    // Prefixed / dynamic keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("catalyst.strategic.deviation-mitigant:") ||
        k.startsWith("catalyst.stated-draft:") ||
        k.startsWith("compass:stated-draft:") ||
        k.startsWith("slp:") ||
        k.includes("demo")
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) window.localStorage.removeItem(k);
  } catch {
    /* ignore storage errors */
  }
}
