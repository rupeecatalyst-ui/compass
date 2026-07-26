/**
 * CO-BIZ-004 — Compose full Customer Engagement snapshot (token-scoped projection).
 */

import {
  getDocumentRequestState,
  refreshDocumentRequestFromRegistry,
  resolveUploadSessionByToken,
} from "@/lib/document-requests";
import { composeCustomerDashboard } from "./compose-dashboard";
import { deriveCustomerExperienceScore } from "./derive-cx-score";
import { listCustomerMessages } from "./project-communication";
import { projectCustomerTasks } from "./project-customer-tasks";
import { projectDocumentCentre } from "./project-documents";
import { projectCustomerNotifications } from "./project-notifications";
import { projectCustomerTimeline } from "./project-timeline";
import type { EceEngagementSnapshot } from "@/types/enterprise-customer-engagement";

export function composeCustomerEngagementSnapshot(
  token: string,
  options?: { audit?: boolean },
): EceEngagementSnapshot {
  const asOf = new Date().toISOString();
  const resolved = resolveUploadSessionByToken(token, { audit: options?.audit ?? false });
  if (!resolved?.uploadSession) {
    return {
      asOf,
      tokenValid: false,
      opportunityId: "",
      opportunityReference: "",
      dashboard: null,
      tasks: [],
      documents: null,
      timeline: [],
      notifications: [],
      messages: [],
      cxScore: deriveCustomerExperienceScore({
        tasks: [],
        documents: null,
        messages: [],
        timeline: [],
      }),
    };
  }

  const session = resolved.uploadSession;
  let state = getDocumentRequestState(session.opportunityId);
  try {
    state = refreshDocumentRequestFromRegistry(session.opportunityId);
  } catch {
    // Registry refresh is best-effort for portal projections.
  }
  state = {
    ...state,
    uploadSession: session,
  };

  const documents = projectDocumentCentre({
    lodItems: state.lodItems ?? [],
    communications: state.communications ?? [],
  });

  const tasks = projectCustomerTasks({
    opportunityId: session.opportunityId,
    opportunityReference: session.opportunityReference,
    lodItems: state.lodItems ?? [],
  });

  const timeline = projectCustomerTimeline({
    opportunityId: session.opportunityId,
    communications: state.communications ?? [],
  });

  const messages = listCustomerMessages(session.opportunityId);

  const notifications = projectCustomerNotifications({
    lodItems: state.lodItems ?? [],
    tasks,
    timeline,
    currentStage: session.currentStage || documents.progress.bandLabel,
  });

  const dashboard = composeCustomerDashboard({
    session,
    tasks,
    documents,
    recentActivity: timeline,
  });

  const cxScore = deriveCustomerExperienceScore({
    tasks,
    documents,
    messages,
    timeline,
    lastCustomerActivityAt: state.lastCustomerActivityAt,
  });

  return {
    asOf,
    tokenValid: true,
    opportunityId: session.opportunityId,
    opportunityReference: session.opportunityReference,
    dashboard,
    tasks,
    documents,
    timeline,
    notifications,
    messages,
    cxScore,
  };
}
