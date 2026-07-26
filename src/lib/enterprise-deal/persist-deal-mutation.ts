/**
 * CO-ARCH-004 — Registry-first Deal mutation.
 * Enterprise Deal Registry is the only business write authority.
 * LoanFile-shaped objects are in-memory projections only.
 */
import { isEnterpriseDealRegistryOperational } from "@/constants/enterprise-deal-registry";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { getRememberedDeal, rememberDealMapping } from "@/lib/enterprise-deal/dual-write-store";
import {
  buildLoanFileDealSnapshot,
  mapLoanFileToDealUpdateBody,
} from "@/lib/enterprise-deal/map-loan-file-to-deal";
import { putSessionDeal } from "@/lib/enterprise-session/deal-runtime-cache";
import type { LoanFile } from "@/types/catalyst-one";

const inFlight = new Set<string>();

export function resolveEnterpriseDealIdForFile(file: LoanFile): string | null {
  const fromFile = file.enterpriseDealId?.trim();
  if (fromFile) return fromFile;
  const remembered = getRememberedDeal(file.id)?.dealId?.trim();
  if (remembered) return remembered;
  // Path may already be the Enterprise Deal UUID.
  if (/^[0-9a-f-]{36}$/i.test(file.id)) return file.id;
  return null;
}

export async function persistDealProjectionToRegistry(
  file: LoanFile,
  options: { lendersOnly?: boolean; reason?: string } = {},
): Promise<{ ok: boolean; dealId?: string; error?: string }> {
  if (!isEnterpriseDealRegistryOperational()) {
    return { ok: false, error: "Enterprise Deal Registry not operational." };
  }

  const dealId = resolveEnterpriseDealIdForFile(file);
  if (!dealId) {
    return { ok: false, error: "Missing Enterprise Deal id — cannot persist Deal." };
  }

  if (inFlight.has(dealId)) {
    return { ok: false, error: "Deal persist already in flight." };
  }

  inFlight.add(dealId);
  try {
    let rowVersion =
      getRememberedDeal(file.id)?.rowVersion ??
      (await import("@/lib/enterprise-session/deal-runtime-cache")).peekSessionDeal(dealId)
        ?.rowVersion;

    if (rowVersion == null) {
      const warm = await enterpriseDealApiClient.getDeal(dealId);
      rowVersion = warm.rowVersion;
      rememberDealMapping(file.id, warm);
    }

    const body = options.lendersOnly
      ? {
          rowVersion,
          snapshot: buildLoanFileDealSnapshot(file),
          reason: options.reason || "pipeline_lender_stage",
        }
      : {
          ...mapLoanFileToDealUpdateBody(file, rowVersion),
          reason: options.reason || "deal_workspace_persist",
        };

    const updated = await enterpriseDealApiClient.updateDeal(dealId, body);
    rememberDealMapping(file.id, updated);
    putSessionDeal(updated);
    try {
      const { bindSessionDeal } = await import("@/lib/enterprise-session/session-context");
      bindSessionDeal(updated);
    } catch {
      /* bind best-effort */
    }
    return { ok: true, dealId: updated.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deal Registry persist failed";
    console.error("[CO-ARCH-004] Registry persist failed", err);
    return { ok: false, error: message };
  } finally {
    inFlight.delete(dealId);
  }
}
