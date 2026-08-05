"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { CompanyWorkspaceModal } from "@/components/catalyst-one/companies/company-workspace-modal";
import { ContactRegistryTable } from "@/components/catalyst-one/directory/contact-registry-table";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ENTERPRISE_REGISTRY_ACTION_BTN_CLASS } from "@/constants/enterprise-registry-workspace";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { cn } from "@/lib/utils";
import {
  listEcmContacts,
  queryEcmContacts,
} from "@/lib/enterprise-contact-master";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  listEcmCompanies,
  seedEcmCompaniesIfEmpty,
} from "@/lib/enterprise-company-master";
import { seedEcmContactsDemoIfEmpty } from "@/lib/demo-seed";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { hydrateEcmFromPrisma } from "@/lib/enterprise-persistence";
import type { EcmCompany } from "@/types/enterprise-company-master";
import type { EcmContact } from "@/types/enterprise-contact-master";

function ContactsRegistryInner() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [tick, setTick] = useState(0);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const registryVersion = useEcmContactRegistryVersion();

  const [intentOpen, setIntentOpen] = useState(false);
  const [creationIntent, setCreationIntent] = useState<ContactCreationIntentResult | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyMode, setCompanyMode] = useState<"create" | "edit">("create");
  const [activeCompany, setActiveCompany] = useState<EcmCompany | null>(null);
  const [companyInitialName, setCompanyInitialName] = useState<string | undefined>();
  const [linkContactId, setLinkContactId] = useState<string | undefined>();
  const [registryHighlight, setRegistryHighlight] = useState<string | undefined>();

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "edit">("edit");
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (isEnterprisePersistencePrisma()) {
        setHydrating(true);
        setHydrateError(null);
        try {
          await hydrateEcmFromPrisma();
          if (!cancelled) refresh();
        } catch (err) {
          if (!cancelled) {
            setHydrateError(err instanceof Error ? err.message : "Failed to load registry from database");
          }
        } finally {
          if (!cancelled) setHydrating(false);
        }
      } else {
        seedEcmCompaniesIfEmpty();
        seedEcmContactsDemoIfEmpty();
        refresh();
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const reloadFromDatabase = useCallback(async () => {
    if (!isEnterprisePersistencePrisma()) {
      refresh();
      return;
    }
    setHydrating(true);
    setHydrateError(null);
    try {
      await hydrateEcmFromPrisma();
      refresh();
    } catch (err) {
      setHydrateError(err instanceof Error ? err.message : "Reload failed");
    } finally {
      setHydrating(false);
    }
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

  const contacts = useMemo(() => {
    void tick;
    void registryVersion;
    return queryEcmContacts({
      page: 1,
      pageSize: 500,
      sortBy: "createdOn",
      sortDir: "desc",
    }).items.filter((c) => c.status !== "archived");
  }, [tick, registryVersion]);

  const companies = useMemo(() => {
    void tick;
    return listEcmCompanies().filter((c) => c.status !== "archived");
  }, [tick]);

  const openCreate = () => {
    setCreationIntent(null);
    setIntentOpen(true);
  };

  const openContact = (contact: EcmContact) => {
    setWorkspaceContact(contact);
    setWorkspaceMode("edit");
    setWorkspaceOpen(true);
  };

  const openCompany = (company: EcmCompany) => {
    setActiveCompany(company);
    setCompanyMode("edit");
    setCompanyInitialName(undefined);
    setLinkContactId(undefined);
    setCompanyOpen(true);
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

    if (creationIntent?.kind === "company" && creationIntent.companyName) {
      setActiveCompany(null);
      setCompanyMode("create");
      setCompanyInitialName(creationIntent.companyName);
      setLinkContactId(undefined);
      setCompanyOpen(true);
      setCreationIntent(null);
      return;
    }

    setCreationIntent(null);
  };

  return (
    <>
      <EnterpriseRegistryWorkspaceShell
        title="Contacts"
        subtitle="Individuals and companies"
        count={contacts.length + companies.length}
        countNoun="Contacts"
        breadcrumbs={buildSimpleWorkspaceBreadcrumbs("Contacts")}
        data-surface="contacts-workspace"
        data-sprint="BAT-016"
        actions={
          <>
            {isEnterprisePersistencePrisma() ? (
              <Button
                type="button"
                variant="outline"
                className={ENTERPRISE_REGISTRY_ACTION_BTN_CLASS}
                disabled={hydrating}
                onClick={() => void reloadFromDatabase()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", hydrating && "animate-spin")} />
                {hydrating ? "Loading…" : "Reload"}
              </Button>
            ) : null}
            <Button type="button" onClick={openCreate} className={ENTERPRISE_REGISTRY_ACTION_BTN_CLASS}>
              <Plus className="h-3.5 w-3.5" />
              Add Contact
            </Button>
            <Button asChild variant="outline" className={ENTERPRISE_REGISTRY_ACTION_BTN_CLASS}>
              <Link href={ROUTES.CONTACT_STRATEGY}>Contact Strategy</Link>
            </Button>
          </>
        }
        banner={
          hydrateError ? (
            <div className="shrink-0 border border-destructive/40 bg-destructive/5 px-2.5 py-1 text-[11px] text-destructive">
              {hydrateError}
            </div>
          ) : null
        }
      >
        <ContactRegistryTable
          contacts={contacts}
          companies={companies}
          onOpenContact={openContact}
          onOpenCompany={openCompany}
          onRegistryChanged={refresh}
          highlightSearch={registryHighlight}
          onHighlightApplied={() => setRegistryHighlight(undefined)}
        />
      </EnterpriseRegistryWorkspaceShell>

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
          if (!open) setCreationIntent(null);
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
        onCompleted={(company) => {
          setCompanyOpen(false);
          setActiveCompany(null);
          setCompanyInitialName(undefined);
          setLinkContactId(undefined);
          setRegistryHighlight(company.companyName);
          refresh();
        }}
        onDeleted={async () => {
          setCompanyOpen(false);
          setActiveCompany(null);
          if (isEnterprisePersistencePrisma()) {
            await reloadFromDatabase();
          } else {
            refresh();
          }
        }}
      />

      <ContactWorkspaceModal
        open={workspaceOpen}
        mode={workspaceMode}
        contact={workspaceContact}
        actorId={user?.id ?? "ui"}
        initialTab="overview"
        onOpenChange={setWorkspaceOpen}
        onSaved={() => refresh()}
        onOpenExisting={(existing) => {
          openContact(existing);
          refresh();
        }}
        onDeleted={async () => {
          setWorkspaceOpen(false);
          setWorkspaceContact(null);
          if (isEnterprisePersistencePrisma()) {
            await reloadFromDatabase();
          } else {
            refresh();
          }
        }}
      />
    </>
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
