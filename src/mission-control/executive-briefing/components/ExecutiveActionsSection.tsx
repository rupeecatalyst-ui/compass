"use client";

import type { ExecutiveActionsModel } from "../types";

function ActionColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2">
            <p className="text-[12px] font-medium leading-snug text-zinc-100">{item.title}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{item.meta}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExecutiveActionsSection({ model }: { model: ExecutiveActionsModel }) {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Executive Actions
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-100">
          What management should do next
        </h3>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ActionColumn
          title="Today's Priorities"
          items={model.priorities.map((p) => ({
            id: p.id,
            title: p.title,
            meta: p.urgency,
          }))}
        />
        <ActionColumn
          title="Pending Approvals"
          items={model.pendingApprovals.map((p) => ({
            id: p.id,
            title: p.title,
            meta: p.owner,
          }))}
        />
        <ActionColumn
          title="Critical Tasks"
          items={model.criticalTasks.map((p) => ({
            id: p.id,
            title: p.title,
            meta: `Due · ${p.due}`,
          }))}
        />
        <ActionColumn
          title="Meetings"
          items={model.meetings.map((p) => ({
            id: p.id,
            title: p.title,
            meta: p.when,
          }))}
        />
        <ActionColumn
          title="Recent Notifications"
          items={model.notifications.map((p) => ({
            id: p.id,
            title: p.title,
            meta: p.when,
          }))}
        />
      </div>
    </section>
  );
}
