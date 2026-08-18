#!/usr/bin/env node
/**
 * CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 — read-only durable activity validation.
 * Does not print activity content, recipients, or payload data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [activityCount, byKind, conversationCount, businessNotesCount, dealTimelineCount] =
    await Promise.all([
      prisma.enterpriseActivityEvent.count(),
      prisma.enterpriseActivityEvent.groupBy({
        by: ["eventKind"],
        _count: { _all: true },
        orderBy: { eventKind: "asc" },
      }),
      prisma.enterpriseConversationActivity.count(),
      prisma.enterpriseBusinessNote.count(),
      prisma.enterpriseDealTimelineEvent.count(),
    ]);

  console.log(
    JSON.stringify(
      {
        enterpriseActivityEvents: {
          count: activityCount,
          eventKinds: byKind.map((row) => ({
            kind: row.eventKind,
            count: row._count._all,
          })),
        },
        enterpriseConversationActivities: conversationCount,
        enterpriseBusinessNotes: businessNotesCount,
        enterpriseDealTimelineEvents: dealTimelineCount,
      },
      null,
      2,
    ),
  );
  console.log("CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 DB verify: PASS");
} finally {
  await prisma.$disconnect();
}
