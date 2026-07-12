"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ECG_LIFECYCLE_FLOW,
  getEcgConfigurationHealth,
  getEcgFrameworkVersion,
  initializeEcgConfigurationCenter,
  listEcgConfigChanges,
  listEcgConfigPackages,
  listEcgDomains,
  listEcgEngines,
  listEcgSections,
  registerEcgSection,
  transitionEcgConfigPackage,
} from "@/lib/enterprise-interface-configuration-grants";
import type {
  EcgConfigLifecycleState,
  EcgConfigurationDomain,
  EcgConfigurationHealthSummary,
  EcgEngineRegistration,
  EcgSectionDefinition,
  EcgSectionKind,
} from "@/types/enterprise-interface-configuration-grants";
import {
  OwGlassPanel,
  OwKpiCard,
  OwPanelHeader,
  OwSectionLabel,
} from "@/components/catalyst-one/opportunity-workspace/workspace-design";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  healthy: "border-emerald-500/40 text-emerald-300",
  attention: "border-amber-500/40 text-amber-200",
  incomplete: "border-sky-500/35 text-sky-200",
  not_configured: "border-zinc-600 text-zinc-400",
};

const LIFECYCLE_TONE: Record<EcgConfigLifecycleState, string> = {
  draft: "bg-zinc-500/20 text-zinc-200",
  validate: "bg-sky-500/20 text-sky-200",
  test: "bg-violet-500/20 text-violet-200",
  approve: "bg-amber-500/20 text-amber-200",
  publish: "bg-emerald-500/20 text-emerald-200",
  archive: "bg-zinc-700/40 text-zinc-400",
  rollback: "bg-rose-500/20 text-rose-200",
};

function seedLegacySections() {
  if (listEcgSections().length > 0) return;
  const seed: Array<{
    sectionCode: string;
    sectionName: string;
    kind: EcgSectionKind;
    description: string;
  }> = [
    {
      sectionCode: "ECG-IFACE-SHELL",
      sectionName: "Interface shell",
      kind: "interface",
      description: "Framework placeholder for enterprise interface surfaces.",
    },
    {
      sectionCode: "ECG-CFG-PLATFORM",
      sectionName: "Platform configuration",
      kind: "configuration",
      description: "Framework placeholder for configuration domains.",
    },
    {
      sectionCode: "ECG-GRANT-ACCESS",
      sectionName: "Access grants",
      kind: "grants",
      description: "Framework placeholder — no permission enforcement in SPR-005.",
    },
  ];
  for (const s of seed) {
    registerEcgSection({ ...s, enabled: true, createdBy: "system" });
  }
}

export function EcgFrameworkWorkspace() {
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    initializeEcgConfigurationCenter("ecg-ui");
    seedLegacySections();
    setTick((t) => t + 1);
  }, []);

  const domains = useMemo(() => {
    void tick;
    return listEcgDomains();
  }, [tick]);

  const engines = useMemo(() => {
    void tick;
    return listEcgEngines();
  }, [tick]);

  const health = useMemo(() => {
    void tick;
    return getEcgConfigurationHealth();
  }, [tick]);

  const packages = useMemo(() => {
    void tick;
    return listEcgConfigPackages();
  }, [tick]);

  const audits = useMemo(() => {
    void tick;
    return listEcgConfigChanges().slice(0, 8);
  }, [tick]);

  const sections = useMemo(() => {
    void tick;
    return listEcgSections();
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  const advanceDraft = (domainKey: string) => {
    const draft = packages.find(
      (p) => p.domainKey === domainKey && p.lifecycleState === "draft" && !p.isPublished,
    );
    if (!draft) {
      setMessage(`No draft package for ${domainKey}`);
      return;
    }
    try {
      transitionEcgConfigPackage({
        packageId: draft.id,
        toState: "validate",
        actorId: "ecg-ui",
        reason: "Dashboard lifecycle demo · draft → validate",
      });
      setMessage(`${domainKey}: draft → validate`);
      refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Transition failed");
    }
  };

  return (
    <div className="dark relative space-y-4 rounded-3xl border border-white/5 bg-zinc-950/40 p-3 pb-6 sm:p-4 md:p-5">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.16),transparent_55%)]" />

      <OwGlassPanel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <OwSectionLabel>Enterprise Configuration Center</OwSectionLabel>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">ECG</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Single Source of Truth architecture for configurable business behaviour. Framework
              only — existing engine rules are not migrated in SPR-005.
            </p>
          </div>
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
            v{getEcgFrameworkVersion()}
          </span>
        </div>
        {message && <p className="text-xs text-teal-300/90">{message}</p>}
      </OwGlassPanel>

      <HealthStrip health={health} />

      <OwGlassPanel>
        <OwPanelHeader
          title="Configuration Domains"
          badge={`${domains.length} domains`}
          description="Status · version · draft/published · last updated · health"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {domains.map((domain) => (
            <DomainCard key={domain.domainKey} domain={domain} onAdvance={advanceDraft} />
          ))}
        </div>
      </OwGlassPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <OwGlassPanel>
          <OwPanelHeader
            title="Configuration Registry"
            badge={`${engines.length} engines`}
            description="Future engines plug in via registerEcgEngine()"
          />
          <div className="mt-3 space-y-2">
            {engines.map((engine) => (
              <EngineRow key={engine.engineKey} engine={engine} />
            ))}
          </div>
        </OwGlassPanel>

        <OwGlassPanel>
          <OwPanelHeader
            title="Lifecycle Architecture"
            description="Draft → Validate → Test → Approve → Publish → Archive → Rollback"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {ECG_LIFECYCLE_FLOW.map((state, i) => (
              <div key={state} className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    LIFECYCLE_TONE[state],
                  )}
                >
                  {state}
                </span>
                {i < ECG_LIFECYCLE_FLOW.length - 1 && (
                  <span className="text-zinc-600">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-400">
            Version model: major · minor · draft · published · rollback candidate. Packages hold
            opaque payloads for future migration.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Recent config audit
            </p>
            {audits.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">
                  {a.domainKey}.{a.fieldPath}
                </p>
                <p className="text-zinc-500">
                  {a.actorId} · {new Date(a.occurredOn).toLocaleString()} · {a.reason}
                </p>
              </div>
            ))}
            {audits.length === 0 && (
              <p className="text-xs text-zinc-500">No configuration changes recorded yet.</p>
            )}
          </div>
        </OwGlassPanel>
      </div>

      <OwGlassPanel>
        <OwPanelHeader
          title="Framework Sections"
          badge="SPR-001"
          description="Interface / Configuration / Grants catalogue (retained)"
        />
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {sections.map((s: EcgSectionDefinition) => (
            <div
              key={s.id}
              className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2"
            >
              <p className="text-xs font-medium text-zinc-100">{s.sectionName}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.kind}</p>
              <p className="mt-1 text-[11px] text-zinc-400">{s.description}</p>
            </div>
          ))}
        </div>
      </OwGlassPanel>
    </div>
  );
}

