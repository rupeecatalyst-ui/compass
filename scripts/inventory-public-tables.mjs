import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function toNum(v) {
  return typeof v === "bigint" ? Number(v) : Number(v);
}

const tables = await p.$queryRawUnsafe(`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname
`);

const exact = {};
for (const t of tables) {
  const r = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table_name}"`,
  );
  exact[t.table_name] = toNum(r[0].c);
}

const fks = await p.$queryRawUnsafe(`
  SELECT
    tc.table_name AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY child_table, parent_table
`);

console.log(
  JSON.stringify(
    {
      tables: exact,
      foreignKeys: fks.map((f) => ({
        child_table: f.child_table,
        child_column: f.child_column,
        parent_table: f.parent_table,
        parent_column: f.parent_column,
        delete_rule: f.delete_rule,
      })),
    },
    null,
    2,
  ),
);
await p.$disconnect();
