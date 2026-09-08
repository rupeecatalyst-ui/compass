import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import {
  addWorkingMinutes,
  borrowerSlaCopy,
  calculateOneWorkingHourSla,
  normalizeWorkingCalendar,
  type OrganizationWorkingCalendar,
} from "@/lib/home-loan-recommendation/working-hour-sla";
import { listEteTasks, registerEteTask } from "@/lib/enterprise-task-engine/task-registry";
import { ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { EAR_EVENT_KINDS, EAR_SOURCE_SYSTEMS } from "@/constants/enterprise-activity-registry";

function weekdayFromLabel(value: unknown): number | null {
  const raw = String(value ?? "").toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };
  if (raw in map) return map[raw];
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
}

function parseMinutes(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "");
  const hm = text.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  return fallback;
}

export async function loadOrganizationWorkingCalendar(
  organizationId: string,
): Promise<OrganizationWorkingCalendar> {
  const version = await prisma.organizationWorkingCalendarVersion.findFirst({
    where: { organizationId, lifecycleStatus: "active" },
    orderBy: { versionNumber: "desc" },
  });
  if (version) {
    const days = Array.isArray(version.workingDaysJson)
      ? version.workingDaysJson.map(weekdayFromLabel).filter((v): v is number => v != null)
      : [];
    const hours = version.workingHoursJson && typeof version.workingHoursJson === "object"
      ? (version.workingHoursJson as Record<string, unknown>)
      : {};
    const holidays = Array.isArray(version.holidayCalendarJson)
      ? version.holidayCalendarJson.map((row) => {
          if (typeof row === "string") return row;
          const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
          return String(rec.date || rec.iso || "");
        }).filter(Boolean)
      : [];
    return normalizeWorkingCalendar({
      timeZone: version.timeZone,
      workingDays: days,
      workingHours: {
        openMinutes: parseMinutes(hours.open || hours.openMinutes || hours.start, 10 * 60),
        closeMinutes: parseMinutes(hours.close || hours.closeMinutes || hours.end, 19 * 60),
      },
      holidays,
      versionNumber: version.versionNumber,
      calendarId: version.id,
    });
  }

  const settings = await prisma.organizationWorkspaceSettings.findUnique({
    where: { organizationId },
  });
  const days = Array.isArray(settings?.workingDaysJson)
    ? settings.workingDaysJson.map(weekdayFromLabel).filter((v): v is number => v != null)
    : [];
  const hours =
    settings?.workingHoursJson && typeof settings.workingHoursJson === "object"
      ? (settings.workingHoursJson as Record<string, unknown>)
      : {};
  const holidays = Array.isArray(settings?.holidayCalendarJson)
    ? settings.holidayCalendarJson.map((row) => {
        if (typeof row === "string") return row;
        const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        return String(rec.date || rec.iso || "");
      }).filter(Boolean)
    : [];
  return normalizeWorkingCalendar({
    timeZone: settings?.timeZone || "Asia/Kolkata",
    workingDays: days,
    workingHours: {
      openMinutes: parseMinutes(hours.open || hours.openMinutes || hours.start, 10 * 60),
      closeMinutes: parseMinutes(hours.close || hours.closeMinutes || hours.end, 19 * 60),
    },
    holidays,
    versionNumber: settings?.versionNumber ?? 1,
    calendarId: settings?.id ?? null,
  });
}

const CONTACT_OUTCOMES = new Set([
  "connected",
  "call_attempted_no_response",
  "appointment_scheduled",
  "customer_requested_callback",
]);

