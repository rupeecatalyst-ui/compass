/**
 * DKF knowledge registry — packages from ECG or framework scaffold.
 * No hardcoded business knowledge; scaffolds are architectural placeholders.
 */

import { buildDkfFrameworkScaffoldPackages } from "@/constants/enterprise-decision-engine";
import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import type { DkfKnowledgePackage } from "@/types/enterprise-decision-engine";
import { recordEdeAudit } from "./audit-integration";
import { getEdePorts } from "./composition";
import { getEdeOrchestrationConfig } from "./config";

export function registerDkfKnowledgePackage(
  input: Omit<DkfKnowledgePackage, "knowledgeId" | "createdOn" | "modifiedOn"> & {
    knowledgeId?: string;
  },
  actorId = "system",
): DkfKnowledgePackage {
  const now = new Date().toISOString();
  const pkg: DkfKnowledgePackage = {
    ...input,
    knowledgeId: input.knowledgeId ?? crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
  };
  getEdePorts().knowledgePackages.save(pkg);
  recordEdeAudit({
    entityId: pkg.knowledgeId,
    entityType: "knowledge_package",
    action: "created",
    actorId,
    remarks: `DKF package ${pkg.name} v${pkg.version}`,
  });
  return pkg;
}

export function listDkfKnowledgePackages(): DkfKnowledgePackage[] {
  return getEdePorts().knowledgePackages.list();
}

export function getDkfKnowledgePackage(knowledgeId: string): DkfKnowledgePackage | undefined {
  return getEdePorts().knowledgePackages.findById(knowledgeId);
}

function isActivePackage(pkg: DkfKnowledgePackage, asOf = new Date()): boolean {
  if (!pkg.enabled) return false;
  if (pkg.status === "archived" || pkg.status === "expired") return false;
  if (pkg.status === "draft") return false;
  const effective = new Date(pkg.effectiveDate).getTime();
  if (!Number.isNaN(effective) && effective > asOf.getTime()) return false;
  if (pkg.expiryDate) {
    const expiry = new Date(pkg.expiryDate).getTime();
    if (!Number.isNaN(expiry) && expiry < asOf.getTime()) return false;
  }
  return true;
}

/** Load ECG-published packages when preferEcgKnowledge; else ensure scaffold. */
export function resolveDkfKnowledgePackages(): {
  packages: DkfKnowledgePackage[];
  source: "ecg" | "framework_scaffold" | "mixed" | "none";
} {
  const config = getEdeOrchestrationConfig();
  const stored = listDkfKnowledgePackages();

  if (config.preferEcgKnowledge) {
    try {
      const adapter = createEcgEngineConfigAdapter("ede");
      const published = adapter.readPublishedConfig();
      const fromEcg = published?.knowledgePackages as DkfKnowledgePackage[] | undefined;
      if (fromEcg?.length) {
        for (const pkg of fromEcg) {
          getEdePorts().knowledgePackages.save({
            ...pkg,
            source: "ecg",
            knowledgeId: pkg.knowledgeId || crypto.randomUUID(),
            createdOn: pkg.createdOn ?? new Date().toISOString(),
            modifiedOn: new Date().toISOString(),
          });
        }
        const active = listDkfKnowledgePackages().filter((p) => isActivePackage(p));
        const hasScaffold = active.some((p) => p.source === "framework_scaffold");
        const hasEcg = active.some((p) => p.source === "ecg");
        return {
          packages: active,
          source: hasEcg && hasScaffold ? "mixed" : hasEcg ? "ecg" : "framework_scaffold",
        };
      }
    } catch {
      // ECG may be uninitialised.
    }
  }

  if (stored.length === 0) {
    initializeDkfFrameworkScaffold();
  }

  const active = listDkfKnowledgePackages().filter((p) => isActivePackage(p));
  return {
    packages: active,
    source: active.length ? "framework_scaffold" : "none",
  };
}

export function initializeDkfFrameworkScaffold(actorId = "system"): DkfKnowledgePackage[] {
  if (listDkfKnowledgePackages().some((p) => p.source === "framework_scaffold")) {
    return listDkfKnowledgePackages();
  }
  return buildDkfFrameworkScaffoldPackages().map((draft) =>
    registerDkfKnowledgePackage(draft, actorId),
  );
}
