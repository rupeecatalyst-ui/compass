import { notFound } from "next/navigation";
import { MissionControlWorkspaceScaffold } from "@/mission-control/app";
import { listMissionControlNavModules } from "@/mission-control/feature-registry";

/** Routes owned by dedicated App Router pages (not the dynamic scaffold). */
const DEDICATED_SLUGS = new Set(["executive-briefing", "situation-room", "alert-center"]);

const MODULE_SLUGS = listMissionControlNavModules()
  .map((m) => m.route.replace(/^\/mission-control\/?/, "") || "dashboard")
  .filter((slug) => slug && slug !== "dashboard" && !DEDICATED_SLUGS.has(slug));

type PageProps = {
  params: Promise<{ module: string }>;
};

export function generateStaticParams() {
  return MODULE_SLUGS.map((module) => ({ module }));
}

export default async function MissionControlModulePage({ params }: PageProps) {
  const { module: slug } = await params;

  if (DEDICATED_SLUGS.has(slug)) notFound();

  const feature = listMissionControlNavModules().find((m) => {
    const path = m.route.replace(/^\/mission-control\/?/, "");
    return path === slug;
  });

  if (!feature) notFound();

  return (
    <MissionControlWorkspaceScaffold
      title={feature.displayName}
      description={
        feature.description ??
        `${feature.displayName} module scaffold. Status: ${feature.status}. Feature flag: ${feature.featureFlag}.`
      }
    />
  );
}