export async function requestTalkToExpert(input: {
  organizationId: string;
  opportunityId: string;
  actorUserId?: string | null;
}) {
  const existing = await prisma.compassHomeLoanAssessment.findUnique({
    where: { opportunityId: input.opportunityId },
  });
  if (existing?.expertRequestId && existing.expertRequestedAt) {
    const calendar = await loadOrganizationWorkingCalendar(input.organizationId);
    const sla = calculateOneWorkingHourSla({
      requestedAt: existing.expertRequestedAt,
      calendar,
      contactedAt: existing.expertContactedAt,
    });
    return {
      idempotent: true,
      expertRequestId: existing.expertRequestId,
      sla,
      borrowerCopy: borrowerSlaCopy(sla.state, sla.queuedUntilOpen),
    };
  }

  const calendar = await loadOrganizationWorkingCalendar(input.organizationId);
  const requestedAt = new Date();
  const deadline = addWorkingMinutes(requestedAt, 60, calendar);
  const expertRequestId = `exp_${createHash("sha256").update(input.opportunityId).digest("hex").slice(0, 20)}`;

  const opportunity = await prisma.enterpriseOpportunity.findFirst({
    where: { id: input.opportunityId, organizationId: input.organizationId },
  });
  const assignee = opportunity?.relationshipManagerUserId || opportunity?.primaryOwnerUserId || "unassigned";

  const autoRuleId = `compass-talk-to-expert:${input.opportunityId}`;
  const existingTask = listEteTasks().find(
    (row) => row.autoRuleId === autoRuleId && row.status !== "cancelled",
  );
  const task =
    existingTask ??
    registerEteTask({
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      category: "workflow",
      assigneeRef: assignee,
      createdBy: input.actorUserId || "compass-customer-gateway",
      opportunityRef: opportunity?.opportunityNumber,
      contactId: opportunity?.primaryContactId ?? undefined,
      entityKind: "Opportunity",
      entityId: input.opportunityId,
      entityLabel: opportunity?.opportunityNumber,
      borrowerName: opportunity?.primaryContactName ?? undefined,
      loanProduct: opportunity?.productLabel ?? undefined,
      workType: "Customer Call",
      predefinedDescription: "Call Customer",
      title: "Talk to an Expert — Home Loan",
      description: "Urgent COMPASS Talk to an Expert follow-up. One organisational working hour SLA.",
      priority: "critical",
      dueOn: deadline.toISOString(),
      autoRuleId,
      systemGenerated: true,
    });

  const assessment = await prisma.compassHomeLoanAssessment.upsert({
    where: { opportunityId: input.opportunityId },
    create: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      journeyKind: "home_loan",
      journeyStatus: "expert_requested",
      calculationVersion: "hl-bt-engine-v1",
      expertRequestId,
      expertRequestedAt: requestedAt,
      expertDeadlineAt: deadline,
      expertSlaState: "working_sla_active",
      assignedUserId: assignee === "unassigned" ? null : assignee,
      assignedTaskId: task.id,
      calendarVersionNumber: calendar.versionNumber,
    },
    update: {
      expertRequestId,
      expertRequestedAt: requestedAt,
      expertDeadlineAt: deadline,
      expertSlaState: "working_sla_active",
      assignedUserId: assignee === "unassigned" ? null : assignee,
      assignedTaskId: task.id,
      calendarVersionNumber: calendar.versionNumber,
      journeyStatus: "expert_requested",
    },
  });

  await prisma.compassExpertSlaEvent.create({
    data: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      assessmentId: assessment.id,
      eventKind: "expert_requested",
      payloadJson: {
        expertRequestId,
        requestedAt: requestedAt.toISOString(),
        deadlineAt: deadline.toISOString(),
        calendarVersionNumber: calendar.versionNumber,
        calendarId: calendar.calendarId,
      },
      actorUserId: input.actorUserId ?? null,
    },
  });

  await enterpriseActivityService.emitBestEffort({
    eventKind: EAR_EVENT_KINDS.WORKFLOW,
    sourceSystem: EAR_SOURCE_SYSTEMS.OPPORTUNITY,
    sourceEventId: `compass-expert:${expertRequestId}`,
    title: "requested Talk to an Expert",
    summary: `COMPASS Talk to an Expert for ${opportunity?.opportunityNumber ?? input.opportunityId}.`,
    payload: { expertRequestId, slaDeadline: deadline.toISOString() },
    opportunityId: input.opportunityId,
    contactId: opportunity?.primaryContactId,
    actorName: "COMPASS Customer",
  });

  const sla = calculateOneWorkingHourSla({ requestedAt, calendar });
  const { stampCompassDesk } = await import("./compass-hl-bt-assessment.service");
  await stampCompassDesk(input.opportunityId, {
    expertSlaState: sla.state,
    expertRequestedAt: requestedAt.toISOString(),
    expertDeadlineAt: deadline.toISOString(),
    assignedUserId: assignee === "unassigned" ? null : assignee,
  });
  return {
    idempotent: false,
    expertRequestId,
    sla,
    borrowerCopy: borrowerSlaCopy(sla.state, sla.queuedUntilOpen),
    requestIdNonce: randomUUID(),
  };
}

export async function completeExpertContact(input: {
  organizationId: string;
  opportunityId: string;
  outcome: string;
  actorUserId: string;
}) {
  if (!CONTACT_OUTCOMES.has(input.outcome)) {
    throw new Error("Invalid expert contact outcome.");
  }
  const assessment = await prisma.compassHomeLoanAssessment.findUnique({
    where: { opportunityId: input.opportunityId },
  });
  if (!assessment?.expertRequestedAt) {
    throw new Error("No expert request is open for this Opportunity.");
  }
  if (assessment.expertContactedAt) {
    return assessment;
  }
  const calendar = await loadOrganizationWorkingCalendar(input.organizationId);
  const sla = calculateOneWorkingHourSla({
    requestedAt: assessment.expertRequestedAt,
    calendar,
    contactedAt: new Date(),
  });
  const updated = await prisma.compassHomeLoanAssessment.update({
    where: { id: assessment.id },
    data: {
      expertContactedAt: new Date(),
      expertContactOutcome: input.outcome,
      expertSlaState: sla.state,
    },
  });
  await prisma.compassExpertSlaEvent.create({
    data: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      assessmentId: assessment.id,
      eventKind: "contact_recorded",
      payloadJson: { outcome: input.outcome, slaState: sla.state },
      actorUserId: input.actorUserId,
    },
  });
  return updated;
}

export async function projectExpertSla(opportunityId: string) {
  const assessment = await prisma.compassHomeLoanAssessment.findUnique({
    where: { opportunityId },
  });
  if (!assessment?.expertRequestedAt) return null;
  const calendar = await loadOrganizationWorkingCalendar(assessment.organizationId);
  return calculateOneWorkingHourSla({
    requestedAt: assessment.expertRequestedAt,
    calendar,
    contactedAt: assessment.expertContactedAt,
  });
}
