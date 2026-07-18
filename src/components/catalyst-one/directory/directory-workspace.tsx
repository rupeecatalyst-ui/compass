"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Plus, Search, User } from "lucide-react";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { CompanyWorkspaceModal } from "@/components/catalyst-one/companies/company-workspace-modal";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/constants/routes";
import {
  getEcmMasterLabel,
  listContactRegistryFilters,
  type ContactRegistryFilterDef,
} from "@/constants/enterprise-contact-master";
import {
  listEcmContacts,
  queryEcmContacts,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  listEcmCompanies,
  queryEcmCompanies,
  seedEcmCompaniesIfEmpty,
} from "@/lib/enterprise-company-master";
import type { EcmCompany } from "@/types/enterprise-company-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { DirectoryListRow } from "@/types/enterprise-company-master";
import { cn } from "@/lib/utils";

function seedContactsIfEmpty() {
  if (listEcmContacts().length > 0) return;
  const seeds = [
    { name: "Rahul Kapoor", mobilePrimary: "9811100099", roles: ["customer" as const], strategic: true },
    { name: "Suresh Patel", mobilePrimary: "9811100001", roles: ["customer" as const], strategic: false },
    { name: "Priya Nair", mobilePrimary: "9811100002", roles: ["employee" as const], strategic: true },
  ];
  for (const s of seeds) {
    try {
      const created = registerEcmContact({
        name: s.name,
        mobilePrimary: s.mobilePrimary,
        roles: [...s.roles],
        ownerName: "Platform Admin",
        createdBy: "system",
      });
      if (s.strategic) {
        updateEcmContact(created.id, { strategicContact: true }, "system");
      }
    } catch {
      /* duplicate mobile */
    }
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function ContactsRegistryInner() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const filters = useMemo(() => listContactRegistryFilters(), []);
  const [filterId, setFilterId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(0);
  const registryVersion = useEcmContactRegistryVersion();

  const [intentOpen, setIntentOpen] = useState(false);
  const [creationIntent, setCreationIntent] = useState<ContactCreationIntentResult | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyMode, setCompanyMode] = useState<"create" | "edit">("create");
  const [activeCompany, setActiveCompany] = useState<EcmCompany | null>(null);
  const [companyInitialName, setCompanyInitialName] = useState<string | undefined>();
  const [linkContactId, setLinkContactId] = useState<string | undefined>();

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "edit">("edit");
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const activeFilter: ContactRegistryFilterDef =
    filters.find((f) => f.id === filterId) ?? filters[0]!;

  useEffect(() => {
    seedEcmCompaniesIfEmpty();
    seedContactsIfEmpty();
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setIntentOpen(true);
    const companyId = searchParams.get("company");
    if (companyId) {
      const found = listEcmCompanies().find((c) => c.id === companyId);
      if (found) {
        setActiveCompany(found);
        setCompanyMode("edit");
        setCompanyOpen(true);
      }
    }
    const contactId = searchParams.get("contact");
    if (contactId) {
      const found = listEcmContacts().find((c) => c.id === contactId);
      if (found) {
        setWorkspaceContact(found);
        setWorkspaceMode("edit");
        setWorkspaceOpen(true);
      }
    }
  }, [searchParams]);

  const allContacts = useMemo(() => {
    void tick;
    void registryVersion;
    return queryEcmContacts({
      search,
      status: "active",
      page: 1,
      pageSize: 200,
      sortBy: "modifiedOn",
      sortDir: "desc",
    }).items;
  }, [search, tick, registryVersion]);

  const companyRows = useMemo(() => {
    void tick;
    return queryEcmCompanies({ search, status: "active", page: 1, pageSize: 200 }).items;
  }, [search, tick]);

  const contactRows = useMemo(() => {
    if (activeFilter.kind === "role" && activeFilter.role) {
      return allContacts.filter((c) => c.roles.includes(activeFilter.role!));
    }
    return allContacts;
  }, [allContacts, activeFilter]);

  const registryRows = useMemo((): DirectoryListRow[] => {
    const toContactRow = (c: EcmContact): DirectoryListRow => ({
      id: c.id,
      kind: "contact",
      name: c.name,
      subtitle: c.mobilePrimary,
      status: c.status,
      ownerName: c.ownerName,
      score: c.contactScore,
      modifiedOn: c.modifiedOn,
    });
    const toCompanyRow = (c: EcmCompany): DirectoryListRow => ({
      id: c.id,
      kind: "company",
      name: c.companyName,
      subtitle:
        (c.industry ? getEcmMasterLabel("industry", c.industry) : null) ||
        c.pan ||
        "Company",
      status: c.status,
      ownerName: c.ownerName,
      score: c.companyScore,
      modifiedOn: c.modifiedOn,
    });

    if (activeFilter.kind === "companies") {
      return companyRows.map(toCompanyRow);
    }
    if (activeFilter.kind === "individuals" || activeFilter.kind === "role") {
      return contactRows.map(toContactRow);
    }
    return [...contactRows.map(toContactRow), ...companyRows.map(toCompanyRow)].sort((a, b) =>
      b.modifiedOn.localeCompare(a.modifiedOn),
    );
  }, [activeFilter.kind, contactRows, companyRows]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allContacts.length + companyRows.length,
      individuals: allContacts.length,
      companies: companyRows.length,
    };
    for (const f of filters) {
      if (f.kind === "role" && f.role) {
        counts[f.id] = allContacts.filter((c) => c.roles.includes(f.role!)).length;
      }
    }
    return counts;
  }, [filters, allContacts, companyRows]);

  const openCreate = () => {
    setCreationIntent(null);
    setIntentOpen(true);
  };

  const openCompany = (company: EcmCompany) => {
    setActiveCompany(company);
    setCompanyMode("edit");
    setCompanyInitialName(undefined);
    setLinkContactId(undefined);
    setCompanyOpen(true);
  };

  const openContact = (contact: EcmContact) => {
    setWorkspaceContact(contact);
    setWorkspaceMode("edit");
    setWorkspaceOpen(true);
  };

  const onIntentContinue = (result: ContactCreationIntentResult) => {
    setCreationIntent(result);
    setIntentOpen(false);

    if (result.kind === "company") {
      setActiveCompany(null);
      setCompanyMode("create");
      setCompanyInitialName(result.companyName);
      setLinkContactId(undefined);
      setCompanyOpen(true);
      return;
    }

    setWizardOpen(true);
  };

  const onWizardCreated = (contact: EcmContact) => {
    setWizardOpen(false);
    setWorkspaceContact(contact);
    setWorkspaceMode("edit");
    setWorkspaceOpen(true);
    refresh();

    if (creationIntent?.kind === "individual_company" && creationIntent.companyName) {
      setActiveCompany(null);
      setCompanyMode("create");
      setCompanyInitialName(creationIntent.companyName);
      setLinkContactId(contact.id);
      setCompanyOpen(true);
    }
    setCreationIntent(null);
  };

  const contactById = useMemo(() => {
    const map = new Map(allContacts.map((c) => [c.id, c]));
    return map;
  }, [allContacts]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        description="Enterprise Contact Registry — every person and company, once. Roles open workspace tabs."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openCreate} className="h-10 gap-2 rounded-xl px-4 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
            <Button asChild variant="outline" className="h-10 gap-2 rounded-xl px-4">
              <Link href={ROUTES.CONTACT_STRATEGY}>Contact Strategy</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 gap-2 rounded-xl px-4">
              <Link href={`${ROUTES.LOAN_FILES}?create=1`}>
                <Plus className="h-4 w-4" />
                Start Loan Journey
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterId(f.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
              filterId === f.id
                ? "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {f.label}
            <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
              {filterCounts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl border-border/70 bg-background pl-9"
          placeholder="Search Contacts — name, mobile, email, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Strategic Contact</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Modified</th>
              </tr>
            </thead>
            <tbody>
              {registryRows.map((row) => {
                const contact = row.kind === "contact" ? contactById.get(row.id) : undefined;
                return (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    className="cursor-pointer border-t border-border/70 transition-colors hover:bg-muted/30"
                    onClick={() => {
                      if (row.kind === "contact") {
                        const c = allContacts.find((x) => x.id === row.id);
                        if (c) openContact(c);
                      } else {
                        const c = companyRows.find((x) => x.id === row.id);
                        if (c) openCompany(c);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-500/5">
                          {row.kind === "company" ? (
                            <Building2 className="h-3.5 w-3.5 text-teal-700" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-teal-700" />
                          )}
                        </span>
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {row.kind === "company" ? "Company" : "Individual"}
                    </td>
                    <td className="px-4 py-3">
                      {contact ? (
                        <ContactRoleChips roles={contact.roles} className="max-w-[220px]" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.subtitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.ownerName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        variant={
                          row.status === "active" || row.status === "complete" || row.status === "verified"
                            ? "success"
                            : "muted"
                        }
                      >
                        {row.status}
                      </StatusPill>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact ? (
                        <Switch
                          checked={Boolean(contact.strategicContact)}
                          onCheckedChange={(checked) => {
                            try {
                              updateEcmContact(
                                contact.id,
                                { strategicContact: Boolean(checked) },
                                "ui",
                              );
                            } catch {
                              /* ignore */
                            }
                          }}
                          aria-label={`Strategic contact ${contact.name}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.score}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.modifiedOn)}</td>
                  </tr>
                );
              })}
              {registryRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No Contacts match this filter or search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        One registry · One Contact Workspace · Roles determine tabs — not the menu.
      </p>

      <ContactCreationIntentScreen
        open={intentOpen}
        firstName={user?.firstName?.trim() || "there"}
        onOpenChange={setIntentOpen}
        onContinue={onIntentContinue}
      />

      <QuickContactCreationWizard
        open={wizardOpen}
        actorId={user?.id ?? "ui"}
        ownerName={[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin"}
        creationIntent={creationIntent ?? undefined}
        initialName={
          creationIntent?.individualName ??
          (creationIntent?.kind === "individual" ? creationIntent.companyName : undefined)
        }
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open && creationIntent?.kind !== "individual_company") setCreationIntent(null);
        }}
        onCreated={onWizardCreated}
        onOpenExisting={(contact) => {
          setWizardOpen(false);
          openContact(contact);
        }}
      />

      <CompanyWorkspaceModal
        open={companyOpen}
        mode={companyMode}
        company={activeCompany}
        initialCompanyName={companyInitialName}
        actorId={user?.id ?? "ui"}
        ownerName={[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin"}
        linkContactId={linkContactId}
        onOpenChange={setCompanyOpen}
        onSaved={(company) => {
          setActiveCompany(company);
          setCompanyMode("edit");
          refresh();
        }}
      />

      <ContactWorkspaceModal
        open={workspaceOpen}
        mode={workspaceMode}
        contact={workspaceContact}
        actorId={user?.id ?? "ui"}
        initialTab="dashboard"
        onOpenChange={setWorkspaceOpen}
        onSaved={() => refresh()}
        onOpenExisting={(existing) => {
          openContact(existing);
          refresh();
        }}
      />
    </div>
  );
}

/**
 * Enterprise Contact Registry — single SSOT for people and companies.
 * @deprecated Alias — use ContactsWorkspace
 */
export function DirectoryWorkspace() {
  return <ContactsWorkspace />;
}

export function ContactsWorkspace() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Contacts…</div>}>
      <ContactsRegistryInner />
    </Suspense>
  );
}
