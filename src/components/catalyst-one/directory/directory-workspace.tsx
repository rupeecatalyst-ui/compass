"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  ContactCreationIntentScreen,
  type ContactCreationIntentResult,
} from "@/components/catalyst-one/contacts/contact-creation-intent-screen";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import { QuickContactCreationWizard } from "@/components/catalyst-one/contacts/quick-contact-creation-wizard";
import { CompanyWorkspaceModal } from "@/components/catalyst-one/companies/company-workspace-modal";
import { ContactRegistryTable } from "@/components/catalyst-one/directory/contact-registry-table";
import { PageHeader } from "@/components/design-system/page-header";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  listEcmContacts,
  queryEcmContacts,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  listEcmCompanies,
  seedEcmCompaniesIfEmpty,
} from "@/lib/enterprise-company-master";
import type { EcmCompany } from "@/types/enterprise-company-master";
import type { EcmContact } from "@/types/enterprise-contact-master";

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

function ContactsRegistryInner() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
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

  const contacts = useMemo(() => {
    void tick;
    void registryVersion;
    return queryEcmContacts({
      page: 1,
      pageSize: 500,
      sortBy: "modifiedOn",
      sortDir: "desc",
    }).items.filter((c) => c.status !== "archived");
  }, [tick, registryVersion]);

  const openCreate = () => {
    setCreationIntent(null);
    setIntentOpen(true);
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

  return (
    <div className="space-y-3">
      <PageHeader
        title="Contacts"
        description="Enterprise Contact Registry — locate, compare, and manage contacts in a dense operational table."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" onClick={openCreate} className="h-8 gap-1.5 rounded-md px-3 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Contact
            </Button>
            <Button asChild variant="outline" className="h-8 rounded-md px-3 text-xs">
              <Link href={ROUTES.CONTACT_STRATEGY}>Contact Strategy</Link>
            </Button>
            <Button asChild variant="outline" className="h-8 gap-1.5 rounded-md px-3 text-xs">
              <Link href={`${ROUTES.LOAN_FILES}?create=1`}>
                <Plus className="h-3.5 w-3.5" />
                Start Loan Journey
              </Link>
            </Button>
          </div>
        }
      />

      <ContactRegistryTable
        contacts={contacts}
        onOpenContact={openContact}
        onRegistryChanged={refresh}
      />

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
