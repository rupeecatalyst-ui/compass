"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EOLE_BUSINESS_MODELS } from "@/constants/enterprise-opportunity-lifecycle-engine";
import {
  createEoleOpportunityFromLead,
  getEolePorts,
  initializeEoleAgingPolicies,
  initializeEoleStages,
  initializeEoleSubStages,
  registerEoleCustomerReference,
  registerEoleFinancialRequirement,
  registerEoleProductReference,
  transitionEoleOpportunityLifecycle,
} from "@/lib/enterprise-opportunity-lifecycle-engine";
import { listEcmContacts, registerEcmContact } from "@/lib/enterprise-contact-master";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  completeEteTask,
  deriveEteTaskColour,
  listEteTasks,
  reopenEteTask,
} from "@/lib/enterprise-task-engine";
import {
  deriveChanakyaAdvisory,
  getWorkspacePlaceholderStatus,
  placeholderDeleteDocument,
  placeholderReplaceDocument,
  placeholderSetQuickIntent,
  placeholderUploadDocument,
  syncWorkflowBlockers,
  type ChanakyaAdvisoryState,
  type WorkspaceQuickIntent,
} from "./providers/workspace-placeholder-provider";
import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import {
  buildOpportunityIntelligenceSnapshot,
  deriveActivitySignals,
  publishIntelligenceDialogueEvents,
  type PreviousIntelligenceState,
} from "@/lib/enterprise-opportunity-intelligence";
import {
  getEwoeIntelligenceProgress,
  initializeEwoeDefaultDefinitions,
  startEwoeWorkflowInstance,
} from "@/lib/enterprise-workflow-orchestration-engine";
import { resolveEcwSelectedLender } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import type { EoleOpportunity } from "@/types/enterprise-opportunity-lifecycle-engine";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { OpportunityIntelligenceSnapshot } from "@/types/enterprise-opportunity-intelligence";
import type { LoanFile } from "@/types/catalyst-one";
import { isDemoSeedEnabled } from "@/lib/demo-seed";

export type WorkspaceFocus =
  | "overview"
  | "life"
  | "documents"
  | "tasks"
  | "dialogue"
  | "timeline"
  | "stage"
  | "insights"
  | "workflow";

export interface DocumentWorkspaceStats {
  requiredCount: number;
  uploadedCount: number;
  verifiedCount: number;
  pendingCount: number;
  completionPct: number;
  requiredDocs: string[];
  uploaded: Set<string>;
  verified: Set<string>;
  pendingDocs: string[];
}

export interface SelectedLenderSummary {
  lenderName: string;
  executorName: string;
  branchName?: string;
  reportingManagerName?: string;
  recommended?: boolean;
  successProbability?: number;
  productRefs?: string[];
  businessMappingRefs?: string[];
  productCompatible?: boolean;
  eligibility?: "eligible" | "review" | "ineligible";
  eligibilityNote?: string;
}

export interface OpportunityWorkspaceState {
  /** True after initial in-memory bootstrap attempt (demo seed or empty). */
  workspaceReady: boolean;
  leadCaseFile: LoanFile | null;
  opportunityId: string;
  contactId: string;
  opportunity: EoleOpportunity | null;
  contact: EcmContact | null;
  stageCode: string;
  progressRatio: number;
  overdueTaskCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  completedTaskIds: Set<string>;
  documentStats: DocumentWorkspaceStats;
  intelligence: OpportunityIntelligenceSnapshot | null;
  chanakyaAdvisory: ChanakyaAdvisoryState | null;
  /** Presentation-only lender selection for header / LIFE card. */
  selectedLender: SelectedLenderSummary | null;
  productLabel: string;
  loanAmountLabel: string;
  focus: WorkspaceFocus;
  refreshKey: number;
  setFocus: (focus: WorkspaceFocus) => void;
  activateQuickAction: (focus: WorkspaceFocus) => void;
  setSelectedLender: (lender: SelectedLenderSummary | null) => void;
  refresh: () => void;
  changeStage: (action: string, stageCode?: string) => void;
  markTaskCompleted: (taskId: string) => void;
  markTaskReopened: (taskId: string) => void;
  markDocumentUploaded: (docRef: string) => void;
  markDocumentVerified: (docRef: string) => void;
  markDocumentReplaced: (docRef: string) => void;
  markDocumentDeleted: (docRef: string) => void;
  lastPlaceholderStatus: string | null;
}

