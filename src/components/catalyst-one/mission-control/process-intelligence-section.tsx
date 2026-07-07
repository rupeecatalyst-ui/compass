"use client";

import { MissionSection, IntelGrid, IntelCell } from "@/components/catalyst-one/mission-control/mission-section";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import type { LoanFile } from "@/types/catalyst-one";
import type { ProcessIntel } from "@/lib/insights/mission-control";

export function ProcessIntelligenceSection({
  process,
  loan,
}: {
  process: ProcessIntel;
  loan: LoanFile;
}) {
  return (
    <MissionSection title="Process Intelligence" subtitle="Timeline, documents, tasks, and workflow completion">
      <IntelGrid cols={4}>
        <IntelCell label="Mission Timeline" value={`${process.timelineEvents} events`} sub={`${process.timelineCompletion}% complete`} />
        <IntelCell label="Documents" value={`${process.documentsCompletion}%`} />
        <IntelCell label="Tasks" value={`${process.tasksCompletion}%`} />
        <IntelCell label="Workflow" value={`${process.workflowCompletion}%`} accent="blue" />
        <IntelCell label="Participants" value={`${process.participantCount}`} />
        <IntelCell label="Loan Stage" value={STAGE_LABELS[loan.stage]} />
        <IntelCell label="Property Journey" value={process.propertyJourney} />
        <IntelCell label="RM" value={loan.relationshipManager} />
      </IntelGrid>
    </MissionSection>
  );
}
