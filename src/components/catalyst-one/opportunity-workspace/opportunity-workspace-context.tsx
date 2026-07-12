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
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { deriveEteTaskColour, listEteTasks } from "@/lib/enterprise-task-engine";
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
import type { EoleOpportunity } from "@/types/enterprise-opportunity-lifecycle-engine";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { OpportunityIntelligenceSnapshot } from "@/types/enterprise-opportunity-intelligence";

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
  requiredDocs: string[];
  uploaded: Set<string>;
  verified: Set<string>;
}

export interface SelectedLenderSummary {
  lenderName: string;
  executorName: string;
  branchName?: string;
  reportingManagerName?: string;
  recommended?: boolean;
  successProbability?: number;
}

export interface OpportunityWorkspaceState {
  opportunityId: string;
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
  /** Presentation-only lender selection for header / LIFE card. */
  selectedLender: SelectedLenderSummary | null;
  productLabel: string;
  loanAmountLabel: string;
  focus: WorkspaceFocus;
  refreshKey: number;
  setFocus: (focus: WorkspaceFocus) => void;
  setSelectedLender: (lender: SelectedLenderSummary | null) => void;
  refresh: () => void;
  changeStage: (action: string, stageCode?: string) => void;
  markTaskCompleted: (taskId: string) => void;
  markDocumentUploaded: (docRef: string) => void;
  markDocumentVerified: (docRef: string) => void;
  markDocumentReplaced: (docRef: string) => void;
}

const OpportunityWorkspaceContext = createContext<OpportunityWorkspaceState | null>(null);

const DEMO_OPPORTUNITY_CODE = "OPP-WS-001";
const DEMO_CONTACT_MOBILE = "+91-9876543210";

function seedDocumentRulesIfEmpty() {
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
  seedDocumentRulesIfEmpty();

  let contact = listEcmContacts().find((c) => c.mobilePrimary === DEMO_CONTACT_MOBILE);
  if (!contact) {
    contact = registerEcmContact({
      name: "Priya Sharma",
      mobilePrimary: DEMO_CONTACT_MOBILE,
      mobileSecondary: "+91-9876543211",
      personalEmail: "priya.sharma@example.com",
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

export function OpportunityWorkspaceProvider({ children }: { children: ReactNode }) {
  const [opportunityId, setOpportunityId] = useState("");
  const [contactId, setContactId] = useState("");
  const [focus, setFocus] = useState<WorkspaceFocus>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [verifiedDocs, setVerifiedDocs] = useState<Set<string>>(new Set());
  const [intelligence, setIntelligence] = useState<OpportunityIntelligenceSnapshot | null>(null);
  const [selectedLender, setSelectedLender] = useState<SelectedLenderSummary | null>(null);
  const previousIntelRef = useRef<PreviousIntelligenceState>({});

  useEffect(() => {
    const seeded = ensureWorkspaceSeed();
    setOpportunityId(seeded.opportunityId);
    setContactId(seeded.contactId);
    initializeEwoeDefaultDefinitions("workspace");
    startEwoeWorkflowInstance({
      opportunityId: seeded.opportunityId,
      stageCode: "processing",
      actorId: "workspace",
    });
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const opportunity = useMemo(() => {
    if (!opportunityId) return null;
    return getEolePorts().opportunities.findById(opportunityId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const contact = useMemo(() => {
    if (!contactId) return null;
    return listEcmContacts().find((c) => c.id === contactId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, refreshKey]);

  const progressRatio = useMemo(() => {
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
  }, [opportunity?.stageCode, opportunityId, refreshKey]);

  const taskMetrics = useMemo(() => {
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
  }, [opportunityId, refreshKey, completedTaskIds]);

  const requiredDocs = useMemo(() => resolveRequiredDocs(), []);

  const documentStats: DocumentWorkspaceStats = useMemo(() => {
    const pending = requiredDocs.filter((d) => !uploadedDocs.has(d) && !verifiedDocs.has(d));
    return {
      requiredCount: requiredDocs.length,
      uploadedCount: uploadedDocs.size,
      verifiedCount: verifiedDocs.size,
      pendingCount: pending.length,
      requiredDocs,
      uploaded: uploadedDocs,
      verified: verifiedDocs,
    };
  }, [requiredDocs, uploadedDocs, verifiedDocs]);

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
  ]);

  const productLabel = useMemo(() => {
    const ref = opportunity?.productRef ?? "product:home-loan";
    return ref.replace(/^product:/, "").replace(/-/g, " ");
  }, [opportunity?.productRef]);

  const loanAmountLabel = useMemo(() => {
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
  }, [opportunityId, refreshKey]);

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
      if (!opportunityId) {
        setCompletedTaskIds((prev) => new Set(prev).add(taskId));
        refresh();
        return;
      }
      setCompletedTaskIds((prev) => new Set(prev).add(taskId));
      appendEdcTimelineEntry({
        contextRef: { type: "opportunity", id: opportunityId },
        eventType: "task",
        title: "Task completed",
        description: `Task ${taskId} marked complete in workspace`,
        actorId: "workspace",
        expandablePayload: { taskId, source: "opportunity-workspace-tasks" },
      });
      refresh();
    },
    [opportunityId, refresh],
  );

  const markDocumentUploaded = useCallback(
    (docRef: string) => {
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      refresh();
    },
    [refresh],
  );

  const markDocumentVerified = useCallback(
    (docRef: string) => {
      setVerifiedDocs((prev) => new Set(prev).add(docRef));
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      refresh();
    },
    [refresh],
  );

  const markDocumentReplaced = useCallback(
    (docRef: string) => {
      setUploadedDocs((prev) => new Set(prev).add(docRef));
      setVerifiedDocs((prev) => {
        const next = new Set(prev);
        next.delete(docRef);
        return next;
      });
      refresh();
    },
    [refresh],
  );

  const value: OpportunityWorkspaceState = {
    opportunityId,
    opportunity,
    contact,
    stageCode: opportunity?.stageCode ?? "intake",
    progressRatio,
    overdueTaskCount: taskMetrics.overdue,
    openTaskCount: taskMetrics.open,
    completedTaskCount: taskMetrics.completed,
    completedTaskIds,
    documentStats,
    intelligence,
    selectedLender,
    productLabel,
    loanAmountLabel,
    focus,
    refreshKey,
    setFocus,
    setSelectedLender,
    refresh,
    changeStage,
    markTaskCompleted,
    markDocumentUploaded,
    markDocumentVerified,
    markDocumentReplaced,
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