interface OpportunityWorkspaceProviderProps {
  children: ReactNode;
  fileId?: string | null;
  opportunityId?: string | null;
}

const OpportunityWorkspaceContext = createContext<OpportunityWorkspaceState | null>(null);

const DEMO_OPPORTUNITY_CODE = "OPP-WS-001";
const DEMO_CONTACT_MOBILE = "+91-9876543210";

function seedDocumentRulesIfEmpty() {
  if (!isDemoSeedEnabled()) return;
  if (listEdieDocumentRules().length > 0) return;
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-PROC-001",
    ruleName: "Home loan salaried · processing",
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "processing",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:salary-slip", "doc:bank-statement"],
    uploadMethod: "both",
    enabled: true,
    createdBy: "system",
  });
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-DOC-001",
    ruleName: "Home loan salaried · document collection",
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "document_collection",
    documentTypeRefs: ["doc:pan", "doc:aadhaar", "doc:photo"],
    uploadMethod: "individual",
    enabled: true,
    createdBy: "system",
  });
}

function ensureWorkspaceSeed(): { opportunityId: string; contactId: string } {
  initializeEoleStages();
  initializeEoleSubStages();
  initializeEoleAgingPolicies();

  if (!isDemoSeedEnabled()) {
    return { opportunityId: "", contactId: "" };
  }

  seedDocumentRulesIfEmpty();

  let contact = listEcmContacts().find((c) => c.mobilePrimary === DEMO_CONTACT_MOBILE);
  if (!contact) {
    contact = registerEcmContact({
      name: "Priya Sharma",
      mobilePrimary: DEMO_CONTACT_MOBILE,
      mobileSecondary: "+91-9876543211",
      personalEmail: "priya.sharma@example.com",
      roles: ["customer"],
      primaryRole: "customer",
      additionalRoles: [],
      createdBy: "system",
    });
  }

  const ports = getEolePorts();
  let opportunity = ports.opportunities.findByCode(DEMO_OPPORTUNITY_CODE);
  if (!opportunity) {
    const financialReq = registerEoleFinancialRequirement({
      opportunityId: "pending",
      requirementCode: "FR-WS-001",
      amount: 4500000,
      currencyCode: "INR",
      purpose: "Home purchase",
      fulfillmentModel: EOLE_BUSINESS_MODELS.SECURED_LENDING,
      createdBy: "system",
    });

    opportunity = createEoleOpportunityFromLead({
      opportunityCode: DEMO_OPPORTUNITY_CODE,
      customerRef: `ecm:contact:${contact.id}`,
      productRef: "product:home-loan",
      financialRequirementId: financialReq.id,
      strategy: EOLE_BUSINESS_MODELS.SECURED_LENDING,
      minimumDocumentsSubmitted: true,
      createdBy: "system",
    });

    ports.financialRequirements.save({
      ...financialReq,
      opportunityId: opportunity.id,
    });

    registerEoleCustomerReference({
      opportunityId: opportunity.id,
      customerRef: `ecm:contact:${contact.id}`,
      createdBy: "system",
    });
    registerEoleProductReference({
      opportunityId: opportunity.id,
      productRef: "product:home-loan",
      createdBy: "system",
    });

    transitionEoleOpportunityLifecycle({
      opportunityId: opportunity.id,
      action: "submit_documents",
      actorId: "system",
      stageCode: "document_collection",
    });
    transitionEoleOpportunityLifecycle({
      opportunityId: opportunity.id,
      action: "begin_processing",
      actorId: "system",
      stageCode: "processing",
    });
  }

  return { opportunityId: opportunity.id, contactId: contact.id };
}

function resolveRequiredDocs(): string[] {
  const processing = resolveEdieDocumentRulesForContext({
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "processing",
  });
  const collection = resolveEdieDocumentRulesForContext({
    productRef: "product:home-loan",
    employmentType: "salaried",
    loanStage: "document_collection",
  });
  const refs = new Set<string>();
  for (const rule of [...processing, ...collection]) {
    for (const ref of rule.documentTypeRefs) refs.add(ref);
  }
  return [...refs];
}

