"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Layers,
  Search,
  Shield,
} from "lucide-react";
import {
  ECKF_ENTERPRISE_PRINCIPLE,
  ECKF_FRAMEWORK_VERSION,
  ECKF_OFFICIAL_NAME,
  ECKF_PRODUCT_NAV,
  ECKF_PROGRAM_STATUS_LABELS,
  ECKF_SECTIONS,
} from "@/constants/enterprise-credit-knowledge-framework";
import {
  getDefaultEckfProductId,
  getEckfProductBlueprint,
} from "@/lib/enterprise-credit-knowledge-framework";
import type {
  EckfProductId,
  EckfSectionId,
} from "@/types/enterprise-credit-knowledge-framework";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";

function SectionShell({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children,
  badge,
}: {
  id: string;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <section
      id={`eckf-section-${id}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {badge ? <StatusPill variant="muted">{badge}</StatusPill> : null}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {open ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t border-border/60 px-5 py-5 animate-in fade-in-0 slide-in-from-top-1 duration-300">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ExpandableCard({
  title,
  summary,
  open,
  onToggle,
  children,
  accent,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-background/60 transition-shadow",
        open && "shadow-md",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/25"
      >
        <span
          className={cn(
            "mt-0.5 h-8 w-1 shrink-0 rounded-full bg-gradient-to-b",
            accent ?? "from-teal-600 to-teal-400",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
        </span>
        {open ? (
          <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/50 px-4 py-4 text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PlaceholderPanel({
  headline,
  body,
}: {
  headline: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-5 py-8 text-center">
      <Layers className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">{headline}</p>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Future workspace · no calculations
      </p>
    </div>
  );
}

/**
 * Enterprise Credit Knowledge Framework — premium knowledge portal.
 * Phase 1: Home Loan master blueprint only. No engines.
 */
export function EckfKnowledgeWorkspace() {
  const [productId, setProductId] = useState<EckfProductId>(getDefaultEckfProductId());
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<EckfSectionId>("overview");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ECKF_SECTIONS.map((s) => [s.id, true])),
  );
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openPrograms, setOpenPrograms] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const blueprint = useMemo(() => getEckfProductBlueprint(productId), [productId]);
  const productMeta = ECKF_PRODUCT_NAV.find((p) => p.id === productId);

  const filteredPrograms = useMemo(() => {
    if (!blueprint) return [];
    const q = search.trim().toLowerCase();
    if (!q) return blueprint.creditPrograms;
    return blueprint.creditPrograms.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.applicableCustomerType.toLowerCase().includes(q),
    );
  }, [blueprint, search]);

  useEffect(() => {
    const el = document.getElementById(`eckf-section-${activeSection}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-5.5rem)] flex-col md:-mx-6 lg:-mx-8">
      {/* Top chrome */}
      <header className="shrink-0 border-b border-border/60 bg-gradient-to-r from-background via-background to-teal-500/[0.06] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <h1 className="text-xl font-semibold tracking-tight">{ECKF_OFFICIAL_NAME}</h1>
              <StatusPill variant="info">{ECKF_FRAMEWORK_VERSION}</StatusPill>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {ECKF_ENTERPRISE_PRINCIPLE}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Enterprise underwriting knowledge portal · not a calculator · not a lender engine
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-xs"
              placeholder="Search knowledge… (placeholder)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Product navigator */}
        <aside className="border-b border-border/60 bg-muted/10 lg:sticky lg:top-0 lg:h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="px-3 py-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Product navigator
            </p>
            <p className="mt-1 px-2 text-[11px] text-muted-foreground">
              Phase 1 validates Home Loan architecture.
            </p>
          </div>
          <nav className="space-y-1 px-2 pb-4">
            {ECKF_PRODUCT_NAV.map((p) => {
              const active = p.id === productId;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.available}
                  onClick={() => {
                    if (!p.available) return;
                    setProductId(p.id);
                    setActiveSection("overview");
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-all",
                    active
                      ? "bg-teal-700 text-white shadow-sm"
                      : p.available
                        ? "text-foreground hover:bg-muted/60"
                        : "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span aria-hidden>{p.emoji}</span>
                    {p.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] leading-snug",
                      active ? "text-white/75" : "text-muted-foreground",
                    )}
                  >
                    {p.available ? p.description : "Coming soon · same framework"}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-border/50 px-3 py-3 lg:block">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Sections
            </p>
            <div className="mt-2 space-y-0.5">
              {ECKF_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(s.id);
                    setOpenSections((prev) => ({ ...prev, [s.id]: true }));
                  }}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors",
                    activeSection === s.id
                      ? "bg-teal-500/15 text-teal-900 dark:text-teal-100"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Knowledge content */}
        <div ref={contentRef} className="min-h-0 overflow-y-auto bg-background px-4 py-5 sm:px-6">
          {!blueprint || !productMeta ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
              <p className="text-sm font-medium">Product blueprint not available yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Future products inherit this framework without UI redesign.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-4 pb-16">
              <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.08] via-card to-card px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl" aria-hidden>
                    {productMeta.emoji}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {blueprint.overview.productName}
                  </h2>
                  <StatusPill variant="success">Master Product Blueprint</StatusPill>
                </div>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {blueprint.overview.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="rounded-md border border-border/60 bg-background/70 px-2 py-1">
                    Master Product
                  </span>
                  <span className="text-border">→</span>
                  <span className="rounded-md border border-border/60 bg-background/70 px-2 py-1">
                    Customer Category
                  </span>
                  <span className="text-border">→</span>
                  <span className="rounded-md border border-border/60 bg-background/70 px-2 py-1">
                    Credit Programs
                  </span>
                  <span className="text-border">→</span>
                  <span className="rounded-md border border-border/60 bg-background/70 px-2 py-1">
                    Lender Variations
                  </span>
                </div>
              </div>

              {/* 1 Overview */}
              <SectionShell
                id="overview"
                title="Product Overview"
                subtitle="Master identity of the Home Loan blueprint"
                open={openSections.overview !== false}
                onToggle={() => toggleSection("overview")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["Product Name", blueprint.overview.productName],
                      ["Security Type", blueprint.overview.securityType],
                      ["Repayment Type", blueprint.overview.repaymentType],
                      ["Typical Borrower", blueprint.overview.typicalBorrower],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border/60 bg-muted/10 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Purpose
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed">{blueprint.overview.purpose}</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Future notes
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {blueprint.overview.futureNotes}
                    </p>
                  </div>
                </div>
              </SectionShell>

              {/* 2 Customer Categories */}
              <SectionShell
                id="customer_categories"
                title="Customer Categories"
                subtitle="Expandable knowledge cards — placeholders only"
                open={openSections.customer_categories !== false}
                onToggle={() => toggleSection("customer_categories")}
              >
                <div className="space-y-3">
                  {blueprint.customerCategories.map((cat) => (
                    <ExpandableCard
                      key={cat.id}
                      title={cat.title}
                      summary={cat.summary}
                      open={Boolean(openCategories[cat.id])}
                      onToggle={() =>
                        setOpenCategories((p) => ({ ...p, [cat.id]: !p[cat.id] }))
                      }
                      accent={
                        cat.kind === "salaried"
                          ? "from-sky-600 to-sky-400"
                          : "from-amber-600 to-amber-400"
                      }
                    >
                      <p>{cat.placeholderBody}</p>
                      <p className="font-medium text-foreground/80">
                        No calculations · No rules · Future knowledge only
                      </p>
                    </ExpandableCard>
                  ))}
                </div>
              </SectionShell>

              {/* 3 Credit Programs */}
              <SectionShell
                id="credit_programs"
                title="Credit Programs"
                subtitle="Income paths under the master blueprint"
                open={openSections.credit_programs !== false}
                onToggle={() => toggleSection("credit_programs")}
                badge={`${filteredPrograms.length} programs`}
              >
                <div className="space-y-3">
                  {filteredPrograms.map((prog) => (
                    <ExpandableCard
                      key={prog.id}
                      title={prog.title}
                      summary={prog.description}
                      open={Boolean(openPrograms[prog.id])}
                      onToggle={() =>
                        setOpenPrograms((p) => ({ ...p, [prog.id]: !p[prog.id] }))
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Purpose
                          </p>
                          <p className="mt-1 text-foreground/90">{prog.purpose}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Applicable customer type
                          </p>
                          <p className="mt-1 text-foreground/90">{prog.applicableCustomerType}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Status
                          </p>
                          <p className="mt-1">
                            <StatusPill variant="muted">
                              {ECKF_PROGRAM_STATUS_LABELS[prog.status]}
                            </StatusPill>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Future notes
                          </p>
                          <p className="mt-1">{prog.futureNotes}</p>
                        </div>
                      </div>
                    </ExpandableCard>
                  ))}
                  {filteredPrograms.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No programs match this search placeholder.
                    </p>
                  ) : null}
                </div>
              </SectionShell>

              {/* 4–9 Placeholders */}
              {blueprint.placeholders.map((ph) => {
                const def = ECKF_SECTIONS.find((s) => s.id === ph.id);
                return (
                  <SectionShell
                    key={ph.id}
                    id={ph.id}
                    title={ph.title}
                    subtitle={def?.subtitle ?? "Future knowledge workspace"}
                    open={openSections[ph.id] !== false}
                    onToggle={() => toggleSection(ph.id)}
                    badge="Future"
                  >
                    <PlaceholderPanel headline={ph.headline} body={ph.body} />
                  </SectionShell>
                );
              })}

              {/* 10 Lender Variations */}
              <SectionShell
                id="lender_variations"
                title="Lender Variations"
                subtitle="Overrides of the master blueprint — architecture only"
                open={openSections.lender_variations !== false}
                onToggle={() => toggleSection("lender_variations")}
              >
                <div className="rounded-xl border border-border/70 bg-muted/10 p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 text-teal-700 dark:text-teal-300" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Master first · lender overrides later
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {blueprint.lenderVariationsNote}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Do not encode lender logic here. Enterprise Lender Workspace will consume this
                        blueprint in a future phase.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionShell>

              {/* 11 Version History */}
              <SectionShell
                id="version_history"
                title="Version History"
                subtitle="Blueprint timeline placeholder"
                open={openSections.version_history !== false}
                onToggle={() => toggleSection("version_history")}
              >
                <ol className="relative space-y-0 border-l border-teal-500/30 pl-5">
                  {blueprint.versionHistory.map((v, idx) => (
                    <li key={v.id} className="relative pb-6 last:pb-0">
                      <span
                        className={cn(
                          "absolute -left-[1.4rem] flex h-5 w-5 items-center justify-center rounded-full border bg-background",
                          idx === 0
                            ? "border-teal-500/50 text-teal-700 dark:text-teal-300"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        <Clock3 className="h-3 w-3" />
                      </span>
                      <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{v.version}</p>
                          <StatusPill variant="muted">{v.at}</StatusPill>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {v.summary}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{v.author}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </SectionShell>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
