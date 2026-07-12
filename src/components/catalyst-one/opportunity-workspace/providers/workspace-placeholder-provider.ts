/**
 * Opportunity Workspace placeholder action provider.
 * In-memory only — no APIs, database, AI, or business rules.
 */

export type PlaceholderDocCategory = "kyc" | "income" | "property" | "other";
export type PlaceholderTaskPriority = "low" | "medium" | "high";
export type PlaceholderTaskStatus = "open" | "completed" | "overdue";
export type PlaceholderDialogueCategory =
  | "internal_note"
  | "customer_note"
  | "rm_discussion"
  | "follow_up";

export type WorkspaceQuickIntent =
  | "none"
  | "open_life_selector"
  | "open_stage_dialog"
  | "focus_task_form"
  | "focus_document_upload"
  | "focus_dialogue_compose";

export interface PlaceholderDocumentState {
  category: PlaceholderDocCategory;
  version: number;
  deleted: boolean;
  previewText: string;
  lastAction?: string;
  uploadStatus?: "idle" | "uploading" | "uploaded" | "failed";
}

export interface PlaceholderTaskState {
  priority: PlaceholderTaskPriority;
  deleted: boolean;
  editing?: boolean;
  title?: string;
  status?: PlaceholderTaskStatus;
}

export interface PlaceholderLifeDraft {
  lenderName: string;
  executorName: string;
  branchName?: string;
  reportingManagerName?: string;
  recommended?: boolean;
  successProbability?: number;
  contactId?: string;
  lenderRef?: string;
  productRefs?: string[];
  businessMappingRefs?: string[];
  productCompatible?: boolean;
  eligibility?: "eligible" | "review" | "ineligible";
  eligibilityNote?: string;
}

export type LifeSelectionStep = "institution" | "executor";

export interface PlaceholderLifeInstitution {
  lenderRef: string;
  lenderName: string;
  productRefs: string[];
  businessMappingRefs: string[];
  cities: string[];
  branchNames: string[];
  executorCount: number;
  recommended?: boolean;
  productCompatible?: boolean;
  eligibility?: "eligible" | "review" | "ineligible";
  eligibilityNote?: string;
  successProbability?: number;
}

export interface PlaceholderStageDraft {
  open: boolean;
  nextStageCode: string;
  remarks: string;
  validationMessage?: string;
  missingRequirements?: string[];
  transitionRules?: string[];
}

export interface WorkflowBlockerItem {
  id: string;
  label: string;
  resolved: boolean;
  source: "documents" | "lender" | "tasks" | "manual";
}

export interface ChanakyaAdvisoryState {
  headline: string;
  message: string;
  reactions: string[];
  computedOn: string;
}

type OppBucket = {
  documents: Record<string, PlaceholderDocumentState>;
  tasks: Record<string, PlaceholderTaskState>;
  lifeSelectorOpen: boolean;
  lifeSearch: string;
  lifeFilterCity: string;
  lifeStep: LifeSelectionStep;
  lifeInstitution: PlaceholderLifeInstitution | null;
  lifeDraft: PlaceholderLifeDraft | null;
  lifeSaved: boolean;
  stageDraft: PlaceholderStageDraft;
  lastStatus: string | null;
  timelineGroupByDay: boolean;
  dialogueAttachmentName: string | null;
  dialogueCategory: PlaceholderDialogueCategory;
  dialogueMention: string;
  workflowBlockers: WorkflowBlockerItem[];
  resolvedBlockerIds: Set<string>;
  selectedStageDetail: string | null;
  quickIntent: WorkspaceQuickIntent;
  lastOperationalAction: string | null;
  chanakya: ChanakyaAdvisoryState | null;
};

const store = new Map<string, OppBucket>();

const MANDATORY_DOCS = new Set(["doc:pan", "doc:aadhaar", "doc:salary-slip"]);

