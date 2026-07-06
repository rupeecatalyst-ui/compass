"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { CustomerAuditTrail } from "@/components/catalyst-one/customers/customer-audit-trail";
import { CustomerDocumentsPanel } from "@/components/catalyst-one/customers/customer-documents-panel";
import { CustomerLoanPortfolio } from "@/components/catalyst-one/customers/customer-loan-portfolio";
import { CustomerNotesPanel } from "@/components/catalyst-one/customers/customer-notes-panel";
import { CustomerRelationshipSummary } from "@/components/catalyst-one/customers/customer-relationship-summary";
import { CustomerTasksPanel } from "@/components/catalyst-one/customers/customer-tasks-panel";
import { CustomerTimelineFeed } from "@/components/catalyst-one/customers/customer-timeline-feed";
import { CustomerWorkspaceStickyHeader } from "@/components/catalyst-one/customers/customer-workspace-sticky-header";
import { RelationshipIdentityPanel } from "@/components/catalyst-one/customers/relationship-identity-panel";
import { RelationshipPortfolioSection } from "@/components/catalyst-one/customers/relationship-portfolio-section";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { LoanWorkspaceModal } from "@/components/catalyst-one/shared/loan-workspace-modal";
import { WorkspaceHeader } from "@/components/catalyst-one/shared/workspace-header";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { LoanCreateFormDialog } from "@/components/catalyst-one/loan-files/loan-create-form-dialog";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROLES } from "@/constants/roles";
import { feedback } from "@/lib/action-feedback";
import { formatINR } from "@/lib/format-currency";
import {
  buildCustomerAuditTrail,
  computeRelationshipPortfolio,
  computePortfolioIntelligence,
  computeRelationshipSummary,
  deriveBusinessRoles,
  deriveHealthReasons,
  deriveOrganizationAffiliations,
  derivePersonalRelationships,
  deriveProductEngagementLines,
  getCustomerLoanFiles,
  mergeCustomerTimeline,
} from "@/lib/customer-utils";
import { createLoanFileFromInput } from "@/lib/loan-files-utils";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { saveCustomerWorkspaceContext } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CustomerProfile, LoanFile } from "@/types/catalyst-one";

export function Customer360Modal() {
  const {
    selectedCustomer,
    selectedCustomerId,
    closeCustomer,
    openContactFromWorkspace,
    customers,
    updateCustomer,
    loanFiles,
    refreshLoanFiles,
    workspaceTab,
    setWorkspaceTab,
    workspaceScrollRef,
    selectedLoanFileId,
    openLoanWorkspace,
    closeLoanWorkspace,
    completedProductFilter,
    setCompletedProductFilter,
  } = useCustomersContext();

  const { user } = useAuthContext();
  const isMasterAdmin = user?.role === ROLES.SUPER_ADMIN;

  const selectedLoan = useMemo(
    () => (selectedLoanFileId ? loanFiles.find((f) => f.id === selectedLoanFileId) ?? null : null),
    [loanFiles, selectedLoanFileId],
  );

  const contactOptions = useMemo(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
      })),
    [customers],
  );

  if (!selectedCustomer && !selectedLoanFileId) return null;

  if (!selectedCustomer) {
    return (
      <LoanWorkspaceModal
        file={selectedLoan}
        open={Boolean(selectedLoanFileId)}
        onOpenChange={(open) => !open && closeLoanWorkspace()}
        onOpenContact={openContactFromWorkspace}
        contactOptions={contactOptions}
        onUpdate={() => refreshLoanFiles()}
      />
    );
  }

  return (
    <Customer360ModalContent
      customer={selectedCustomer}
      loanFiles={loanFiles}
      selectedCustomerId={selectedCustomerId}
      selectedLoanFileId={selectedLoanFileId}
      selectedLoan={selectedLoan}
      closeCustomer={closeCustomer}
      closeLoanWorkspace={closeLoanWorkspace}
      openContactFromWorkspace={openContactFromWorkspace}
      contactOptions={contactOptions}
      refreshLoanFiles={refreshLoanFiles}
      openLoanWorkspace={openLoanWorkspace}
      workspaceTab={workspaceTab}
      setWorkspaceTab={setWorkspaceTab}
      workspaceScrollRef={workspaceScrollRef}
      completedProductFilter={completedProductFilter}
      setCompletedProductFilter={setCompletedProductFilter}
      updateCustomer={updateCustomer}
      isMasterAdmin={isMasterAdmin}
    />
  );
}

interface Customer360ModalContentProps {
  customer: CustomerProfile;
  loanFiles: LoanFile[];
  selectedCustomerId: string | null;
  selectedLoanFileId: string | null;
  selectedLoan: LoanFile | null;
  closeCustomer: () => void;
  closeLoanWorkspace: () => void;
  openContactFromWorkspace: (contactId: string) => void;
  contactOptions: { id: string; name: string }[];
  refreshLoanFiles: () => void;
  openLoanWorkspace: (fileId: string) => void;
  workspaceTab: string;
  setWorkspaceTab: (tab: string) => void;
  workspaceScrollRef: React.MutableRefObject<number>;
  completedProductFilter: string | null;
  setCompletedProductFilter: (product: string | null) => void;
  updateCustomer: (id: string, patch: Partial<CustomerProfile>) => void;
  isMasterAdmin: boolean;
}

