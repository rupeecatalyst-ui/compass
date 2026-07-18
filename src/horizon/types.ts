/**
 * Horizon — Strategic Planning Workspace contracts.
 * Independent of Mission Control. Not operational LOS. Not classic PM.
 *
 * Frozen hierarchy (CO-SPRINT-091):
 * Initiative → Workstream → Milestone → Activity
 * No additional hierarchy levels.
 */

export type Health = "on_track" | "at_risk" | "blocked" | "completed" | "unknown";

export type Status =
  | "draft"
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "blocked";

export type Priority = "critical" | "high" | "medium" | "low";

export type ModeId = "operational" | "strategic";

/** Workspace mode contract (UI only — permissions later) */
export interface Mode {
  id: ModeId;
  label: string;
  description: string;
}

export type HorizonNodeKind = "initiative" | "workstream" | "milestone" | "activity";

/** Compact tree node — presentation only (frozen 4-level hierarchy). */
export interface HierarchyNodeModel {
  id: string;
  kind: HorizonNodeKind;
  title: string;
  progress?: number;
  health?: Health;
  status?: Status;
  children: HierarchyNodeModel[];
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
  completion: number;
  /** @deprecated Nesting beyond Activity is not part of the frozen hierarchy. */
  activities?: Activity[];
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  status: Status;
  progress: number;
  activities: Activity[];
  /** @deprecated Nesting beyond Milestone → Activity is frozen out. */
  milestones?: Milestone[];
}

export interface Workstream {
  id: string;
  name: string;
  owner?: string;
  health: Health;
  progress: number;
  milestoneCount: number;
  status: Status;
  milestones: Milestone[];
  /** @deprecated Nesting beyond Workstream → Milestone is frozen out. */
  workstreams?: Workstream[];
}

export interface Initiative {
  id: string;
  name: string;
  description: string;
  owner?: string;
  priority: Priority;
  category: string;
  status: Status;
  health: Health;
  progress: number;
  startDate?: string;
  targetDate?: string;
  tags: readonly string[];
  notes?: string;
  workstreams: Workstream[];
}

export interface Portfolio {
  id: string;
  name: string;
  summary: string;
  initiativeCount: number;
  onTrackCount: number;
  atRiskCount: number;
  blockedCount: number;
  asOf: string;
  initiatives: Initiative[];
}

export interface FocusItem {
  id: string;
  title: string;
  initiativeTitle: string;
  kind: HorizonNodeKind;
  reason: string;
}

export interface UpcomingMilestoneItem {
  id: string;
  title: string;
  initiativeTitle: string;
  targetDate: string;
  health: Health;
  progress: number;
}

export interface ParkingItem {
  id: string;
  title: string;
  notes?: string;
  parkedAt: string;
  initiativeTitle?: string;
}

export interface WaitingItem {
  id: string;
  title: string;
  waitingOn: string;
  since: string;
  initiativeTitle?: string;
}

export interface ProgressEntry {
  id: string;
  title: string;
  detail: string;
  at: string;
  initiativeTitle: string;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
  initiativeTitle?: string;
}

/** Selection target for same-page detail slide-over */
export interface HorizonSelection {
  id: string;
  kind: HorizonNodeKind;
  title: string;
  subtitle?: string;
}

export interface HorizonWorkspaceModel {
  mode: ModeId;
  modes: readonly Mode[];
  portfolio: Portfolio;
  hierarchy: HierarchyNodeModel[];
  initiatives: Initiative[];
  todayFocus: FocusItem[];
  upcomingMilestones: UpcomingMilestoneItem[];
  waitingOn: WaitingItem[];
  parkingLot: ParkingItem[];
  recentProgress: ProgressEntry[];
  notes: Note[];
}

/** @deprecated Prefer Health */
export type ProjectHealth = Health;
/** @deprecated Prefer Status */
export type ProjectStatus = Status;
/** @deprecated Prefer ModeId */
export type HorizonWorkspaceMode = ModeId;
/** @deprecated Prefer Initiative */
export type Project = Initiative;
