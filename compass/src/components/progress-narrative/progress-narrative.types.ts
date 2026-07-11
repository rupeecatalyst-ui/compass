export type ProgressNarrativeStepStatus = "completed" | "active" | "pending";

export type ProgressNarrativeStep = {
  id: string;
  label: string;
  status: ProgressNarrativeStepStatus;
};

export interface ProgressNarrativeProps {
  headline: string;
  activeMessage: string;
  steps: ProgressNarrativeStep[];
  isComplete?: boolean;
  className?: string;
}
