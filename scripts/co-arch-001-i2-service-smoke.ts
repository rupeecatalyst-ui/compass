/**
 * Service-layer smoke for CO-ARCH-001-I2 (audit trail verification).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../server/lib/prisma";
import { referenceMasterService } from "../server/services/reference-master/reference-master.service";

function loadEnv(path: string, override = false) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(".env"));
loadEnv(resolve(".env.local"), true);

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.error("No SUPER_ADMIN for service smoke");
    process.exit(1);
  }

  const code = `i2-svc-${Date.now()}`;
  const created = await referenceMasterService.create(
    {
      domain: "city",
      code,
      label: "I2 Service Smoke City",
      createdBy: admin.id,
    },
    "I2 Verify",
  );

  const audit = await prisma.enterpriseRegistryAuditEntry.findFirst({
    where: {
      registryModule: "reference_master",
      entityId: created.id,
      action: "created",
    },
  });
  if (!audit) {
    console.error("Audit entry missing after service create");
    process.exit(1);
  }

  await referenceMasterService.softDelete(created.id, admin.id, "smoke cleanup", "I2 Verify");
  await prisma.enterpriseReferenceMaster.delete({ where: { id: created.id } });
  console.log("I2 service smoke OK");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
