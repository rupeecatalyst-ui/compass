/**
 * CO-OPS-001 — Client-safe Build Information resolution (baked env + constants).
 */
import {
  BUILD_INFORMATION_APP_NAME,
  BUILD_INFORMATION_BUILD_NUMBER,
  BUILD_INFORMATION_WHATS_NEW,
} from "@/constants/build-information/whats-new";
import { siteConfig } from "@/config/site";
import type {
  BuildDeploymentEnvironment,
  BuildInformationPublic,
} from "@/types/build-information";
import { shortGitHash } from "@/types/build-information";

function readPublic(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** Map runtime signals → Local | Preview | Production (admin display). */
export function resolveBuildDeploymentEnvironment(): BuildDeploymentEnvironment {
  const explicit =
    readPublic("NEXT_PUBLIC_CATALYST_DEPLOYMENT_ENV") ??
    readPublic("CATALYST_DEPLOYMENT_ENV");
  if (explicit === "Local" || explicit === "Preview" || explicit === "Production") {
    return explicit;
  }

  const tier =
    readPublic("NEXT_PUBLIC_CATALYST_DEPLOYMENT_TIER") ??
    readPublic("CATALYST_DEPLOYMENT_TIER");
  if (tier === "production") return "Production";
  if (tier === "pilot") return "Preview";

  const vercelEnv = readPublic("NEXT_PUBLIC_VERCEL_ENV") ?? readPublic("VERCEL_ENV");
  if (vercelEnv === "production") return "Production";
  if (vercelEnv === "preview" || vercelEnv === "development") return "Preview";

  if (readPublic("VERCEL") === "1" || readPublic("NEXT_PUBLIC_VERCEL") === "1") {
    return "Preview";
  }

  return "Local";
}

export function resolveBuildInformationPublic(): BuildInformationPublic {
  const version =
    readPublic("NEXT_PUBLIC_APP_VERSION") ?? siteConfig.version ?? "0.0.0";
  const buildNumber =
    readPublic("NEXT_PUBLIC_BUILD_NUMBER") ?? BUILD_INFORMATION_BUILD_NUMBER;
  const fullSha =
    readPublic("NEXT_PUBLIC_GIT_COMMIT_SHA") ??
    readPublic("VERCEL_GIT_COMMIT_SHA") ??
    null;
  const branch =
    readPublic("NEXT_PUBLIC_GIT_BRANCH") ??
    readPublic("VERCEL_GIT_COMMIT_REF") ??
    null;
  const commitTs =
    readPublic("NEXT_PUBLIC_GIT_COMMIT_TIMESTAMP") ??
    readPublic("VERCEL_GIT_COMMIT_AUTHOR_DATE") ??
    null;
  const buildTs =
    readPublic("NEXT_PUBLIC_BUILD_TIMESTAMP") ?? null;
  const deployTs =
    readPublic("NEXT_PUBLIC_DEPLOYMENT_TIMESTAMP") ??
    buildTs;

  return {
    applicationName: BUILD_INFORMATION_APP_NAME,
    applicationVersion: version.startsWith("v") ? version : `v${version}`,
    buildNumber: buildNumber.startsWith("#") ? buildNumber : `#${buildNumber}`,
    gitBranch: branch,
    gitCommitHash: shortGitHash(fullSha),
    gitCommitTimestamp: commitTs,
    buildTimestamp: buildTs,
    deploymentTimestamp: deployTs,
    deploymentEnvironment: resolveBuildDeploymentEnvironment(),
    frontendVersion: version.startsWith("v") ? version : `v${version}`,
    backendVersion: version.startsWith("v") ? version : `v${version}`,
    apiVersion: version.startsWith("v") ? version : `v${version}`,
    environmentMode:
      readPublic("NODE_ENV") === "production" ? "production" : "development",
  };
}

export function getBuildWhatsNew() {
  return BUILD_INFORMATION_WHATS_NEW;
}
