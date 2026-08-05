import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const nonDeleted = await p.enterpriseLender.count({ where: { isDeleted: false } });
const all = await p.enterpriseLender.findMany({ select: { tags: true, code: true } });
const tagged = all.filter(
  (r) => Array.isArray(r.tags) && (r.tags as unknown[]).includes("co-lr-010"),
).length;
const programs = await p.enterpriseLenderProgram.count({ where: { isDeleted: false } });
console.log(JSON.stringify({ nonDeleted, tagged, programs, totalRows: all.length }, null, 2));
await p.$disconnect();
