"use client";

/**
 * Opportunity Document Requests — workflow workspace (not document storage).
 * LOD · secure upload link · reminders · readiness.
 * Uploads always land in Enterprise Document Registry SSOT.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Copy,
  EllipsisVertical,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildDocumentRequestEmailBody,
  buildDocumentRequestWhatsAppBody,
  DOCUMENT_REQUEST_EMAIL_SUBJECT,
} from "@/constants/document-requests";
import { queueOutboxMessage } from "@/lib/enterprise-action-center";
import { subscribeDocumentRegistryUpdated } from "@/lib/document-registry";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  addCustomDocumentRequirement,
  buildLodStructureKey,
  buildCustomerEngagementPortalPath,
  createOrRegenerateUploadSession,
  deriveOpportunityDocumentReadiness,
  EdieLodCertificationError,
  evaluateDocumentRequestLodReadiness,
  generateAndPersistLod,
  getActiveLodVersion,
  getDocumentRequestRef,
  getDocumentRequestState,
  hasLodDimensionDrift,
  recordDocumentRequestCommunication,
  refreshDocumentRequestFromRegistry,
  requestDocumentItems,
  subscribeDocumentRequestsUpdated,
} from "@/lib/document-requests";
import { resolveLoanCommunicationParticipants } from "@/lib/enterprise-action-center/resolve-participants";
import {
  loadStatedDraft,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import {
  getEcmMasterLabel,
  listEcmMasterOptions,
} from "@/constants/enterprise-contact-master";
import type {
  DocumentRequestCommEvent,
  DocumentRequestItemState,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";
import {
  LOAN_PARTICIPANT_ROLE_LABELS,
  type LoanParticipant,
} from "@/types/loan-participant";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { cn } from "@/lib/utils";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";

const CONSTITUTION_OPTIONS = listEcmMasterOptions("constitution").filter((o) => o.id !== "other");

function formatBorrowerType(employmentType?: string | null): string {
  const e = (employmentType || "").toLowerCase();
  if (!e) return "—";
  if (e.includes("self") || e.includes("business") || e.includes("professional")) {
    return "Self-employed";
  }
  if (e.includes("company") || e.includes("corporate")) return "Company";
  return "Salaried";
}

function formatConstitutionLabel(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "—";
  return getEcmMasterLabel("constitution", raw) || raw;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function commLabel(kind: DocumentRequestCommEvent["kind"]): string {
  switch (kind) {
    case "lod_generated":
      return "LOD Generated";
    case "lod_regenerated":
      return "Regenerated LOD";
    case "email_sent":
      return "Email Sent";
    case "whatsapp_sent":
      return "WhatsApp Sent";
    case "reminder_sent":
      return "Reminder Sent";
    case "customer_uploaded":
      return "Customer Uploaded Document";
    case "verification_completed":
      return "Verification Completed";
    case "link_regenerated":
      return "Upload Link Regenerated";
    case "upload_link_generated":
      return "Upload Link Generated";
    case "custom_requirement_added":
      return "Custom Document Requirement Added";
    default:
      return kind;
  }
}

export function WorkspaceDocumentRequestsPanel() {
  const router = useRouter();
  const { user } = useAuthContext();
  const {
    opportunityId,
    opportunityNumber,
    contact,
    productLabel,
    leadCaseFile,
    opportunity,
    registryOpportunity,
  } = useOpportunityWorkspace();

  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Relationship Manager";

  const borrower = registryOpportunity
    ? resolveOpportunityBorrowerIdentity(registryOpportunity)
    : null;
  const customerName =
    borrower?.displayName ||
    contact?.name?.trim() ||
    leadCaseFile?.customerName ||
    "—";
  const mobile =
    borrower?.primaryContactMobile ||
    contact?.mobilePrimary ||
    leadCaseFile?.customerMobile ||
    "";
  const email =
    borrower?.primaryContactEmail ||
    contact?.personalEmail ||
    contact?.officialEmail ||
    leadCaseFile?.customerEmail ||
    "";
  const employmentType =
    contact?.employmentType || leadCaseFile?.employmentType || "";
  const statedDraft = useMemo(
    () => (leadCaseFile?.id ? loadStatedDraft(leadCaseFile.id) : {}),
    // Re-read when opportunity identity changes; constitutionOverride covers in-panel edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional identity-only reload
    [leadCaseFile?.id],
  );
  const [constitutionOverride, setConstitutionOverride] = useState<string>("");
  const constitution =
    constitutionOverride ||
    statedDraft.statedConstitution ||
    leadCaseFile?.businessDetails?.constitution ||
    leadCaseFile?.participants?.find((p) => p.entityType === "company")?.constitution ||
    "";
  const constitutionLabel = formatConstitutionLabel(constitution);
  const borrowerTypeLabel = formatBorrowerType(employmentType);
  const needsConstitution =
    borrowerTypeLabel === "Self-employed" || borrowerTypeLabel === "Company";
  const productForLod =
    productLabel && productLabel !== "Not Specified" ? productLabel : "";
  const oppRef =
    opportunityNumber ||
    opportunity?.opportunityCode ||
    opportunityId ||
    "—";
  const rmName =
    leadCaseFile?.relationshipManager ||
    contact?.ownerName ||
    actor;

  const lodGate = useMemo(
    () =>
      evaluateDocumentRequestLodReadiness({
        customerName: customerName === "—" ? "" : customerName,
        mobile,
        email,
        productLabel: productForLod,
        employmentType,
        constitution,
      }),
    [customerName, mobile, email, productForLod, employmentType, constitution],
  );

  const [state, setState] = useState<DocumentRequestWorkspaceState>(() =>
    opportunityId ? getDocumentRequestState(opportunityId) : getDocumentRequestState(""),
  );
  const [busy, setBusy] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(() => new Set());
  const [activeItem, setActiveItem] = useState<DocumentRequestItemState | null>(null);
  const [addRequirementOpen, setAddRequirementOpen] = useState(false);
  const [customRequirementLabel, setCustomRequirementLabel] = useState("");
  const [customRequirementCategory, setCustomRequirementCategory] =
    useState<"critical" | "journey">("journey");
  const [customRequirementOwnerRef, setCustomRequirementOwnerRef] = useState("");
  const autoRegenKeyRef = useRef<string>("");
  const autoGenerateKeyRef = useRef<string>("");
  const loanParticipants = useMemo(
    () => (leadCaseFile?.participants ?? []).filter((participant) => participant.status !== "inactive"),
    [leadCaseFile?.participants],
  );
  const secured = leadCaseFile?.lendingType === "secured";
  const participantSignature = useMemo(
    () =>
      loanParticipants
        .map(
          (participant) =>
            `${participant.id}:${participant.role ?? ""}:${participant.entityType}:${participant.constitution ?? ""}`,
        )
        .join("|"),
    [loanParticipants],
  );

  useEffect(() => {
    if (
      customRequirementOwnerRef &&
      (customRequirementOwnerRef === "security" ||
        loanParticipants.some((participant) => participant.id === customRequirementOwnerRef))
    ) {
      return;
    }
    setCustomRequirementOwnerRef(loanParticipants[0]?.id ?? (secured ? "security" : ""));
  }, [customRequirementOwnerRef, loanParticipants, secured]);

  const reload = useCallback(() => {
    if (!opportunityId) return;
    setState(refreshDocumentRequestFromRegistry(opportunityId, leadCaseFile?.id));
  }, [opportunityId, leadCaseFile?.id]);

  useEffect(() => {
    reload();
    const unsubDr = subscribeDocumentRequestsUpdated(reload);
    const unsubReg = subscribeDocumentRegistryUpdated(reload);
    return () => {
      unsubDr();
      unsubReg();
    };
  }, [reload]);

  const activeVersion = useMemo(() => getActiveLodVersion(state), [state]);
  const dimensionDrift = useMemo(() => {
    const masterDrift = hasLodDimensionDrift(activeVersion, {
        borrowerTypeLabel,
        productLabel: productForLod || "—",
        constitutionLabel: constitutionLabel || "—",
      });
    if (!activeVersion) return masterDrift;
    const structureDrift =
      activeVersion.structureKey !== buildLodStructureKey(loanParticipants, secured);
    return masterDrift || structureDrift;
  }, [
    activeVersion,
    borrowerTypeLabel,
    productForLod,
    constitutionLabel,
    loanParticipants,
    secured,
  ]);

  const persistConstitution = useCallback(
    (value: string) => {
      setConstitutionOverride(value);
      if (leadCaseFile?.id) {
        const next = { ...loadStatedDraft(leadCaseFile.id), statedConstitution: value };
        saveStatedDraft(leadCaseFile.id, next);
      }
    },
    [leadCaseFile?.id],
  );

  const runGenerateLod = useCallback(
    (reason: "manual" | "dimension_change") => {
      if (!opportunityId || !lodGate.canGenerate) {
        if (!lodGate.canGenerate && lodGate.chanakyaMessage) {
          toast.error(lodGate.chanakyaMessage.split("\n").filter(Boolean)[0] ?? "Cannot generate LOD");
        }
        return;
      }
      setBusy(true);
      try {
        const next = generateAndPersistLod({
          opportunityId,
          productLabel: productForLod || "",
          employmentType,
          constitution,
          transactionType:
            leadCaseFile?.transactionType === "balance_transfer" ||
            /balance.?transfer|home.?loan.?bt|HOME_LOAN_BT/i.test(productForLod)
              ? "balance_transfer"
              : "fresh",
          runtimeFile: leadCaseFile,
          actor,
          opportunityReference: oppRef,
        });
        if (!state.uploadSession?.token) {
          createOrRegenerateUploadSession({
            opportunityId,
            opportunityReference: oppRef,
            customerName: customerName === "—" ? "Customer" : customerName,
            loanProduct: productForLod || "Loan",
            borrowerTypeLabel,
            constitutionLabel: constitutionLabel || "—",
            rmName,
            actor,
            regenerate: false,
          });
        }
        setState(getDocumentRequestState(opportunityId));
        toast.success(
          reason === "dimension_change"
            ? `LOD auto-regenerated (v${next.lodVersions?.[0]?.versionNumber ?? "—"}) — uploaded documents kept linked`
            : `LOD ${next.lodVersions && next.lodVersions.length > 1 ? "regenerated" : "generated"} — ${next.lodItems.length} documents`,
        );
      } catch (err) {
        const message =
          err instanceof EdieLodCertificationError
            ? err.message
            : err instanceof Error
              ? err.message
              : "LOD generation failed.";
        toast.error(message.split("\n").filter(Boolean)[0] ?? message);
      } finally {
        setBusy(false);
      }
    },
    [
      opportunityId,
      lodGate.canGenerate,
      lodGate.chanakyaMessage,
      productForLod,
      employmentType,
      constitution,
      constitutionLabel,
      leadCaseFile,
      actor,
      oppRef,
      state.uploadSession?.token,
      customerName,
      borrowerTypeLabel,
      rmName,
    ],
  );

  useEffect(() => {
    if (!opportunityId || !lodGate.canGenerate || activeVersion || state.lodItems.length) return;
    const key = `${opportunityId}|${borrowerTypeLabel}|${productForLod}|${constitution}|${participantSignature}|${secured}`;
    if (autoGenerateKeyRef.current === key) return;
    autoGenerateKeyRef.current = key;
    runGenerateLod("manual");
  }, [
    opportunityId,
    lodGate.canGenerate,
    activeVersion,
    state.lodItems.length,
    borrowerTypeLabel,
    productForLod,
    constitution,
    participantSignature,
    secured,
    runGenerateLod,
  ]);

  useEffect(() => {
    if (!opportunityId || !lodGate.canGenerate || !activeVersion || !dimensionDrift) return;
    const key = `${opportunityId}|${borrowerTypeLabel}|${productForLod}|${constitution}|${participantSignature}|${secured}`;
    if (autoRegenKeyRef.current === key) return;
    autoRegenKeyRef.current = key;
    runGenerateLod("dimension_change");
  }, [
    opportunityId,
    lodGate.canGenerate,
    activeVersion,
    dimensionDrift,
    borrowerTypeLabel,
    productForLod,
    constitution,
    participantSignature,
    secured,
    runGenerateLod,
  ]);

  const readiness = useMemo(
    () => deriveOpportunityDocumentReadiness(state.lodItems),
    [state.lodItems],
  );

  const unrequestedItems = state.lodItems.filter((item) => item.status === "pending");
  const requestedCount = state.lodItems.filter((item) => item.status !== "pending").length;
  const receivedCount = state.lodItems.filter(
    (item) =>
      item.status === "uploaded" ||
      item.status === "under_verification" ||
      item.status === "verified",
  ).length;
  const selectedItems = state.lodItems.filter(
    (item) => selectedRefs.has(getDocumentRequestRef(item)) && item.status === "pending",
  );
  const allUnrequestedSelected =
    unrequestedItems.length > 0 &&
    unrequestedItems.every((item) => selectedRefs.has(getDocumentRequestRef(item)));
  const requirementCards = useMemo(() => {
    const cards = loanParticipants.map((participant) => ({
      id: `participant:${participant.id}`,
      name: participant.name,
      descriptor: `${loanParticipantRoleLabel(participant)} · ${loanParticipantTypeLabel(participant)}`,
      items: state.lodItems.filter(
        (item) => item.ownerScope === "participant" && item.participantId === participant.id,
      ),
    }));
    const legacyItems = state.lodItems.filter((item) => !item.ownerScope);
    if (!loanParticipants.length && legacyItems.length) {
      cards.push({
        id: "opportunity-applicant",
        name: customerName,
        descriptor: `Applicant · ${borrowerTypeLabel}`,
        items: legacyItems,
      });
    }
    if (secured) {
      cards.push({
        id: "security",
        name: "COLLATERAL / SECURITY DOCUMENTS",
        descriptor: "Security · Collateral",
        items: state.lodItems.filter((item) => item.ownerScope === "security"),
      });
    }
    return cards;
  }, [
    loanParticipants,
    state.lodItems,
    secured,
    customerName,
    borrowerTypeLabel,
  ]);
  const wealthPartner = useMemo(
    () =>
      leadCaseFile
        ? resolveLoanCommunicationParticipants(leadCaseFile).find(
            (participant) => participant.recipientType === "wealth_partner",
          ) ?? null
        : null,
    [leadCaseFile],
  );

  const absoluteUploadUrl = (token: string) => {
    // CO-BIZ-004 — share full engagement portal (includes Documents tab).
    const path = buildCustomerEngagementPortalPath(token);
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  const ensureUploadSession = (regenerate = false) => {
    if (!opportunityId) return null;
    return createOrRegenerateUploadSession({
      opportunityId,
      opportunityReference: oppRef,
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productForLod || "Loan",
      borrowerTypeLabel,
      constitutionLabel: constitutionLabel || "—",
      rmName,
      actor,
      regenerate,
    });
  };

  const onGenerateLod = () => runGenerateLod("manual");

  const onCopyLink = async () => {
    let session = state.uploadSession;
    if (!session?.token || !session.active) {
      const next = ensureUploadSession(Boolean(session));
      session = next?.uploadSession;
      reload();
    }
    if (!session?.token) {
      toast.error("Generate LOD before creating an upload link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteUploadUrl(session.token));
      toast.success("Customer engagement link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const onRegenerateLink = () => {
    if (!state.lodItems.length) {
      toast.error("Generate LOD first.");
      return;
    }
    ensureUploadSession(true);
    reload();
    toast.success("Upload link regenerated");
  };

  const onSendEmail = (asReminder = false) => {
    if (!opportunityId) return;
    if (!email.trim()) {
      toast.error("Customer email is required to send the document request.");
      return;
    }
    let session = state.uploadSession;
    if (!session?.token) {
      const next = ensureUploadSession(false);
      session = next?.uploadSession;
    }
    if (!session?.token) {
      toast.error("Generate LOD and upload link first.");
      return;
    }
    const uploadUrl = absoluteUploadUrl(session.token);
    const subject = DOCUMENT_REQUEST_EMAIL_SUBJECT.replace(
      "{{Loan Product}}",
      productForLod || "Loan",
    );
    const body = buildDocumentRequestEmailBody({
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productForLod || "Loan",
      borrowerType: borrowerTypeLabel,
      constitution: constitutionLabel || "N/A",
      opportunityReference: oppRef,
      uploadUrl,
    });
    queueOutboxMessage({
      channel: "email",
      entityType: "opportunity",
      entityId: opportunityId,
      recipientId: contact?.id || opportunityId,
      recipientName: customerName === "—" ? "Customer" : customerName,
      recipientType: "customer",
      recipientEmail: email,
      templateName: asReminder ? "Document Request Reminder" : "Document Request LOD",
      subject: asReminder ? `Reminder: ${subject}` : subject,
      body: asReminder
        ? `Reminder — please upload pending documents.\n\n${body}`
        : body,
    });
    recordDocumentRequestCommunication(
      opportunityId,
      asReminder ? "reminder_sent" : "email_sent",
      actor,
      email,
      oppRef,
    );
    reload();
    toast.success(asReminder ? "Reminder queued in Enterprise Outbox" : "Email queued in Enterprise Outbox");
  };

  const sendSelectedLod = (
    channel: "email" | "whatsapp",
    recipientType: "customer" | "wealth_partner",
  ) => {
    if (!opportunityId || !selectedItems.length) {
      toast.error("Select at least one unrequested document.");
      return;
    }
    let session = state.uploadSession;
    if (!session?.token) {
      session = ensureUploadSession(false)?.uploadSession;
    }
    if (!session?.token) {
      toast.error("Unable to create the secure document upload session.");
      return;
    }

    const recipient =
      recipientType === "customer"
        ? {
            id: contact?.id || opportunityId,
            name: customerName === "—" ? "Customer" : customerName,
            email,
            mobile,
          }
        : {
            id: wealthPartner?.id || "",
            name: wealthPartner?.name || "Wealth Partner",
            email: wealthPartner?.email || "",
            mobile: wealthPartner?.mobile || "",
          };
    const destination = channel === "email" ? recipient.email.trim() : recipient.mobile.trim();
    if (!destination) {
      toast.error(
        `${recipient.name} does not have an ${channel === "email" ? "email address" : "available mobile number"} in the Enterprise relationship context.`,
      );
      return;
    }

    const uploadUrl = absoluteUploadUrl(session.token);
    const selectedList = selectedItems.map((item) => `• ${item.label}`).join("\n");
    const selectionIntro =
      recipientType === "wealth_partner"
        ? `Please coordinate the following documents for ${customerName}:\n${selectedList}`
        : `Please provide the following documents:\n${selectedList}`;

    if (channel === "email") {
      const subject = DOCUMENT_REQUEST_EMAIL_SUBJECT.replace(
        "{{Loan Product}}",
        productForLod || "Loan",
      );
      const body = buildDocumentRequestEmailBody({
        customerName: recipient.name,
        loanProduct: productForLod || "Loan",
        borrowerType: borrowerTypeLabel,
        constitution: constitutionLabel || "N/A",
        opportunityReference: oppRef,
        uploadUrl,
      });
      queueOutboxMessage({
        channel: "email",
        entityType: "opportunity",
        entityId: opportunityId,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientType,
        recipientEmail: recipient.email,
        templateName: "Document Request LOD",
        subject,
        body: `${selectionIntro}\n\n${body}`,
      });
    } else {
      const body = buildDocumentRequestWhatsAppBody({
        customerName: recipient.name,
        loanProduct: productForLod || "Loan",
        uploadUrl,
      });
      queueOutboxMessage({
        channel: "whatsapp",
        entityType: "opportunity",
        entityId: opportunityId,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientType,
        recipientMobile: recipient.mobile,
        templateName: "Document Request LOD",
        body: `${body}\n\n${selectionIntro}`,
      });
    }

    requestDocumentItems(
      opportunityId,
      selectedItems.map(getDocumentRequestRef),
    );
    recordDocumentRequestCommunication(
      opportunityId,
      channel === "email" ? "email_sent" : "whatsapp_sent",
      actor,
      `${recipient.name} · ${selectedItems.length} document${selectedItems.length === 1 ? "" : "s"} · ${selectedItems.map((item) => item.label).join(", ")}`,
      oppRef,
    );
    setSelectedRefs(new Set());
    reload();
    toast.success(
      `${selectedItems.length} document requirement${selectedItems.length === 1 ? "" : "s"} queued for ${recipient.name}`,
    );
  };

  const toggleItemSelection = (requestRef: string, checked: boolean) => {
    setSelectedRefs((current) => {
      const next = new Set(current);
      if (checked) next.add(requestRef);
      else next.delete(requestRef);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedRefs(
      checked ? new Set(unrequestedItems.map(getDocumentRequestRef)) : new Set(),
    );
  };

  const addRequirement = () => {
    if (!opportunityId || !customRequirementLabel.trim() || !customRequirementOwnerRef) return;
    const participant = loanParticipants.find(
      (candidate) => candidate.id === customRequirementOwnerRef,
    );
    const securityOwner = customRequirementOwnerRef === "security" && secured;
    if (!participant && !securityOwner) return;
    const before = state.lodItems.length;
    const next = addCustomDocumentRequirement({
      opportunityId,
      label: customRequirementLabel,
      category: customRequirementCategory,
      actor,
      ownerScope: securityOwner ? "security" : "participant",
      participantId: participant?.id,
      ownerName: securityOwner
        ? "COLLATERAL / SECURITY DOCUMENTS"
        : participant?.name ?? "Participant",
      ownerRoleLabel: securityOwner ? "Security" : loanParticipantRoleLabel(participant!),
      ownerTypeLabel: securityOwner ? "Collateral" : loanParticipantTypeLabel(participant!),
    });
    if (next.lodItems.length === before) {
      toast.error("This document requirement already exists.");
      return;
    }
    setState(next);
    setCustomRequirementLabel("");
    setCustomRequirementCategory("journey");
    setAddRequirementOpen(false);
    toast.success("Document requirement added");
  };

  const openDocumentCenter = () => {
    router.push(
      buildCanonicalJourneyStageHref("documents", {
        opportunityId: opportunityId || null,
      }),
    );
  };

  const drawerItem = activeItem
    ? state.lodItems.find(
        (item) => getDocumentRequestRef(item) === getDocumentRequestRef(activeItem),
      ) ?? activeItem
    : null;

  return (
    <div className="space-y-3">
      {!lodGate.canGenerate ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-3",
            lodGate.gaps.some((gap) => gap.field.startsWith("edie."))
              ? "border-rose-500/40 bg-rose-500/10"
              : "border-amber-500/35 bg-amber-500/10",
          )}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold text-zinc-100">
                {lodGate.gaps.some((gap) => gap.field.startsWith("edie."))
                  ? "EDIE certification required"
                  : "Complete Opportunity information"}
              </p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-zinc-300">
                {lodGate.chanakyaMessage}
              </p>
              {needsConstitution ? (
                <div className="mt-2 max-w-xs">
                  <Select value={constitution || undefined} onValueChange={persistConstitution}>
                    <SelectTrigger className="h-8 border-white/15 bg-zinc-950 text-xs text-zinc-100">
                      <SelectValue placeholder="Select business constitution" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTITUTION_OPTIONS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {dimensionDrift && activeVersion ? (
        <div className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-50">
          Opportunity details changed since LOD v{activeVersion.versionNumber}. Regenerating from
          the Document Master; received documents remain linked.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/75 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
                DOCUMENT REQUIREMENTS (LOD)
              </h2>
              {activeVersion ? (
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">
                  v{activeVersion.versionNumber}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-[10px] text-zinc-500">
              {oppRef} · {customerName} · {productForLod || "Product not specified"} ·{" "}
              {borrowerTypeLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label
              className={cn(
                "flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-[11px] text-zinc-200",
                !unrequestedItems.length && "pointer-events-none opacity-50",
              )}
            >
              <Checkbox
                checked={allUnrequestedSelected}
                disabled={!unrequestedItems.length}
                onCheckedChange={(checked) => toggleSelectAll(checked === true)}
              />
              Select All
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-white/15 px-2.5 text-[11px]"
              disabled={!state.lodItems.length}
              onClick={() => setAddRequirementOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Requirement
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-[11px]"
                  disabled={!selectedItems.length}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send LOD
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuItem onSelect={() => sendSelectedLod("email", "customer")}>
                  <Mail />
                  Customer · Email
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => sendSelectedLod("whatsapp", "customer")}>
                  <MessageCircle />
                  Customer · WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!wealthPartner?.email}
                  onSelect={() => sendSelectedLod("email", "wealth_partner")}
                >
                  <Mail />
                  Wealth Partner · Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!wealthPartner?.mobile}
                  onSelect={() => sendSelectedLod("whatsapp", "wealth_partner")}
                >
                  <MessageCircle />
                  Wealth Partner · WhatsApp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-white/15 px-2.5 text-[11px]"
                >
                  <EllipsisVertical className="h-3.5 w-3.5" />
                  More
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem
                  disabled={!lodGate.canGenerate || !opportunityId || busy}
                  onSelect={onGenerateLod}
                >
                  <RefreshCw />
                  Regenerate from Master
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!state.lodItems.length} onSelect={onCopyLink}>
                  <Copy />
                  Copy Secure Upload Link
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!state.lodItems.length} onSelect={onRegenerateLink}>
                  <Link2 />
                  Regenerate Upload Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!state.lodItems.some((item) => item.status === "requested")}
                  onSelect={() => onSendEmail(true)}
                >
                  <Send />
                  Send Customer Reminder
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openDocumentCenter}>
                  <ExternalLink />
                  Open Document Registry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-5 divide-x divide-white/10 border-b border-white/10 bg-zinc-950/70">
          <LodMetric label="Required" value={state.lodItems.length} tone="text-sky-300" />
          <LodMetric label="Requested" value={requestedCount} tone="text-fuchsia-300" />
          <LodMetric label="Received" value={receivedCount} tone="text-emerald-300" />
          <LodMetric label="Pending" value={state.lodItems.length - receivedCount} tone="text-amber-300" />
          <LodMetric label="Completion" value={`${readiness.completionPct}%`} tone="text-amber-300" />
        </div>

        {!state.lodItems.length ? (
          <div className="flex min-h-64 items-center justify-center px-6 py-10 text-center">
            <div>
              {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-400" /> : null}
              <p className="mt-2 text-sm font-medium text-zinc-200">
                {busy ? "Generating requirements from Document Master…" : "No LOD available"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Complete the Opportunity information to generate its document requirements.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 bg-zinc-950/35 p-2.5">
            {requirementCards.map((card) => (
              <section
                key={card.id}
                className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/70"
              >
                <div className="border-b border-white/10 bg-zinc-900/70 px-3 py-2.5">
                  <h3 className="text-xs font-semibold text-zinc-100">{card.name}</h3>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{card.descriptor}</p>
                </div>
                <LodItemsTable
                  items={card.items}
                  selectedRefs={selectedRefs}
                  onToggle={toggleItemSelection}
                  onOpen={setActiveItem}
                  onOpenRegistry={openDocumentCenter}
                />
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-zinc-950/70 px-4 py-2 text-[10px] text-zinc-500">
          <span>
            Showing {state.lodItems.length} requirement{state.lodItems.length === 1 ? "" : "s"} ·{" "}
            {unrequestedItems.length} not requested
          </span>
          <span>Uploaded documents remain in Enterprise Document Registry</span>
        </div>
      </section>

      <Dialog open={addRequirementOpen} onOpenChange={setAddRequirementOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Document Requirement</DialogTitle>
            <DialogDescription className="text-xs">
              Add an Opportunity-specific requirement. It will remain Not Requested until selected
              and sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-300">Participant</p>
            <Select
              value={customRequirementOwnerRef}
              onValueChange={setCustomRequirementOwnerRef}
            >
              <SelectTrigger className="h-9 border-white/15 bg-zinc-900 text-xs">
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {loanParticipants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name} · {loanParticipantRoleLabel(participant)}
                  </SelectItem>
                ))}
                {secured ? (
                  <SelectItem value="security">Collateral / Security Documents</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-zinc-300">Requirement</span>
            <input
              value={customRequirementLabel}
              onChange={(event) => setCustomRequirementLabel(event.target.value)}
              placeholder="e.g. April 2026 Bank Statement"
              className="h-9 w-full rounded-md border border-white/15 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              autoFocus
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-300">Priority</p>
            <Select
              value={customRequirementCategory}
              onValueChange={(value) =>
                setCustomRequirementCategory(value === "critical" ? "critical" : "journey")
              }
            >
              <SelectTrigger className="h-9 border-white/15 bg-zinc-900 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="journey">Journey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddRequirementOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!customRequirementLabel.trim() || !customRequirementOwnerRef}
              onClick={addRequirement}
            >
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(drawerItem)} onOpenChange={(open) => !open && setActiveItem(null)}>
        <SheetContent
          side="right"
          allowOutsideClose
          className="flex w-full flex-col border-white/10 bg-zinc-950 p-0 text-zinc-100 sm:max-w-sm"
        >
          {drawerItem ? (
            <>
              <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-4 pr-12 text-left">
                <SheetTitle className="text-sm text-zinc-100">{drawerItem.label}</SheetTitle>
                <SheetDescription>
                  <StatusBadge status={drawerItem.status} />
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
                <section>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Details
                  </p>
                  <dl className="mt-2 space-y-2 text-[11px]">
                    <DrawerFact
                      label="Participant / Scope"
                      value={
                        drawerItem.ownerScope === "security"
                          ? "Collateral / Security"
                          : drawerItem.ownerName || "Opportunity"
                      }
                    />
                    <DrawerFact label="Priority" value={drawerItem.critical ? "Critical" : "Journey"} />
                    <DrawerFact
                      label="Requested On"
                      value={drawerItem.status === "pending" ? "—" : formatDate(drawerItem.requestedOn)}
                    />
                    <DrawerFact label="Received On" value={formatDate(drawerItem.uploadedAt)} />
                    <DrawerFact label="Source" value={formatSource(drawerItem.receivedSource)} />
                    <DrawerFact
                      label="Requirement Source"
                      value={drawerItem.custom ? "Manual requirement" : "Enterprise Document Master"}
                    />
                  </dl>
                  {drawerItem.remarks ? (
                    <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-2.5 text-[11px] leading-relaxed text-zinc-300">
                      {drawerItem.remarks}
                    </p>
                  ) : null}
                </section>

                <section>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Existing Document Actions
                  </p>
                  <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      Upload, replace, verify, preview, and version actions remain in the
                      Opportunity Document Center.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 h-8 gap-1.5 text-[11px]"
                      onClick={openDocumentCenter}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Document Registry
                    </Button>
                  </div>
                </section>

                <section>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Communication History
                  </p>
                  {state.communications.length ? (
                    <ul className="mt-2 space-y-2">
                      {state.communications.slice(0, 12).map((event) => (
                        <li
                          key={event.id}
                          className="rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2 text-[10px]"
                        >
                          <p className="font-medium text-zinc-200">{commLabel(event.kind)}</p>
                          <p className="mt-0.5 text-zinc-500">
                            {formatDate(event.at)} · {event.actor}
                          </p>
                          {event.detail ? (
                            <p className="mt-1 line-clamp-3 text-zinc-400">{event.detail}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-500">No communication events yet.</p>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function loanParticipantRoleLabel(participant: LoanParticipant): string {
  if (participant.role === "primary_applicant") return "Applicant";
  return participant.role
    ? LOAN_PARTICIPANT_ROLE_LABELS[participant.role]
    : participant.entityType === "company"
      ? "Entity"
      : "Participant";
}

function loanParticipantTypeLabel(participant: LoanParticipant): string {
  if (participant.entityType === "individual") return "Individual";
  return participant.constitution?.trim() || "Company";
}

function LodItemsTable({
  items,
  selectedRefs,
  onToggle,
  onOpen,
  onOpenRegistry,
}: {
  items: DocumentRequestItemState[];
  selectedRefs: Set<string>;
  onToggle: (requestRef: string, checked: boolean) => void;
  onOpen: (item: DocumentRequestItemState) => void;
  onOpenRegistry: () => void;
}) {
  if (!items.length) {
    return (
      <p className="px-3 py-4 text-[11px] text-zinc-500">
        No applicable requirements were returned by the Document Master.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed text-left text-[11px]">
        <thead className="bg-zinc-900/45 text-[9px] uppercase tracking-[0.08em] text-zinc-500">
          <tr className="border-b border-white/10">
            <th className="w-10 px-3 py-2 font-medium">
              <span className="sr-only">Select</span>
            </th>
            <th className="w-[28%] px-2 py-2 font-medium">Document</th>
            <th className="w-[11%] px-2 py-2 font-medium">Priority</th>
            <th className="w-[14%] px-2 py-2 font-medium">Requested On</th>
            <th className="w-[14%] px-2 py-2 font-medium">Received On</th>
            <th className="w-[13%] px-2 py-2 font-medium">Status</th>
            <th className="w-[13%] px-2 py-2 font-medium">Source</th>
            <th className="w-20 px-2 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const requestRef = getDocumentRequestRef(item);
            return (
              <tr
                key={requestRef}
                className="cursor-pointer border-b border-white/5 text-zinc-300 transition-colors hover:bg-white/[0.035]"
                onClick={() => onOpen(item)}
              >
                <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedRefs.has(requestRef)}
                    disabled={item.status !== "pending"}
                    aria-label={`Select ${item.label}`}
                    onCheckedChange={(checked) => onToggle(requestRef, checked === true)}
                  />
                </td>
                <td className="truncate px-2 py-2.5 font-medium text-zinc-100">
                  {item.label}
                  {item.custom ? (
                    <span className="ml-2 rounded bg-sky-500/10 px-1.5 py-0.5 text-[8px] text-sky-300">
                      Custom
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2.5">
                  <PriorityBadge item={item} />
                </td>
                <td className="px-2 py-2.5 text-zinc-400">
                  {item.status === "pending" ? "—" : formatCompactDate(item.requestedOn)}
                </td>
                <td className="px-2 py-2.5 text-zinc-400">
                  {formatCompactDate(item.uploadedAt)}
                </td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="truncate px-2 py-2.5 text-zinc-400">
                  {formatSource(item.receivedSource)}
                </td>
                <td className="px-2 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="inline-flex items-center">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                      aria-label={`View ${item.label}`}
                      onClick={() => onOpen(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                          aria-label={`More actions for ${item.label}`}
                        >
                          <EllipsisVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs">
                        <DropdownMenuItem onSelect={() => onOpen(item)}>
                          <Eye />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onOpenRegistry}>
                          <ExternalLink />
                          Document Registry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCompactDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatSource(source?: string): string {
  if (!source) return "—";
  const labels: Record<string, string> = {
    customer_portal: "Customer Portal",
    wealth_partner: "Wealth Partner",
    manual_upload: "Manual Upload",
    email: "Email",
    whatsapp: "WhatsApp",
    api: "API",
    lender_portal: "Lender Portal",
    folder_package: "Folder Package",
    conversation_activity: "Conversation",
  };
  return labels[source] || source.replace(/_/g, " ");
}

function displayStatus(status: DocumentRequestItemState["status"]): string {
  switch (status) {
    case "pending":
      return "Not Requested";
    case "requested":
      return "Pending";
    case "uploaded":
    case "under_verification":
      return "Received";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "re_upload_required":
      return "Re-upload Required";
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: DocumentRequestItemState["status"] }) {
  const tone =
    status === "verified"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : status === "uploaded" || status === "under_verification"
        ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
        : status === "requested"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
          : status === "rejected" || status === "re_upload_required"
            ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
            : "border-white/10 bg-white/5 text-zinc-400";
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[9px] font-medium", tone)}>
      {displayStatus(status)}
    </span>
  );
}

function PriorityBadge({ item }: { item: DocumentRequestItemState }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[9px] font-medium",
        item.critical
          ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
          : "border-sky-500/25 bg-sky-500/10 text-sky-300",
      )}
    >
      {item.critical ? "Critical" : "Journey"}
    </span>
  );
}

function LodMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="px-2 py-2 text-center">
      <p className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</p>
      <p className="mt-0.5 text-[9px] text-zinc-500">{label}</p>
    </div>
  );
}

function DrawerFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