export function OpportunityWorkspaceProvider({
  children,
  fileId,
  opportunityId: initialOpportunityId,
}: OpportunityWorkspaceProviderProps) {
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [opportunityId, setOpportunityId] = useState("");
  const [contactId, setContactId] = useState("");
  const [leadCaseFileId, setLeadCaseFileId] = useState("");
  const [focus, setFocus] = useState<WorkspaceFocus>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loanFilesVersion, setLoanFilesVersion] = useState(0);
  const registryVersion = useEcmContactRegistryVersion();
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [verifiedDocs, setVerifiedDocs] = useState<Set<string>>(new Set());
  const [intelligence, setIntelligence] = useState<OpportunityIntelligenceSnapshot | null>(null);
  const [selectedLender, setSelectedLender] = useState<SelectedLenderSummary | null>(null);
  const previousIntelRef = useRef<PreviousIntelligenceState>({});

  useEffect(() => subscribeLoanFilesUpdated(() => setLoanFilesVersion((v) => v + 1)), []);

  useEffect(() => {
    if (fileId) {
      setLeadCaseFileId(fileId);
      setOpportunityId(initialOpportunityId ?? "");
      const leadCase = loadLoanFiles().find((f) => f.id === fileId) ?? null;
      setContactId(leadCase?.customerId ?? "");
      if (leadCase) {
        const lender = resolveEcwSelectedLender(leadCase);
        setSelectedLender(
          lender.enabled
            ? {
                lenderName: lender.lenderName,
                executorName: lender.contactName,
                reportingManagerName: leadCase.relationshipManager,
              }
            : null,
        );
      } else {
        setSelectedLender(null);
      }
      setWorkspaceReady(true);
      return;
    }

    const seeded = ensureWorkspaceSeed();
    setOpportunityId(initialOpportunityId ?? seeded.opportunityId);
    setContactId(seeded.contactId);
    setLeadCaseFileId("");
    if (seeded.opportunityId) {
      initializeEwoeDefaultDefinitions("workspace");
      startEwoeWorkflowInstance({
        opportunityId: seeded.opportunityId,
        stageCode: "processing",
        actorId: "workspace",
      });
    }
    setWorkspaceReady(true);
  }, [fileId, initialOpportunityId]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const leadCaseFile = useMemo(() => {
    if (!leadCaseFileId) return null;
    void loanFilesVersion;
    return loadLoanFiles().find((f) => f.id === leadCaseFileId && !f.archived) ?? null;
  }, [leadCaseFileId, loanFilesVersion, refreshKey]);

  const opportunity = useMemo(() => {
    if (!opportunityId) return null;
    return getEolePorts().opportunities.findById(opportunityId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const contact = useMemo(() => {
    const resolvedContactId = contactId || leadCaseFile?.customerId || "";
    if (!resolvedContactId) return null;
    return listEcmContacts().find((c) => c.id === resolvedContactId) ?? null;
  }, [contactId, leadCaseFile?.customerId, refreshKey, registryVersion]);

  const progressRatio = useMemo(() => {
    if (!opportunityId && leadCaseFile) {
      return Math.max(0.11, Math.min(1, (leadCaseFile.progress || 11) / 100));
    }
    const ewoeProgress =
      opportunityId && getEwoeIntelligenceProgress(opportunityId);
    if (typeof ewoeProgress === "number") return ewoeProgress;

    const stageOrder = [
      "intake",
      "document_collection",
      "processing",
      "lender_review",
      "approved",
      "disbursement",
      "closed",
    ];
    const idx = stageOrder.indexOf(opportunity?.stageCode ?? "intake");
    return Math.max(0.15, (idx + 1) / stageOrder.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadCaseFile, opportunity?.stageCode, opportunityId, refreshKey]);

  const taskMetrics = useMemo(() => {
    if (!opportunityId && leadCaseFile) {
      const tasks = leadCaseFile.tasks ?? [];
      const overdue = tasks.filter((t) => !t.completed && new Date(t.dueDate).getTime() < Date.now()).length;
      const completed = tasks.filter((t) => t.completed).length;
      return { overdue, open: Math.max(0, tasks.length - overdue - completed), completed };
    }
    if (!opportunityId) return { overdue: 0, open: 0, completed: 0 };
    const now = Date.now();
    const tasks = listEteTasks().filter((t) => t.opportunityRef === opportunityId);
    let overdue = 0;
    let open = 0;
    let completed = 0;
    for (const t of tasks) {
      if (completedTaskIds.has(t.id) || !t.enabled) {
        completed += 1;
        continue;
      }
      const colour = deriveEteTaskColour(t.dueOn, new Date(now));
      if (t.escalated || colour === "red" || (t.dueOn && new Date(t.dueOn).getTime() < now)) {
        overdue += 1;
      } else {
        open += 1;
      }
    }
    return { overdue, open, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadCaseFile, opportunityId, refreshKey, completedTaskIds]);

  const requiredDocs = useMemo(() => resolveRequiredDocs(), []);

  const documentStats: DocumentWorkspaceStats = useMemo(() => {
    if (!opportunityId && leadCaseFile) {
      const requiredDocs = (leadCaseFile.documents ?? []).map((d) => d.name);
      const uploaded = new Set(
        (leadCaseFile.documents ?? [])
          .filter((d) => d.status !== "pending")
          .map((d) => d.name),
      );
      const verified = new Set(
        (leadCaseFile.documents ?? [])
          .filter((d) => d.status === "verified")
          .map((d) => d.name),
      );
      const pendingDocs = requiredDocs.filter((d) => !uploaded.has(d) && !verified.has(d));
      const completionPct =
        requiredDocs.length === 0 ? 0 : Math.round((verified.size / requiredDocs.length) * 100);
      return {
        requiredCount: requiredDocs.length,
        uploadedCount: uploaded.size,
        verifiedCount: verified.size,
        pendingCount: pendingDocs.length,
        completionPct,
        requiredDocs,
        uploaded,
        verified,
        pendingDocs,
      };
    }
    const pendingDocs = requiredDocs.filter((d) => !uploadedDocs.has(d) && !verifiedDocs.has(d));
    const completionPct =
      requiredDocs.length === 0
        ? 0
        : Math.round((verifiedDocs.size / requiredDocs.length) * 100);
    return {
      requiredCount: requiredDocs.length,
      uploadedCount: uploadedDocs.size,
      verifiedCount: verifiedDocs.size,
      pendingCount: pendingDocs.length,
      completionPct,
      requiredDocs,
      uploaded: uploadedDocs,
      verified: verifiedDocs,
      pendingDocs,
    };
  }, [leadCaseFile, opportunityId, requiredDocs, uploadedDocs, verifiedDocs]);

  const chanakyaAdvisory = useMemo(() => {
    if (!opportunityId) return null;
    return deriveChanakyaAdvisory({
      opportunityId,
      docCompletionPct: documentStats.completionPct,
      hasLender: Boolean(selectedLender),
      lenderName: selectedLender?.lenderName,
      overdueTaskCount: taskMetrics.overdue,
      stageCode: opportunity?.stageCode ?? "intake",
      lastAction: getWorkspacePlaceholderStatus(opportunityId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opportunityId,
    documentStats.completionPct,
    selectedLender,
    taskMetrics.overdue,
    opportunity?.stageCode,
    refreshKey,
  ]);

  useEffect(() => {
    if (!opportunityId) return;
    syncWorkflowBlockers(opportunityId, {
      pendingDocs: documentStats.pendingDocs,
      hasLender: Boolean(selectedLender),
      overdueTaskCount: taskMetrics.overdue,
    });
  }, [
    opportunityId,
    documentStats.pendingDocs,
    selectedLender,
    taskMetrics.overdue,
    refreshKey,
  ]);

  useEffect(() => {
    if (!opportunityId || !opportunity) return;

    const activity = deriveActivitySignals(opportunityId);
    const ageMs = Date.now() - new Date(opportunity.createdOn).getTime();
    const opportunityAgeDays = Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000)));

    const snapshot = buildOpportunityIntelligenceSnapshot({
      opportunityId,
      stageProgressRatio: progressRatio,
      documentRequiredCount: documentStats.requiredCount,
      documentUploadedCount: documentStats.uploadedCount,
      documentVerifiedCount: documentStats.verifiedCount,
      openTaskCount: taskMetrics.open,
      overdueTaskCount: taskMetrics.overdue,
      completedTaskCount: taskMetrics.completed,
      daysSinceLastActivity: activity.daysSinceLastActivity,
      communicationEventCount: activity.communicationEventCount,
      opportunityAgeDays,
      assignedRmLabel: "RM-001",
      lastActivityOn: activity.lastActivityOn,
    });

    previousIntelRef.current = publishIntelligenceDialogueEvents(snapshot, previousIntelRef.current);
    setIntelligence(snapshot);
  }, [
    opportunityId,
    opportunity,
    progressRatio,
    documentStats.requiredCount,
    documentStats.uploadedCount,
    documentStats.verifiedCount,
    taskMetrics.open,
    taskMetrics.overdue,
    taskMetrics.completed,
    refreshKey,
    selectedLender,
  ]);

  useEffect(() => {
    if (opportunityId || !leadCaseFile) return;
    const lender = resolveEcwSelectedLender(leadCaseFile);
    setSelectedLender(
      lender.enabled
        ? {
            lenderName: lender.lenderName,
            executorName: lender.contactName,
            reportingManagerName: leadCaseFile.relationshipManager,
          }
        : null,
    );
  }, [leadCaseFile, opportunityId]);

  const productLabel = useMemo(() => {
    if (!opportunityId && leadCaseFile) return leadCaseFile.loanProduct;
    const ref = opportunity?.productRef ?? "product:home-loan";
    return ref.replace(/^product:/, "").replace(/-/g, " ");
  }, [leadCaseFile, opportunity?.productRef, opportunityId]);

  const loanAmountLabel = useMemo(() => {
    if (!opportunityId && leadCaseFile) {
      return formatINR(leadCaseFile.requiredAmount || leadCaseFile.loanAmount);
    }
    if (!opportunityId) return "—";
    const reqs = getEolePorts().financialRequirements.listByOpportunity(opportunityId);
    const amount = reqs[0]?.amount;
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: reqs[0]?.currencyCode ?? "INR",
      maximumFractionDigits: 0,
    }).format(amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadCaseFile, opportunityId, refreshKey]);

  const changeStage = useCallback(
    (action: string, stageCode?: string) => {
      if (!opportunityId) return;
      transitionEoleOpportunityLifecycle({
        opportunityId,
        action,
        actorId: "workspace",
        stageCode,
      });
      appendEdcTimelineEntry({
        contextRef: { type: "opportunity", id: opportunityId },
        eventType: "stage_change",
        title: stageCode ? `Stage → ${stageCode}` : `Lifecycle · ${action}`,
        description: `Stage change via workspace (${action})`,
        actorId: "workspace",
        expandablePayload: { action, stageCode, source: "opportunity-workspace-stage" },
      });
      refresh();
    },
    [opportunityId, refresh],
  );

  const markTaskCompleted = useCallback(
    (taskId: string) => {
      try {
        completeEteTask(taskId, "workspace");
      } catch {
        // Registry miss — still mark local complete for UI.
      }
      setCompletedTaskIds((prev) => new Set(prev).add(taskId));
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "task",
          title: "Task completed",
          description: `Task ${taskId} marked complete in workspace`,
          actorId: "workspace",
          expandablePayload: { taskId, source: "opportunity-workspace-tasks" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const markTaskReopened = useCallback(
    (taskId: string) => {
      try {
        reopenEteTask(taskId, "workspace");
      } catch {
        // Registry miss — still reopen locally.
      }
      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "task",
          title: "Task reopened",
          description: `Task ${taskId} reopened in workspace`,
          actorId: "workspace",
          expandablePayload: { taskId, source: "opportunity-workspace-tasks" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const markDocumentUploaded = useCallback(
    (docRef: string) => {
      if (opportunityId) placeholderUploadDocument(opportunityId, docRef);
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "document_upload",
          title: "Document uploaded",
          description: `${docRef} uploaded — customer summary & completion updated`,
          actorId: "workspace",
          expandablePayload: { docRef, source: "opportunity-workspace-documents" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const markDocumentVerified = useCallback(
    (docRef: string) => {
      setVerifiedDocs((prev) => new Set(prev).add(docRef));
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "document_verification",
          title: "Document verified",
          description: `${docRef} verified`,
          actorId: "workspace",
          expandablePayload: { docRef, source: "opportunity-workspace-documents" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const markDocumentReplaced = useCallback(
    (docRef: string) => {
      if (opportunityId) placeholderReplaceDocument(opportunityId, docRef);
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      setVerifiedDocs((prev) => {
        const next = new Set(prev);
        next.delete(docRef);
        return next;
      });
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "document_upload",
          title: "Document replaced",
          description: `${docRef} replaced`,
          actorId: "workspace",
          expandablePayload: { docRef, source: "opportunity-workspace-documents" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const markDocumentDeleted = useCallback(
    (docRef: string) => {
      if (opportunityId) placeholderDeleteDocument(opportunityId, docRef);
      setUploadedDocs((prev) => {
        const next = new Set(prev);
        next.delete(docRef);
        return next;
      });
      setVerifiedDocs((prev) => {
        const next = new Set(prev);
        next.delete(docRef);
        return next;
      });
      if (opportunityId) {
        appendEdcTimelineEntry({
          contextRef: { type: "opportunity", id: opportunityId },
          eventType: "document_upload",
          title: "Document deleted",
          description: `${docRef} deleted`,
          actorId: "workspace",
          expandablePayload: { docRef, source: "opportunity-workspace-documents" },
        });
      }
      refresh();
    },
    [opportunityId, refresh],
  );

  const activateQuickAction = useCallback(
    (nextFocus: WorkspaceFocus) => {
      setFocus(nextFocus);
      if (!opportunityId) return;
      const intentMap: Partial<Record<WorkspaceFocus, WorkspaceQuickIntent>> = {
        life: "open_life_selector",
        stage: "open_stage_dialog",
        tasks: "focus_task_form",
        documents: "focus_document_upload",
        dialogue: "focus_dialogue_compose",
        timeline: "focus_dialogue_compose",
      };
      const intent = intentMap[nextFocus];
      if (intent) placeholderSetQuickIntent(opportunityId, intent);
      refresh();
    },
    [opportunityId, refresh],
  );

  const lastPlaceholderStatus = opportunityId
    ? getWorkspacePlaceholderStatus(opportunityId)
    : leadCaseFile
      ? "Lead Case context loaded from persisted Loan File."
      : null;

  const value: OpportunityWorkspaceState = {
    workspaceReady,
    leadCaseFile,
    opportunityId,
    contactId,
    opportunity,
    contact,
    stageCode: opportunity?.stageCode ?? leadCaseFile?.stage ?? "raw_lead",
    progressRatio,
    overdueTaskCount: taskMetrics.overdue,
    openTaskCount: taskMetrics.open,
    completedTaskCount: taskMetrics.completed,
    completedTaskIds,
    documentStats,
    intelligence,
    chanakyaAdvisory,
    selectedLender,
    productLabel,
    loanAmountLabel,
    focus,
    refreshKey,
    setFocus,
    activateQuickAction,
    setSelectedLender,
    refresh,
    changeStage,
    markTaskCompleted,
    markTaskReopened,
    markDocumentUploaded,
    markDocumentVerified,
    markDocumentReplaced,
    markDocumentDeleted,
    lastPlaceholderStatus,
  };

  return (
    <OpportunityWorkspaceContext.Provider value={value}>
      {children}
    </OpportunityWorkspaceContext.Provider>
  );
}

export function useOpportunityWorkspace(): OpportunityWorkspaceState {
  const ctx = useContext(OpportunityWorkspaceContext);
  if (!ctx) {
    throw new Error("useOpportunityWorkspace must be used within OpportunityWorkspaceProvider");
  }
  return ctx;
}
