/**
 * CO-ARCH-005 — Four-layer Lender architecture helpers.
 * Layer 1 Lender · Layer 2 Supported Products (capability) ·
 * Layer 3 Commercial Programs · Layer 4 Published Programs (comparison only).
 */
import { LENDER_REGISTRY_PRODUCT_OPTIONS } from "@/types/enterprise-lender-registry";
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
  LenderRegistryProductCode,
} from "@/types/enterprise-lender-registry";
import { mapDirectoryProductIdToRegistryCode } from "@/lib/enterprise-lender-registry/map-to-directory";

export function isPublishedCommercialProgram(
  program: EnterpriseLenderProgramRecord,
): boolean {
  return (
    !program.isDeleted &&
    program.enabled &&
    program.status === "active" &&
    program.lifecycleStatus === "active"
  );
}

export function isDraftCommercialProgram(
  program: EnterpriseLenderProgramRecord,
): boolean {
  return (
    !program.isDeleted &&
    (program.status === "draft" || program.lifecycleStatus === "draft")
  );
}

/** Lenders whose Supported Products (capability) include the directory product. */
export function countLendersSupportingDirectoryProduct(
  lenders: EnterpriseLenderRecord[],
  directoryProductId: string,
): number {
  const code = mapDirectoryProductIdToRegistryCode(directoryProductId);
  if (!code) return 0;
  return lenders.filter((l) => {
    if (l.isDeleted || !l.enabled) return false;
    return (l.productsSupported ?? []).includes(code);
  }).length;
}

export function productLabelForCode(code: string): string {
  return (
    LENDER_REGISTRY_PRODUCT_OPTIONS.find((p) => p.code === code)?.label ?? code
  );
}

export interface LenderRegistryAdminDashboardMetrics {
  totalLenders: number;
  lendersWithSupportedProducts: number;
  supportedProductAssignments: number;
  commercialPrograms: number;
  publishedPrograms: number;
  draftPrograms: number;
  inactiveOrArchivedPrograms: number;
  programsAwaitingApproval: number;
}

export function buildLenderRegistryAdminDashboardMetrics(
  lenders: EnterpriseLenderRecord[],
  programs: EnterpriseLenderProgramRecord[],
): LenderRegistryAdminDashboardMetrics {
  const activeLenders = lenders.filter((l) => !l.isDeleted);
  const livePrograms = programs.filter((p) => !p.isDeleted);

  return {
    totalLenders: activeLenders.length,
    lendersWithSupportedProducts: activeLenders.filter(
      (l) => (l.productsSupported ?? []).length > 0,
    ).length,
    supportedProductAssignments: activeLenders.reduce(
      (sum, l) => sum + (l.productsSupported ?? []).length,
      0,
    ),
    commercialPrograms: livePrograms.length,
    publishedPrograms: livePrograms.filter(isPublishedCommercialProgram).length,
    draftPrograms: livePrograms.filter(isDraftCommercialProgram).length,
    inactiveOrArchivedPrograms: livePrograms.filter(
      (p) =>
        p.status === "archived" ||
        p.lifecycleStatus === "archived" ||
        p.lifecycleStatus === "inactive" ||
        !p.enabled,
    ).length,
    programsAwaitingApproval: livePrograms.filter(
      (p) => p.approvalStatus === "pending",
    ).length,
  };
}

export interface CommercialProgramValidationReport {
  generatedAt: string;
  lendersWithoutSupportedProducts: Array<{ id: string; label: string; code: string }>;
  lendersWithCapabilityButZeroPrograms: Array<{
    id: string;
    label: string;
    code: string;
    supportedProducts: string[];
  }>;
  draftPrograms: Array<{ id: string; label: string; lenderId: string }>;
  expiredPrograms: Array<{ id: string; label: string; effectiveUntil: string }>;
  disabledPrograms: Array<{ id: string; label: string }>;
  programsMissingRoi: Array<{ id: string; label: string }>;
  programsMissingLtv: Array<{ id: string; label: string }>;
  unpublishedPrograms: Array<{ id: string; label: string; status: string }>;
}

export function buildCommercialProgramValidationReport(
  lenders: EnterpriseLenderRecord[],
  programs: EnterpriseLenderProgramRecord[],
): CommercialProgramValidationReport {
  const activeLenders = lenders.filter((l) => !l.isDeleted);
  const livePrograms = programs.filter((p) => !p.isDeleted);
  const now = Date.now();

  const programsByLender = new Map<string, EnterpriseLenderProgramRecord[]>();
  for (const program of livePrograms) {
    const list = programsByLender.get(program.lenderId) ?? [];
    list.push(program);
    programsByLender.set(program.lenderId, list);
  }

  const lendersWithoutSupportedProducts = activeLenders
    .filter((l) => !(l.productsSupported ?? []).length)
    .map((l) => ({
      id: l.id,
      label: l.displayName || l.label,
      code: l.code,
    }));

  const lendersWithCapabilityButZeroPrograms = activeLenders
    .filter((l) => (l.productsSupported ?? []).length > 0)
    .filter((l) => !(programsByLender.get(l.id)?.length))
    .map((l) => ({
      id: l.id,
      label: l.displayName || l.label,
      code: l.code,
      supportedProducts: [...(l.productsSupported ?? [])],
    }));

  return {
    generatedAt: new Date().toISOString(),
    lendersWithoutSupportedProducts,
    lendersWithCapabilityButZeroPrograms,
    draftPrograms: livePrograms.filter(isDraftCommercialProgram).map((p) => ({
      id: p.id,
      label: p.label,
      lenderId: p.lenderId,
    })),
    expiredPrograms: livePrograms
      .filter((p) => p.effectiveUntil && Date.parse(p.effectiveUntil) < now)
      .map((p) => ({
        id: p.id,
        label: p.label,
        effectiveUntil: p.effectiveUntil!,
      })),
    disabledPrograms: livePrograms
      .filter((p) => !p.enabled)
      .map((p) => ({ id: p.id, label: p.label })),
    programsMissingRoi: livePrograms
      .filter((p) => p.roiPercent == null && p.minRoiPercent == null)
      .map((p) => ({ id: p.id, label: p.label })),
    programsMissingLtv: livePrograms
      .filter((p) => p.maxLtvPercent == null)
      .map((p) => ({ id: p.id, label: p.label })),
    unpublishedPrograms: livePrograms
      .filter((p) => !isPublishedCommercialProgram(p))
      .map((p) => ({
        id: p.id,
        label: p.label,
        status: `${p.status}/${p.lifecycleStatus}`,
      })),
  };
}

export function supportedProductOptionsForLender(
  lender: EnterpriseLenderRecord | null | undefined,
): Array<{ code: LenderRegistryProductCode; label: string }> {
  const supported = new Set(lender?.productsSupported ?? []);
  return LENDER_REGISTRY_PRODUCT_OPTIONS.filter((p) => supported.has(p.code)).map(
    (p) => ({ code: p.code, label: p.label }),
  );
}
