/**
 * Horizon placeholder providers — mock strategic planning data only.
 * No database / Supabase / business logic in this sprint.
 */

import type {
  Activity,
  FocusItem,
  HierarchyNodeModel,
  HorizonWorkspaceModel,
  Initiative,
  Milestone,
  Note,
  ParkingItem,
  Portfolio,
  ProgressEntry,
  UpcomingMilestoneItem,
  WaitingItem,
  Workstream,
} from "./types";

export interface PortfolioProvider {
  getPortfolio(): Promise<Portfolio>;
}

export interface InitiativeProvider {
  listInitiatives(): Promise<readonly Initiative[]>;
  getHierarchy(): Promise<readonly HierarchyNodeModel[]>;
}

export interface WorkstreamProvider {
  listWorkstreams(): Promise<readonly Workstream[]>;
}

export interface MilestoneProvider {
  listMilestones(): Promise<readonly Milestone[]>;
  listUpcomingMilestones(): Promise<readonly UpcomingMilestoneItem[]>;
}

export interface ActivityProvider {
  listActivities(): Promise<readonly Activity[]>;
}

export interface WaitingProvider {
  listWaitingItems(): Promise<readonly WaitingItem[]>;
}

export interface ParkingLotProvider {
  listParkingItems(): Promise<readonly ParkingItem[]>;
}

export interface TodayProvider {
  listTodayFocus(): Promise<readonly FocusItem[]>;
}

export interface NotesProvider {
  listNotes(): Promise<readonly Note[]>;
}

export interface HorizonWorkspaceProvider {
  getWorkspaceModel(): Promise<HorizonWorkspaceModel>;
}

/** @deprecated Prefer InitiativeProvider */
export type ProjectProvider = InitiativeProvider;

function activityTree(): Activity[] {
  return [
    {
      id: "act-site-survey",
      title: "Complete site survey",
      description: "Capture site conditions and constraints for lease readiness.",
      assignedTo: "Placeholder Lead",
      priority: "high",
      status: "active",
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      completion: 60,
      activities: [
        {
          id: "act-survey-photos",
          title: "Capture site photography",
          description: "Exterior and interior reference set.",
          assignedTo: "Placeholder Ops",
          priority: "medium",
          status: "active",
          completion: 80,
        },
        {
          id: "act-survey-report",
          title: "Draft survey report",
          description: "Summarize findings for facilities and legal.",
          assignedTo: "Placeholder Ops",
          priority: "medium",
          status: "planned",
          completion: 20,
        },
      ],
    },
    {
      id: "act-landlord",
      title: "Finalize landlord terms",
      description: "Align commercial terms ahead of lease execution.",
      assignedTo: "Placeholder Legal",
      priority: "high",
      status: "planned",
      dueDate: new Date(Date.now() + 12 * 86400000).toISOString(),
      completion: 10,
    },
  ];
}

function sampleMilestones(): Milestone[] {
  return [
    {
      id: "ms-lease",
      name: "Lease signed",
      description: "Execute lease for west region branch location.",
      status: "active",
      progress: 45,
      targetDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      activities: activityTree(),
    },
    {
      id: "ms-fitout",
      name: "Fit-out complete",
      description: "Finish interior build-out and readiness checks.",
      status: "planned",
      progress: 0,
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      activities: [],
    },
  ];
}

