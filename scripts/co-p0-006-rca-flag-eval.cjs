/**
 * CO-P0-006 RCA — evaluate primary-write flags the same way the app does (no secrets).
 */
const path = require("node:path");
const { readFileSync, existsSync } = require("node:fs");

function loadEnvFile(name) {
  const p = path.resolve(process.cwd(), name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function readExplicitFlag(...names) {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
  }
  return undefined;
}

function isEnterprisePersistencePrisma() {
  const raw =
    process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ??
    process.env.ENTERPRISE_PERSISTENCE_MODE;
  return String(raw || "").toLowerCase() === "prisma";
}

function readOperationalDealFlag(...names) {
  const explicit = readExplicitFlag(...names);
  if (explicit !== undefined) return explicit;
  return isEnterprisePersistencePrisma();
}

const report = {
  ENTERPRISE_PERSISTENCE_MODE: process.env.ENTERPRISE_PERSISTENCE_MODE ?? "<unset>",
  NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE:
    process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ?? "<unset>",
  DEAL_REGISTRY_PRIMARY_WRITE: process.env.DEAL_REGISTRY_PRIMARY_WRITE ?? "<unset>",
  NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE:
    process.env.NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE ?? "<unset>",
  DEAL_REGISTRY_API_ENABLED: process.env.DEAL_REGISTRY_API_ENABLED ?? "<unset>",
  NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED:
    process.env.NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED ?? "<unset>",
  DEAL_REGISTRY_DUAL_WRITE: process.env.DEAL_REGISTRY_DUAL_WRITE ?? "<unset>",
  NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE:
    process.env.NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE ?? "<unset>",
  resolved: {
    isEnterprisePersistencePrisma: isEnterprisePersistencePrisma(),
    isDealRegistryPrimaryWriteEnabled: readOperationalDealFlag(
      "NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE",
      "DEAL_REGISTRY_PRIMARY_WRITE",
    ),
    isDealRegistryApiEnabled: readOperationalDealFlag(
      "NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED",
      "DEAL_REGISTRY_API_ENABLED",
    ),
    isDealRegistryDualWriteEnabled: readOperationalDealFlag(
      "NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE",
      "DEAL_REGISTRY_DUAL_WRITE",
    ),
  },
  note:
    "Client bundles only see NEXT_PUBLIC_* (inlined at Next start). Server sees both.",
};

console.log(JSON.stringify(report, null, 2));