function HealthStrip({ health }: { health: EcgConfigurationHealthSummary }) {
  return (
    <OwGlassPanel>
      <OwSectionLabel>Configuration Health</OwSectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        <OwKpiCard label="Registered Engines" value={`${health.registeredEngines}`} tone="info" />
        <OwKpiCard label="Configured Engines" value={`${health.configuredEngines}`} tone="good" />
        <OwKpiCard
          label="Pending Configuration"
          value={`${health.pendingConfiguration}`}
          tone={health.pendingConfiguration > 0 ? "warn" : "good"}
        />
        <OwKpiCard label="Draft Configurations" value={`${health.draftConfigurations}`} tone="info" />
        <OwKpiCard
          label="Published Configurations"
          value={`${health.publishedConfigurations}`}
          tone="good"
        />
        <OwKpiCard
          label="Domain Health"
          value={`${health.domainsHealthy}/${health.domainsTotal}`}
          hint={health.overallStatus}
          tone={
            health.overallStatus === "healthy"
              ? "good"
              : health.overallStatus === "attention"
                ? "warn"
                : "critical"
          }
        />
      </div>
    </OwGlassPanel>
  );
}

function DomainCard({
  domain,
  onAdvance,
}: {
  domain: EcgConfigurationDomain;
  onAdvance: (domainKey: string) => void;
}) {
  const published = domain.publishedVersion?.label ?? "—";
  const draftOrPublished =
    domain.lifecycleState === "publish" ? "Published" : domain.lifecycleState === "draft" ? "Draft" : domain.lifecycleState;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/45 p-3 transition-colors hover:border-teal-500/25">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-50">{domain.name}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-400">{domain.description}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase",
            STATUS_TONE[domain.status],
          )}
        >
          {domain.status.replace(/_/g, " ")}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-zinc-500">Version</dt>
          <dd className="font-medium text-zinc-200">{domain.currentVersion.label}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">State</dt>
          <dd className="font-medium capitalize text-zinc-200">{draftOrPublished}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Published</dt>
          <dd className="font-medium text-zinc-200">{published}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Updated</dt>
          <dd className="font-medium text-zinc-200">
            {new Date(domain.lastUpdatedOn).toLocaleDateString()}
          </dd>
        </div>
      </dl>
      {domain.lifecycleState === "draft" && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 h-7 text-xs"
          onClick={() => onAdvance(domain.domainKey)}
        >
          Advance draft → validate
        </Button>
      )}
    </div>
  );
}

function EngineRow({ engine }: { engine: EcgEngineRegistration }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-100">{engine.engineName}</p>
        <p className="text-[10px] text-zinc-500">
          {engine.engineKey} · adapter {engine.adapterReady ? "ready" : "pending"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-zinc-300">
          v{engine.frameworkVersion}
        </span>
        <span className={cn("rounded border px-1.5 py-0.5", STATUS_TONE[engine.configurationStatus])}>
          {engine.configurationStatus.replace(/_/g, " ")}
        </span>
        <span className="text-zinc-400">
          Pub {engine.publishedVersionLabel ?? "—"}
          {engine.lastPublishedOn
            ? ` · ${new Date(engine.lastPublishedOn).toLocaleDateString()}`
            : ""}
        </span>
      </div>
    </div>
  );
}