function sampleWorkstreams(): Workstream[] {
  const milestones = sampleMilestones();
  return [
    {
      id: "ws-location",
      name: "Location & facilities",
      owner: "Placeholder Facilities",
      health: "on_track",
      progress: 40,
      milestoneCount: milestones.length,
      status: "active",
      milestones,
      workstreams: [
        {
          id: "ws-location-legal",
          name: "Legal & compliance",
          owner: "Placeholder Counsel",
          health: "at_risk",
          progress: 25,
          milestoneCount: 1,
          status: "active",
          milestones: [
            {
              id: "ms-local-permit",
              name: "Local permits secured",
              description: "Obtain municipal and zoning clearances.",
              status: "active",
              progress: 30,
              targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
              activities: [
                {
                  id: "act-permit-packet",
                  title: "Assemble permit packet",
                  description: "Compile drawings, affidavits, and fee schedule.",
                  assignedTo: "Placeholder Ops",
                  priority: "critical",
                  status: "active",
                  dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                  completion: 50,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "ws-hiring",
      name: "Hiring plan",
      owner: "Placeholder People",
      health: "unknown",
      progress: 5,
      milestoneCount: 0,
      status: "planned",
      milestones: [],
    },
  ];
}

function sampleInitiatives(): Initiative[] {
  // CO-ORG-004 — sample portfolio removed
  return [];
}

function flattenWorkstreams(initiatives: Initiative[]): Workstream[] {
  const rows: Workstream[] = [];
  const walk = (list: Workstream[]) => {
    for (const ws of list) {
      rows.push(ws);
      if (ws.workstreams?.length) walk(ws.workstreams);
    }
  };
  for (const init of initiatives) walk(init.workstreams);
  return rows;
}

function flattenMilestones(initiatives: Initiative[]): Milestone[] {
  const rows: Milestone[] = [];
  const walkWs = (list: Workstream[]) => {
    for (const ws of list) {
      rows.push(...ws.milestones);
      for (const ms of ws.milestones) {
        if (ms.milestones?.length) rows.push(...ms.milestones);
      }
      if (ws.workstreams?.length) walkWs(ws.workstreams);
    }
  };
  for (const init of initiatives) walkWs(init.workstreams);
  return rows;
}

function flattenActivities(initiatives: Initiative[]): Activity[] {
  const rows: Activity[] = [];
  const walkAct = (list: Activity[]) => {
    for (const act of list) {
      rows.push(act);
      if (act.activities?.length) walkAct(act.activities);
    }
  };
  for (const ms of flattenMilestones(initiatives)) walkAct(ms.activities);
  return rows;
}

function toHierarchy(initiatives: Initiative[]): HierarchyNodeModel[] {
  const mapActivity = (a: Activity): HierarchyNodeModel => ({
    id: a.id,
    kind: "activity",
    title: a.title,
    progress: a.completion,
    status: a.status,
    children: (a.activities ?? []).map(mapActivity),
  });

  const mapMilestone = (m: Milestone): HierarchyNodeModel => ({
    id: m.id,
    kind: "milestone",
    title: m.name,
    progress: m.progress,
    status: m.status,
    children: [
      ...(m.milestones ?? []).map(mapMilestone),
      ...m.activities.map(mapActivity),
    ],
  });

  const mapWorkstream = (w: Workstream): HierarchyNodeModel => ({
    id: w.id,
    kind: "workstream",
    title: w.name,
    progress: w.progress,
    health: w.health,
    status: w.status,
    children: [
      ...(w.workstreams ?? []).map(mapWorkstream),
      ...w.milestones.map(mapMilestone),
    ],
  });

  return initiatives.map((i) => ({
    id: i.id,
    kind: "initiative" as const,
    title: i.name,
    progress: i.progress,
    health: i.health,
    status: i.status,
    children: i.workstreams.map(mapWorkstream),
  }));
}

export function createPortfolioProvider(): PortfolioProvider {
  return {
    async getPortfolio() {
      const initiatives = sampleInitiatives();
      return {
        id: "portfolio-default",
        name: "Enterprise Strategic Portfolio",
        summary:
          "Placeholder portfolio across expansion, hiring, product, technology, and compliance initiatives.",
        initiativeCount: initiatives.length,
        onTrackCount: initiatives.filter((p) => p.health === "on_track").length,
        atRiskCount: initiatives.filter((p) => p.health === "at_risk").length,
        blockedCount: initiatives.filter((p) => p.health === "blocked").length,
        asOf: new Date().toISOString(),
        initiatives,
      };
    },
  };
}

export function createInitiativeProvider(): InitiativeProvider {
  return {
    async listInitiatives() {
      return sampleInitiatives();
    },
    async getHierarchy() {
      return toHierarchy(sampleInitiatives());
    },
  };
}

/** @deprecated Prefer createInitiativeProvider */
export const createProjectProvider = createInitiativeProvider;

export function createWorkstreamProvider(): WorkstreamProvider {
  return {
    async listWorkstreams() {
      return flattenWorkstreams(sampleInitiatives());
    },
  };
}

export function createMilestoneProvider(): MilestoneProvider {
  return {
    async listMilestones() {
      return flattenMilestones(sampleInitiatives());
    },
    async listUpcomingMilestones() {
      return [];
    },
  };
}

export function createActivityProvider(): ActivityProvider {
  return {
    async listActivities() {
      return [];
    },
  };
}

export function createWaitingProvider(): WaitingProvider {
  return {
    async listWaitingItems() {
      return [];
    },
  };
}

export function createParkingLotProvider(): ParkingLotProvider {
  return {
    async listParkingItems() {
      return [];
    },
  };
}

export function createTodayProvider(): TodayProvider {
  return {
    async listTodayFocus() {
      return [];
    },
  };
}

export function createNotesProvider(): NotesProvider {
  return {
    async listNotes() {
      return [];
    },
  };
}

export function createHorizonWorkspaceProvider(): HorizonWorkspaceProvider {
  // CO-ORG-004 — empty strategic portfolio until Horizon SSOT binds
  return {
    async getWorkspaceModel() {
      return {
        mode: "strategic",
        modes: [
          {
            id: "operational",
            label: "Operational Mode",
            description: "Near-term execution focus across active initiatives.",
          },
          {
            id: "strategic",
            label: "Strategic Mode",
            description: "Long-horizon portfolio and initiative planning.",
          },
        ],
        portfolio: {
          id: "portfolio-empty",
          name: "Enterprise Portfolio",
          summary:
            "Horizon portfolio awaits strategic planning SSOT. Sample initiatives removed (CO-ORG-004).",
          initiativeCount: 0,
          onTrackCount: 0,
          atRiskCount: 0,
          blockedCount: 0,
          asOf: new Date().toISOString(),
          initiatives: [],
        },
        hierarchy: [],
        initiatives: [],
        todayFocus: [],
        upcomingMilestones: [],
        waitingOn: [],
        parkingLot: [],
        recentProgress: [],
        notes: [],
      };
    },
  };
}