function Customer360ModalContent({
  customer,
  loanFiles,
  selectedCustomerId,
  selectedLoanFileId,
  selectedLoan,
  closeCustomer,
  closeLoanWorkspace,
  openContactFromWorkspace,
  contactOptions,
  refreshLoanFiles,
  openLoanWorkspace,
  workspaceTab,
  setWorkspaceTab,
  workspaceScrollRef,
  completedProductFilter,
  setCompletedProductFilter,
  updateCustomer,
  isMasterAdmin,
}: Customer360ModalContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loanCreateOpen, setLoanCreateOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<"all" | "active" | "closed">("all");

  useEffect(() => {
    if (!selectedCustomerId || !scrollRef.current) return;
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = workspaceScrollRef.current;
    });
  }, [selectedCustomerId, workspaceScrollRef, workspaceTab, selectedLoanFileId]);

  const handleScroll = () => {
    if (scrollRef.current && selectedCustomerId) {
      workspaceScrollRef.current = scrollRef.current.scrollTop;
      saveCustomerWorkspaceContext(selectedCustomerId, {
        tab: workspaceTab,
        scrollTop: scrollRef.current.scrollTop,
        completedProductFilter,
      });
    }
  };

  const { active, completed } = getCustomerLoanFiles(customer.id, loanFiles);
  const allLoans = [...active, ...completed];
  const timeline = mergeCustomerTimeline(customer, loanFiles);
  const summary = computeRelationshipSummary(customer.id, loanFiles);
  const portfolio = computeRelationshipPortfolio(customer.id, loanFiles);
  const portfolioIntelligence = computePortfolioIntelligence(customer.id, loanFiles);
  const auditTrail = buildCustomerAuditTrail(customer, loanFiles);

  const portfolioLoans =
    portfolioFilter === "active"
      ? active
      : portfolioFilter === "closed"
        ? completedProductFilter
          ? completed.filter((f) => f.loanProduct === completedProductFilter)
          : completed
        : allLoans;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
      createdBy: customer.relationshipManager,
      pinned: false,
    };
    updateCustomer(customer.id, { notes: [note, ...customer.notes] });
    setNewNote("");
    feedback.noteSaved();
  };

  const hasUnsavedChanges = newNote.trim().length > 0;

  const closeApi = useWorkspaceClose({
    onClose: closeCustomer,
    hasUnsavedChanges,
    onSaveAndClose: async () => {
      if (newNote.trim()) handleAddNote();
    },
    enableEscapeKey: false,
  });

  const handleTogglePin = (noteId: string) => {
    updateCustomer(customer.id, {
      notes: customer.notes.map((n) =>
        n.id === noteId ? { ...n, pinned: !n.pinned } : n,
      ),
    });
  };

  const handleLoanCreated = (input: Parameters<typeof createLoanFileFromInput>[0]) => {
    const existing = loadLoanFiles();
    const file = createLoanFileFromInput(input, existing);
    saveLoanFiles([file, ...existing]);
    updateCustomer(customer.id, {
      timeline: [
        {
          id: `tl-loan-${file.id}`,
          title: "Loan file created",
          description: `${file.fileNumber} · ${file.loanProduct}`,
          timestamp: new Date().toISOString(),
          type: "stage_move",
          actor: customer.relationshipManager,
          loanFileId: file.id,
        },
        ...customer.timeline,
      ],
    });
    setLoanCreateOpen(false);
    refreshLoanFiles();
    feedback.loanCreated(file.fileNumber);
    setWorkspaceTab("portfolio");
  };

  const tabs = [
    "overview",
    "portfolio",
    "timeline",
    "tasks",
    "documents",
    "notes",
    "audit",
    "relationship",
    ...(isMasterAdmin ? ["rc-revenue"] : []),
  ];

  return (
    <>
      <Dialog
        open={Boolean(selectedCustomerId) && !selectedLoanFileId}
        onOpenChange={(open) => {
          if (open) return;
          closeApi.requestClose();
        }}
      >
        <DialogContent className="flex h-[85vh] max-h-[85vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden rounded-xl p-0 [&>button]:hidden">
          <WorkspaceHeader
            title="Customer 360"
            onClose={closeCustomer}
            closeApi={closeApi}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveAndClose={async () => {
              if (newNote.trim()) handleAddNote();
            }}
          />
          <CustomerWorkspaceStickyHeader
            customer={customer}
            onAddLoan={() => setLoanCreateOpen(true)}
            onAddTask={() => setWorkspaceTab("tasks")}
            onUploadDocument={() => setWorkspaceTab("documents")}
          />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-background"
          >
            <div className="px-6 py-4 space-y-4">
              <CustomerRelationshipSummary summary={summary} onNavigate={setWorkspaceTab} />

              <Tabs value={workspaceTab} onValueChange={setWorkspaceTab}>
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted p-1 sticky top-0 z-10">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-xs capitalize flex-1 min-w-[72px]"
                    >
                      {tab === "rc-revenue" ? "RC Revenue" : tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-6">
                  <RelationshipPortfolioSection
                    data={portfolio}
                    intelligence={portfolioIntelligence}
                    onProductClick={(product) => {
                      setCompletedProductFilter(product);
                      setPortfolioFilter("closed");
                      setWorkspaceTab("portfolio");
                    }}
                  />
                  <CustomerLoanPortfolio
                    loans={active.slice(0, 3)}
                    title="Active Loans"
                    emptyLabel="No active loans."
                    onOpenLoan={openLoanWorkspace}
                  />
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Recent Activity</h4>
                      <Button
                        variant="link"
                        className="text-xs h-auto p-0"
                        onClick={() => setWorkspaceTab("timeline")}
                      >
                        View all →
                      </Button>
                    </div>
                    <CustomerTimelineFeed
                      events={timeline}
                      onOpenLoan={openLoanWorkspace}
                      limit={5}
                    />
                  </section>
                </TabsContent>

                <TabsContent value="portfolio" className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(["all", "active", "closed"] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={portfolioFilter === f ? "default" : "outline"}
                        className="h-7 text-xs capitalize"
                        onClick={() => {
                          setPortfolioFilter(f);
                          if (f !== "closed") setCompletedProductFilter(null);
                        }}
                      >
                        {f === "all" ? "All Loans" : f === "active" ? "Active" : "Closed"}
                      </Button>
                    ))}
                    {completedProductFilter && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => setCompletedProductFilter(null)}
                      >
                        Clear filter: {completedProductFilter}
                      </Button>
                    )}
                  </div>
                  <CustomerLoanPortfolio
                    loans={portfolioLoans}
                    title={
                      portfolioFilter === "active"
                        ? "Active Loans"
                        : portfolioFilter === "closed"
                          ? "Closed Loans"
                          : "All Loans"
                    }
                    emptyLabel="No loans match this filter."
                    onOpenLoan={openLoanWorkspace}
                  />
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <CustomerTimelineFeed events={timeline} onOpenLoan={openLoanWorkspace} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <CustomerTasksPanel
                    customer={customer}
                    loanFiles={loanFiles}
                    onOpenLoan={openLoanWorkspace}
                  />
                </TabsContent>

                <TabsContent value="documents" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => feedback.documentUploaded()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Upload Document
                    </Button>
                  </div>
                  <CustomerDocumentsPanel customer={customer} />
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <CustomerNotesPanel
                    customer={customer}
                    newNote={newNote}
                    onNewNoteChange={setNewNote}
                    onSaveNote={handleAddNote}
                    onTogglePin={handleTogglePin}
                  />
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                  <CustomerAuditTrail entries={auditTrail} onOpenLoan={openLoanWorkspace} />
                </TabsContent>

                <TabsContent value="relationship" className="mt-4">
                  <RelationshipIdentityPanel
                    customer={customer}
                    businessRoles={deriveBusinessRoles(customer, loanFiles)}
                    organizationAffiliations={deriveOrganizationAffiliations(customer)}
                    personalRelationships={derivePersonalRelationships(customer)}
                    productLines={deriveProductEngagementLines(customer.id, loanFiles)}
                    healthReasons={deriveHealthReasons(customer, loanFiles)}
                    onOpenContact={openContactFromWorkspace}
                  />
                </TabsContent>

                {isMasterAdmin && (
                  <TabsContent value="rc-revenue" className="mt-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Rupee Catalyst earnings — Master Admin only.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <FinancialCard label="Revenue Generated" value={formatINR(summary.receivedRevenue)} accent />
                      <FinancialCard label="Expected Revenue" value={formatINR(summary.expectedRevenue)} />
                      <FinancialCard label="Outstanding" value={formatINR(summary.outstandingRevenue)} />
                      <FinancialCard
                        label="Profitability"
                        value={`${summary.expectedRevenue > 0 ? Math.round((summary.receivedRevenue / summary.expectedRevenue) * 100) : 0}%`}
                        accent
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LoanWorkspaceModal
        file={selectedLoan}
        open={Boolean(selectedLoanFileId)}
        onOpenChange={(open) => !open && closeLoanWorkspace()}
        onOpenContact={openContactFromWorkspace}
        contactOptions={contactOptions}
        onUpdate={() => refreshLoanFiles()}
      />

      <LoanCreateFormDialog
        open={loanCreateOpen}
        onOpenChange={setLoanCreateOpen}
        title="Add Loan for Customer"
        description={`Create a new loan file for ${customer.name}`}
        prefillCustomer={{
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email ?? "",
          city: customer.city,
          state: customer.state ?? "",
          employmentType: customer.employmentType ?? "Salaried",
        }}
        onSubmit={handleLoanCreated}
      />
    </>
  );
}

function FinancialCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold mt-1 tabular-nums", accent && "text-success")}>
        {value}
      </p>
    </div>
  );
}