function bucket(opportunityId: string): OppBucket {
  let b = store.get(opportunityId);
  if (!b) {
    b = {
      documents: {},
      tasks: {},
      lifeSelectorOpen: false,
      lifeSearch: "",
      lifeFilterCity: "",
      lifeStep: "institution",
      lifeInstitution: null,
      lifeDraft: null,
      lifeSaved: false,
      stageDraft: {
        open: false,
        nextStageCode: "lender_review",
        remarks: "",
      },
      lastStatus: null,
      timelineGroupByDay: true,
      dialogueAttachmentName: null,
      dialogueCategory: "internal_note",
      dialogueMention: "",
      workflowBlockers: [],
      resolvedBlockerIds: new Set(),
      selectedStageDetail: null,
      quickIntent: "none",
      lastOperationalAction: null,
      chanakya: null,
    };
    store.set(opportunityId, b);
  }
  return b;
}

function setStatus(opportunityId: string, message: string) {
  const b = bucket(opportunityId);
  b.lastStatus = message;
  b.lastOperationalAction = message;
}

export function getWorkspacePlaceholderStatus(opportunityId: string): string | null {
  return bucket(opportunityId).lastStatus;
}

export function getLastOperationalAction(opportunityId: string): string | null {
  return bucket(opportunityId).lastOperationalAction;
}

export function isDocumentMandatory(docRef: string): boolean {
  return MANDATORY_DOCS.has(docRef);
}

export function getPlaceholderDocument(
  opportunityId: string,
  docRef: string,
): PlaceholderDocumentState {
  const docs = bucket(opportunityId).documents;
  if (!docs[docRef]) {
    docs[docRef] = {
      category: docRef.includes("salary") || docRef.includes("bank") ? "income" : "kyc",
      version: 0,
      deleted: false,
      previewText: `Placeholder preview for ${docRef}`,
      uploadStatus: "idle",
    };
  }
  return docs[docRef];
}

export function placeholderUploadDocument(opportunityId: string, docRef: string): PlaceholderDocumentState {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  doc.deleted = false;
  doc.uploadStatus = "uploaded";
  doc.version = Math.max(1, doc.version + 1);
  doc.lastAction = "uploaded";
  doc.previewText = `Placeholder file · ${docRef} · v${doc.version}\nUploaded at ${new Date().toISOString()}`;
  setStatus(opportunityId, `Uploaded ${docRef} (v${doc.version})`);
  return doc;
}

export function placeholderReplaceDocument(opportunityId: string, docRef: string): PlaceholderDocumentState {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  doc.deleted = false;
  doc.uploadStatus = "uploaded";
  doc.version += 1;
  doc.lastAction = "replaced";
  doc.previewText = `Replaced placeholder · ${docRef} · v${doc.version}`;
  setStatus(opportunityId, `Replaced ${docRef} (v${doc.version})`);
  return doc;
}

export function placeholderDeleteDocument(opportunityId: string, docRef: string): PlaceholderDocumentState {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  doc.deleted = true;
  doc.uploadStatus = "idle";
  doc.lastAction = "deleted";
  setStatus(opportunityId, `Deleted ${docRef}`);
  return doc;
}

export function placeholderPreviewDocument(opportunityId: string, docRef: string): string {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  setStatus(opportunityId, `Preview ${docRef} (v${doc.version || 1})`);
  return doc.previewText;
}

export function placeholderDownloadDocument(opportunityId: string, docRef: string): string {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  const fileName = `${docRef.replace(/:/g, "-")}-v${doc.version || 1}.placeholder.txt`;
  setStatus(opportunityId, `Download · ${fileName}`);
  return fileName;
}

