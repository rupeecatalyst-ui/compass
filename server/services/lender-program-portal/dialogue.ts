/**
 * CO-LEND-001B — Durable program dialogue threads (ECH integration for portal).
 */
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

function createId() {
  return randomUUID().replace(/-/g, "");
}

export type ProgramDialogueParticipant = {
  kind: "lender_representative" | "relationship_manager" | "administrator" | "system";
  id?: string;
  name: string;
  email?: string;
  role?: string;
};

export type ProgramDialogueEventKind =
  | "submission_received"
  | "clarification_requested"
  | "additional_information_submitted"
  | "approved"
  | "rejected"
  | "published"
  | "version_updated"
  | "scheduled"
  | "internal_comment";

function formatWhen(d = new Date()): string {
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function buildSubmissionReceivedMessage(input: {
  submitterName: string;
  lenderName: string;
  designation?: string;
  productLabel: string;
  at?: Date;
}): { title: string; body: string } {
  const when = formatWhen(input.at);
  const desk = input.designation
    ? `${input.lenderName} - ${input.designation}`
    : input.lenderName;
  return {
    title: "Program submission received",
    body: `${input.submitterName} (${desk}) submitted an update for the ${input.productLabel} Program on ${when}. The submission is awaiting administrator review.`,
  };
}

export async function createProgramDialogueThread(input: {
  organizationId: string;
  lenderId: string;
  ecmContactId: string;
  subject: string;
  participants: ProgramDialogueParticipant[];
}) {
  return prisma.lenderProgramDialogueThread.create({
    data: {
      id: createId(),
      organizationId: input.organizationId,
      lenderId: input.lenderId,
      ecmContactId: input.ecmContactId,
      subject: input.subject,
      participants: input.participants as unknown as Prisma.InputJsonValue,
      status: "open",
    },
  });
}

export async function appendProgramDialogueMessage(input: {
  organizationId: string;
  threadId: string;
  eventKind: ProgramDialogueEventKind;
  title: string;
  body: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  payload?: Record<string, unknown>;
}) {
  return prisma.lenderProgramDialogueMessage.create({
    data: {
      id: createId(),
      organizationId: input.organizationId,
      threadId: input.threadId,
      eventKind: input.eventKind,
      title: input.title,
      body: input.body,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole ?? null,
      payload: (input.payload as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}

export async function listProgramDialogueMessages(threadId: string) {
  return prisma.lenderProgramDialogueMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
}

export function resolveAssignedRmParticipant(
  rmMapping: unknown,
): ProgramDialogueParticipant | null {
  if (!Array.isArray(rmMapping) || rmMapping.length === 0) return null;
  const first = rmMapping[0] as Record<string, unknown>;
  const name =
    (typeof first.name === "string" && first.name) ||
    (typeof first.rmName === "string" && first.rmName) ||
    (typeof first.displayName === "string" && first.displayName) ||
    null;
  if (!name) return null;
  return {
    kind: "relationship_manager",
    id:
      (typeof first.userId === "string" && first.userId) ||
      (typeof first.rmUserId === "string" && first.rmUserId) ||
      undefined,
    name,
    email: typeof first.email === "string" ? first.email : undefined,
    role: "Relationship Manager",
  };
}
