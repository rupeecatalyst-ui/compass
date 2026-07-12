/**
 * Workspace page scaffold — no mock business data.
 */

export function MissionControlWorkspaceScaffold({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Mission Control
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{description}</p>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-6">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Workspace</p>
        <p className="mt-2 text-sm text-zinc-300">
          Foundation scaffold. Operational controls will land in subsequent Mission Control
          sprints. No mock business data is loaded here.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-zinc-500">
          <li>Shell, navigation, and status bar are persistent</li>
          <li>Feature Registry entries are pluggable</li>
          <li>Security Gateway / Session / Emergency / Audit are interface-ready</li>
        </ul>
      </div>
    </div>
  );
}
