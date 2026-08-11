import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const notes = await p.enterpriseBusinessNote.findMany({
  where: { body: { contains: "CO-WP-ACCESS-002" } },
  take: 10,
  orderBy: { createdAt: "desc" },
  select: { id: true, opportunityId: true, entityId: true, body: true, createdAt: true },
});
const recent = await p.enterpriseBusinessNote.findMany({
  take: 8,
  orderBy: { createdAt: "desc" },
  select: { id: true, opportunityId: true, entityKind: true, body: true, createdAt: true },
});
const ear = await p.enterpriseActivityEvent.findMany({
  where: { OR: [{ summary: { contains: "Referral view-only" } }, { payload: { path: ["body"], string_contains: "Referral" } }] },
  take: 5,
  orderBy: { createdAt: "desc" },
}).catch(() => []);
console.log(JSON.stringify({ notes, recent, earCount: ear.length }, null, 2));
await p.$disconnect();