/** Browser mock download — creates a local text blob. */
export function placeholderTriggerMockDownload(opportunityId: string, docRef: string): string {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  const fileName = placeholderDownloadDocument(opportunityId, docRef);
  if (typeof window !== "undefined") {
    const blob = new Blob([doc.previewText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
  return fileName;
}

export function placeholderSetDocumentCategory(
  opportunityId: string,
  docRef: string,
  category: PlaceholderDocCategory,
): void {
  const doc = getPlaceholderDocument(opportunityId, docRef);
  doc.category = category;
  setStatus(opportunityId, `Category ${docRef} → ${category}`);
}

export function getPlaceholderTask(
  opportunityId: string,
  taskId: string,
): PlaceholderTaskState {
  const tasks = bucket(opportunityId).tasks;
  if (!tasks[taskId]) {
    tasks[taskId] = { priority: "medium", deleted: false, status: "open" };
  }
  return tasks[taskId];
}

export function placeholderSetTaskPriority(
  opportunityId: string,
  taskId: string,
  priority: PlaceholderTaskPriority,
): void {
  getPlaceholderTask(opportunityId, taskId).priority = priority;
  setStatus(opportunityId, `Task priority → ${priority}`);
}

export function placeholderSetTaskTitle(
  opportunityId: string,
  taskId: string,
  title: string,
): void {
  getPlaceholderTask(opportunityId, taskId).title = title;
  setStatus(opportunityId, `Task title updated`);
}

export function placeholderSetTaskStatus(
  opportunityId: string,
  taskId: string,
  status: PlaceholderTaskStatus,
): void {
  getPlaceholderTask(opportunityId, taskId).status = status;
  setStatus(opportunityId, `Task status → ${status}`);
}

export function placeholderDeleteTask(opportunityId: string, taskId: string): void {
  getPlaceholderTask(opportunityId, taskId).deleted = true;
  setStatus(opportunityId, `Task deleted (${taskId.slice(0, 8)}…)`);
}

export function placeholderMarkTaskEditing(
  opportunityId: string,
  taskId: string,
  editing: boolean,
): void {
  getPlaceholderTask(opportunityId, taskId).editing = editing;
}

export function getLifePlaceholderState(opportunityId: string) {
  const b = bucket(opportunityId);
  return {
    selectorOpen: b.lifeSelectorOpen,
    search: b.lifeSearch,
    filterCity: b.lifeFilterCity,
    step: b.lifeStep,
    institution: b.lifeInstitution,
    draft: b.lifeDraft,
    saved: b.lifeSaved,
  };
}

export function placeholderOpenLifeSelector(opportunityId: string): void {
  const b = bucket(opportunityId);
  b.lifeSelectorOpen = true;
  b.lifeStep = "institution";
  b.lifeInstitution = null;
  b.lifeDraft = null;
  b.lifeSaved = false;
  b.lifeSearch = "";
  setStatus(opportunityId, "Step 1 · Select lender institution");
}

export function placeholderCloseLifeSelector(opportunityId: string): void {
  bucket(opportunityId).lifeSelectorOpen = false;
  setStatus(opportunityId, "Lender selector closed");
}

export function placeholderSetLifeSearch(opportunityId: string, search: string): void {
  bucket(opportunityId).lifeSearch = search;
}

export function placeholderSetLifeFilterCity(opportunityId: string, city: string): void {
  bucket(opportunityId).lifeFilterCity = city;
}

export function placeholderSelectLifeInstitution(
  opportunityId: string,
  institution: PlaceholderLifeInstitution,
): void {
  const b = bucket(opportunityId);
  b.lifeInstitution = institution;
  b.lifeStep = "executor";
  b.lifeDraft = null;
  b.lifeSaved = false;
  b.lifeSearch = "";
  setStatus(opportunityId, `Step 2 · Select executor · ${institution.lenderName}`);
}

export function placeholderBackToLifeInstitution(opportunityId: string): void {
  const b = bucket(opportunityId);
  b.lifeStep = "institution";
  b.lifeDraft = null;
  b.lifeSearch = "";
  setStatus(opportunityId, "Step 1 · Select lender institution");
}

export function placeholderSetLifeDraft(
  opportunityId: string,
  draft: PlaceholderLifeDraft | null,
): void {
  bucket(opportunityId).lifeDraft = draft;
  bucket(opportunityId).lifeSaved = false;
  setStatus(
    opportunityId,
    draft
      ? `Draft executor · ${draft.executorName} · ${draft.lenderName}`
      : "Executor draft cleared",
  );
}

export function placeholderSaveLifeSelection(opportunityId: string): PlaceholderLifeDraft | null {
  const b = bucket(opportunityId);
  if (!b.lifeInstitution) {
    setStatus(opportunityId, "Select a lender institution first");
    return null;
  }
  if (!b.lifeDraft?.executorName) {
    setStatus(opportunityId, "Select an executor for the chosen lender");
    return null;
  }
  b.lifeSaved = true;
  b.lifeSelectorOpen = false;
  setStatus(
    opportunityId,
    `Saved · ${b.lifeDraft.lenderName} · ${b.lifeDraft.executorName}`,
  );
  return b.lifeDraft;
}

export function placeholderCancelLifeSelection(opportunityId: string): void {
  const b = bucket(opportunityId);
  b.lifeDraft = null;
  b.lifeInstitution = null;
  b.lifeStep = "institution";
  b.lifeSaved = false;
  b.lifeSelectorOpen = false;
  setStatus(opportunityId, "Lender selection cancelled");
}

export function placeholderReplaceLifeSelection(opportunityId: string): void {
  const b = bucket(opportunityId);
  b.lifeSaved = false;
  b.lifeDraft = null;
  b.lifeInstitution = null;
  b.lifeStep = "institution";
  b.lifeSelectorOpen = true;
  b.lifeSearch = "";
  setStatus(opportunityId, "Replace · Step 1 · Select lender institution");
}

export interface LifeInstitutionCandidate {
  lenderRef: string;
  lenderName: string;
  productRefs: string[];
  businessMappingRefs: string[];
  cities: string[];
  branchNames: string[];
  executorCount: number;
}

/** Aggregate unique lender institutions from executor contacts. */
export function aggregateLifeInstitutions(
  results: Array<{
    lenderRef: string;
    lenderName: string;
    contact: {
      productRefs: string[];
      businessMappingRefs: string[];
      city?: string;
    };
    branchName?: string;
  }>,
): LifeInstitutionCandidate[] {
  const map = new Map<string, LifeInstitutionCandidate>();
  for (const r of results) {
    const existing = map.get(r.lenderRef);
    if (!existing) {
      map.set(r.lenderRef, {
        lenderRef: r.lenderRef,
        lenderName: r.lenderName,
        productRefs: [...r.contact.productRefs],
        businessMappingRefs: [...r.contact.businessMappingRefs],
        cities: r.contact.city ? [r.contact.city] : [],
        branchNames: r.branchName ? [r.branchName] : [],
        executorCount: 1,
      });
      continue;
    }
    existing.executorCount += 1;
    for (const p of r.contact.productRefs) {
      if (!existing.productRefs.includes(p)) existing.productRefs.push(p);
    }
    for (const m of r.contact.businessMappingRefs) {
      if (!existing.businessMappingRefs.includes(m)) existing.businessMappingRefs.push(m);
    }
    if (r.contact.city && !existing.cities.includes(r.contact.city)) {
      existing.cities.push(r.contact.city);
    }
    if (r.branchName && !existing.branchNames.includes(r.branchName)) {
      existing.branchNames.push(r.branchName);
    }
  }
  return [...map.values()];
}

/** Enrich LIFE result with placeholder eligibility / compatibility signals. */
export function placeholderEnrichLifeResult(input: {
  productRefs: string[];
  targetProductRef: string;
  recommended: boolean;
  index: number;
}): Pick<
  PlaceholderLifeDraft,
  "productCompatible" | "eligibility" | "eligibilityNote" | "successProbability"
> {
  const productCompatible = input.productRefs.includes(input.targetProductRef);
  let eligibility: PlaceholderLifeDraft["eligibility"] = "eligible";
  let eligibilityNote = "Eligible for product and city filters";
  if (!productCompatible) {
    eligibility = "ineligible";
    eligibilityNote = "Product mapping does not include current opportunity product";
  } else if (input.index > 1) {
    eligibility = "review";
    eligibilityNote = "Eligible — secondary preference; capacity review suggested";
  }
  const successProbability = input.recommended
    ? 88
    : productCompatible
      ? Math.max(55, 80 - input.index * 8)
      : 35;
  return { productCompatible, eligibility, eligibilityNote, successProbability };
}

/** Top recommendation reasons for an institution card (placeholder / rule-based). */
export function getLifeRecommendationReasons(input: {
  lenderName: string;
  index: number;
  recommended: boolean;
  productCompatible?: boolean;
  successProbability?: number;
}): string[] {
  const pool: string[] = [];
  if (input.productCompatible !== false) pool.push("Product compatibility");
  if (input.recommended || input.index === 0) {
    pool.push("Highest historical success rate");
    pool.push("Highest approval probability");
  }
  if ((input.successProbability ?? 0) >= 80) pool.push("Best ROI");
  if (input.index === 0) pool.push("Faster turnaround");
  if (input.index <= 1) pool.push("Existing customer relationship");
  if (input.index === 1) pool.push("Lowest documentation");
  if (input.index >= 2) {
    pool.push("Coverage in opportunity city");
    pool.push("Competitive processing speed");
  }
  // Dedupe and take top 2–3
  return [...new Set(pool)].slice(0, 3);
}

export interface LifeComparisonRow {
  lenderRef: string;
  lenderName: string;
  interestRange: string;
  processingTime: string;
  eligibilityScore: string;
  successProbability: number;
  documentComplexity: string;
  processingSpeed: string;
  relationshipStrength: string;
}

/** Inline comparison metrics for shortlisted institutions (placeholder). */
export function buildLifeComparisonRows(
  institutions: Array<{
    lenderRef: string;
    lenderName: string;
    successProbability?: number;
    eligibility?: string;
    index: number;
  }>,
): LifeComparisonRow[] {
  const interestByIndex = ["8.40% – 9.10%", "8.55% – 9.35%", "8.70% – 9.60%", "8.85% – 9.80%"];
  const processingByIndex = ["7–10 days", "10–14 days", "12–18 days", "14–21 days"];
  const docsByIndex = ["Low", "Medium", "Medium", "High"];
  const speedByIndex = ["Fast", "Standard", "Standard", "Slower"];
  const relByIndex = ["Strong", "Good", "Moderate", "Emerging"];

  return institutions.slice(0, 4).map((inst, i) => ({
    lenderRef: inst.lenderRef,
    lenderName: inst.lenderName,
    interestRange: interestByIndex[Math.min(i, interestByIndex.length - 1)]!,
    processingTime: processingByIndex[Math.min(i, processingByIndex.length - 1)]!,
    eligibilityScore:
      inst.eligibility === "eligible"
        ? "High"
        : inst.eligibility === "review"
          ? "Medium"
          : "Low",
    successProbability: inst.successProbability ?? Math.max(40, 88 - i * 8),
    documentComplexity: docsByIndex[Math.min(i, docsByIndex.length - 1)]!,
    processingSpeed: speedByIndex[Math.min(i, speedByIndex.length - 1)]!,
    relationshipStrength: relByIndex[Math.min(i, relByIndex.length - 1)]!,
  }));
}

export function getChanakyaLenderAssignmentMessage(lenderName: string): string {
  return `${lenderName} is recommended because this customer profile has historically achieved a higher approval ratio with this product.`;
}

export function getStagePlaceholderDraft(opportunityId: string): PlaceholderStageDraft {
  return bucket(opportunityId).stageDraft;
}

export function placeholderOpenStageDialog(opportunityId: string, currentStage: string): void {
  const b = bucket(opportunityId);
  b.stageDraft = {
    open: true,
    nextStageCode: currentStage === "processing" ? "lender_review" : "approved",
    remarks: "",
    validationMessage: undefined,
    missingRequirements: [],
    transitionRules: [
      "Mandatory KYC documents must be uploaded",
      "Lender must be selected before lender_review",
      "Remarks required for audit trail",
    ],
  };
  setStatus(opportunityId, "Stage dialog opened");
}

export function placeholderCancelStageDialog(opportunityId: string): void {
  bucket(opportunityId).stageDraft.open = false;
  bucket(opportunityId).stageDraft.validationMessage = undefined;
  setStatus(opportunityId, "Stage change cancelled");
}

export function placeholderUpdateStageDraft(
  opportunityId: string,
  patch: Partial<Pick<PlaceholderStageDraft, "nextStageCode" | "remarks">>,
): void {
  Object.assign(bucket(opportunityId).stageDraft, patch);
}

export interface StageTransitionContext {
  uploadedDocs: string[];
  verifiedDocs: string[];
  requiredDocs: string[];
  hasLender: boolean;
  overdueTaskCount: number;
}

export function placeholderEvaluateStageTransition(
  opportunityId: string,
  nextStageCode: string,
  ctx: StageTransitionContext,
): { allowed: boolean; missing: string[]; rules: string[] } {
  const missing: string[] = [];
  const rules = [
    "Mandatory documents (PAN, Aadhaar, Salary slip) should be uploaded",
    "Lender selection required before lender_review or later",
    "Remarks required on confirm",
  ];

  for (const doc of MANDATORY_DOCS) {
    if (!ctx.uploadedDocs.includes(doc) && !ctx.verifiedDocs.includes(doc)) {
      if (ctx.requiredDocs.includes(doc) || MANDATORY_DOCS.has(doc)) {
        missing.push(`Missing document: ${doc}`);
      }
    }
  }

  if (
    (nextStageCode === "lender_review" ||
      nextStageCode === "approved" ||
      nextStageCode === "disbursement") &&
    !ctx.hasLender
  ) {
    missing.push("Lender not selected");
  }

  if (nextStageCode === "approved" && ctx.overdueTaskCount > 0) {
    missing.push(`${ctx.overdueTaskCount} overdue task(s) must be cleared`);
  }

  const draft = bucket(opportunityId).stageDraft;
  draft.missingRequirements = missing;
  draft.transitionRules = rules;
  return { allowed: missing.length === 0, missing, rules };
}

/** Placeholder transition validation — evaluates requirements + remarks. */
export function placeholderValidateStageTransition(
  opportunityId: string,
  ctx?: StageTransitionContext,
): boolean {
  const draft = bucket(opportunityId).stageDraft;
  if (!draft.nextStageCode) {
    draft.validationMessage = "Select a next stage";
    return false;
  }
  if (!draft.remarks.trim()) {
    draft.validationMessage = "Remarks are required";
    return false;
  }
  if (ctx) {
    const evalResult = placeholderEvaluateStageTransition(
      opportunityId,
      draft.nextStageCode,
      ctx,
    );
    if (!evalResult.allowed) {
      draft.validationMessage = `Transition blocked: ${evalResult.missing.join("; ")}`;
      draft.missingRequirements = evalResult.missing;
      return false;
    }
  }
  draft.validationMessage = undefined;
  return true;
}

export function placeholderConfirmStageDialog(
  opportunityId: string,
  ctx?: StageTransitionContext,
): PlaceholderStageDraft | null {
  if (!placeholderValidateStageTransition(opportunityId, ctx)) return null;
  const draft = { ...bucket(opportunityId).stageDraft };
  bucket(opportunityId).stageDraft.open = false;
  setStatus(opportunityId, `Stage confirmed → ${draft.nextStageCode}`);
  return draft;
}

export function getTimelineGroupByDay(opportunityId: string): boolean {
  return bucket(opportunityId).timelineGroupByDay;
}

export function placeholderToggleTimelineGrouping(opportunityId: string): boolean {
  const b = bucket(opportunityId);
  b.timelineGroupByDay = !b.timelineGroupByDay;
  setStatus(opportunityId, b.timelineGroupByDay ? "Timeline grouped by day" : "Timeline ungrouped");
  return b.timelineGroupByDay;
}

export function placeholderSetDialogueAttachment(
  opportunityId: string,
  fileName: string | null,
): void {
  bucket(opportunityId).dialogueAttachmentName = fileName;
  setStatus(
    opportunityId,
    fileName ? `Attached placeholder · ${fileName}` : "Attachment cleared",
  );
}

export function getDialogueAttachment(opportunityId: string): string | null {
  return bucket(opportunityId).dialogueAttachmentName;
}

export function getDialogueComposeState(opportunityId: string) {
  const b = bucket(opportunityId);
  return {
    category: b.dialogueCategory,
    mention: b.dialogueMention,
    attachment: b.dialogueAttachmentName,
  };
}

export function placeholderSetDialogueCategory(
  opportunityId: string,
  category: PlaceholderDialogueCategory,
): void {
  bucket(opportunityId).dialogueCategory = category;
  setStatus(opportunityId, `Dialogue category → ${category}`);
}

export function placeholderSetDialogueMention(opportunityId: string, mention: string): void {
  bucket(opportunityId).dialogueMention = mention;
}

export const DIALOGUE_CATEGORY_LABELS: Record<PlaceholderDialogueCategory, string> = {
  internal_note: "Internal note",
  customer_note: "Customer note",
  rm_discussion: "RM discussion",
  follow_up: "Follow-up",
};

export function syncWorkflowBlockers(
  opportunityId: string,
  ctx: {
    pendingDocs: string[];
    hasLender: boolean;
    overdueTaskCount: number;
  },
): WorkflowBlockerItem[] {
  const b = bucket(opportunityId);
  const items: WorkflowBlockerItem[] = [];

  if (ctx.pendingDocs.length > 0) {
    items.push({
      id: "blk-docs",
      label: `Awaiting documents: ${ctx.pendingDocs.slice(0, 3).join(", ")}${
        ctx.pendingDocs.length > 3 ? "…" : ""
      }`,
      resolved: b.resolvedBlockerIds.has("blk-docs"),
      source: "documents",
    });
  }
  if (!ctx.hasLender) {
    items.push({
      id: "blk-lender",
      label: "Lender not selected",
      resolved: b.resolvedBlockerIds.has("blk-lender"),
      source: "lender",
    });
  }
  if (ctx.overdueTaskCount > 0) {
    items.push({
      id: "blk-tasks",
      label: `${ctx.overdueTaskCount} overdue task(s)`,
      resolved: b.resolvedBlockerIds.has("blk-tasks"),
      source: "tasks",
    });
  }
  if (items.length === 0) {
    items.push({
      id: "blk-clear",
      label: "No active blockers",
      resolved: true,
      source: "manual",
    });
  }
  b.workflowBlockers = items;
  return items;
}

export function getWorkflowBlockers(opportunityId: string): WorkflowBlockerItem[] {
  return bucket(opportunityId).workflowBlockers;
}

export function placeholderResolveBlocker(opportunityId: string, blockerId: string): void {
  const b = bucket(opportunityId);
  b.resolvedBlockerIds.add(blockerId);
  b.workflowBlockers = b.workflowBlockers.map((item) =>
    item.id === blockerId ? { ...item, resolved: true } : item,
  );
  setStatus(opportunityId, `Blocker resolved · ${blockerId}`);
}

export function placeholderSelectStageDetail(opportunityId: string, stageCode: string | null): void {
  bucket(opportunityId).selectedStageDetail = stageCode;
  setStatus(
    opportunityId,
    stageCode ? `Stage details · ${stageCode}` : "Stage details closed",
  );
}

export function getSelectedStageDetail(opportunityId: string): string | null {
  return bucket(opportunityId).selectedStageDetail;
}

export function placeholderSetQuickIntent(
  opportunityId: string,
  intent: WorkspaceQuickIntent,
): void {
  bucket(opportunityId).quickIntent = intent;
}

export function getQuickIntent(opportunityId: string): WorkspaceQuickIntent {
  return bucket(opportunityId).quickIntent;
}

export function placeholderConsumeQuickIntent(opportunityId: string): WorkspaceQuickIntent {
  const b = bucket(opportunityId);
  const intent = b.quickIntent;
  b.quickIntent = "none";
  return intent;
}

export function deriveChanakyaAdvisory(input: {
  opportunityId: string;
  docCompletionPct: number;
  hasLender: boolean;
  lenderName?: string;
  overdueTaskCount: number;
  stageCode: string;
  lastAction?: string | null;
}): ChanakyaAdvisoryState {
  const reactions: string[] = [];
  let headline = "Steady Progress";
  let message = "Opportunity is progressing. Maintain scheduled follow-ups.";

  if (input.docCompletionPct >= 80) {
    reactions.push("Document completion increased — approval path improving.");
  } else if (input.docCompletionPct < 40) {
    reactions.push("Document completion is low — prioritise mandatory KYC uploads.");
  }

  if (input.hasLender && input.lenderName) {
    reactions.push(
      `${input.lenderName} assigned — recommendation refreshed for this opportunity.`,
    );
    if (
      input.lastAction?.toLowerCase().includes("saved") ||
      input.lastAction?.toLowerCase().includes("assign") ||
      input.lastAction?.toLowerCase().includes("lender")
    ) {
      headline = "Lender Assigned";
      message = getChanakyaLenderAssignmentMessage(input.lenderName);
    }
  } else if (input.hasLender) {
    reactions.push("Lender selected — recommendation refreshed.");
  } else {
    reactions.push("No lender selected — LIFE selection will improve success probability.");
  }

  if (input.overdueTaskCount > 0) {
    reactions.push(`${input.overdueTaskCount} overdue task(s) — follow-up warning.`);
    headline = "Needs Attention";
    message = "Overdue tasks are blocking momentum. Complete or reopen and reassign.";
  }

  if (input.stageCode === "lender_review" || input.stageCode === "approved") {
    reactions.push(`Stage is ${input.stageCode.replace(/_/g, " ")} — advisory updated.`);
  }

  if (input.lastAction?.toLowerCase().includes("upload")) {
    reactions.push("Document uploaded — completion % and timeline updated.");
  }
  if (input.lastAction?.toLowerCase().includes("stage")) {
    reactions.push("Stage changed — new advisory issued.");
  }

  if (input.docCompletionPct >= 90 && input.hasLender && input.overdueTaskCount === 0) {
    headline = input.lenderName ? "Lender Assigned" : "Excellent Progress";
    if (!input.lenderName) {
      message = "Documents nearly complete and lender assigned. Approval is expected soon.";
    } else if (!message.includes("historically achieved")) {
      message = getChanakyaLenderAssignmentMessage(input.lenderName);
    }
  } else if (input.overdueTaskCount === 0 && input.docCompletionPct < 40 && !input.hasLender) {
    headline = "Needs Attention";
    message = "Select a lender and upload mandatory documents to unblock workflow.";
  }

  const state: ChanakyaAdvisoryState = {
    headline,
    message,
    reactions: reactions.slice(0, 5),
    computedOn: new Date().toISOString(),
  };
  bucket(input.opportunityId).chanakya = state;
  return state;
}

export function getChanakyaAdvisory(opportunityId: string): ChanakyaAdvisoryState | null {
  return bucket(opportunityId).chanakya;
}

/** @deprecated static list — use syncWorkflowBlockers */
export const WORKFLOW_BLOCKERS_PLACEHOLDER = [
  "Awaiting mandatory KYC documents (placeholder)",
  "Lender capacity check pending (placeholder)",
] as const;

export const STAGE_OPTIONS_PLACEHOLDER = [
  { code: "document_collection", label: "Document collection" },
  { code: "processing", label: "Processing" },
  { code: "lender_review", label: "Lender review" },
  { code: "approved", label: "Approved" },
  { code: "disbursement", label: "Disbursement" },
] as const;
