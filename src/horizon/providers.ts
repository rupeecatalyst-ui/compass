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
  return [
    {
      id: "init-branch-west",
      name: "West Region Branch Opening",
      description: "Strategic initiative to open a new branch in the west region.",
      owner: "Placeholder Owner",
      priority: "high",
      category: "Business Expansion",
      status: "active",
      health: "on_track",
      progress: 38,
      startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
      targetDate: new Date(Date.now() + 120 * 86400000).toISOString(),
      tags: ["branch", "expansion", "fy26"],
      notes: "Sequence facilities before hiring ramp.",
      workstreams: sampleWorkstreams(),
    },
    {
      id: "init-product-suite",
      name: "Product Suite Refresh",
      description: "Multi-quarter product development roadmap.",
      owner: "Placeholder PM",
      priority: "critical",
      category: "Product Development",
      status: "active",
      health: "at_risk",
      progress: 22,
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      targetDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      tags: ["product", "roadmap"],
      notes: "Clarify success criteria before engineering commitment.",
      workstreams: [
        {
          id: "ws-discovery",
          name: "Discovery",
          owner: "Placeholder Research",
          health: "at_risk",
          progress: 55,
          milestoneCount: 1,
          status: "active",
          milestones: [
            {
              id: "ms-research",
              name: "Research synthesis",
              description: "Consolidate stakeholder interviews into actionable themes.",
              status: "active",
              progress: 70,
              targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
              activities: [
                {
                  id: "act-interviews",
                  title: "Complete stakeholder interviews",
                  description: "Finish remaining discovery conversations.",
                  assignedTo: "Placeholder Research",
                  priority: "high",
                  status: "active",
                  completion: 85,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "init-compliance",
      name: "Compliance Initiative FY26",
      description: "Organizational compliance uplift across operating units.",
      owner: "Placeholder Compliance",
      priority: "high",
      category: "Compliance Programs",
      status: "planned",
      health: "unknown",
      progress: 8,
      targetDate: new Date(Date.now() + 200 * 86400000).toISOString(),
      tags: ["compliance", "fy26"],
      workstreams: [],
    },
    {
      id: "init-tech-roadmap",
      name: "Technology Roadmap FY26",
      description: "Platform and infrastructure strategic roadmap.",
      owner: "Placeholder CTO Office",
      priority: "medium",
      category: "Technology Roadmaps",
      status: "active",
      health: "on_track",
      progress: 15,
      startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      targetDate: new Date(Date.now() + 240 * 86400000).toISOString(),
      tags: ["technology", "platform"],
      workstreams: [],
    },
  ];
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
      return [
        {
          id: "ms-local-permit",
          title: "Local permits secured",
          initiativeTitle: "West Region Branch Opening",
          targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          health: "at_risk",
          progress: 30,
        },
        {
          id: "ms-lease",
          title: "Lease signed",
          initiativeTitle: "West Region Branch Opening",
          targetDate: new Date(Date.now() + 21 * 86400000).toISOString(),
          health: "on_track",
          progress: 45,
        },
        {
          id: "ms-research",
          title: "Research synthesis",
          initiativeTitle: "Product Suite Refresh",
          targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
          health: "at_risk",
          progress: 70,
        },
      ];
    },
  };
}

export function createActivityProvider(): ActivityProvider {
  return {
    async listActivities() {
      return flattenActivities(sampleInitiatives());
    },
  };
}

export function createWaitingProvider(): WaitingProvider {
  return {
    async listWaitingItems() {
      return [
        {
          id: "wait-legal",
          title: "Lease redlines",
          waitingOn: "External counsel",
          since: new Date(Date.now() - 2 * 86400000).toISOString(),
          initiativeTitle: "West Region Branch Opening",
        },
        {
          id: "wait-finance",
          title: "Capex envelope confirmation",
          waitingOn: "Finance leadership",
          since: new Date(Date.now() - 5 * 86400000).toISOString(),
          initiativeTitle: "West Region Branch Opening",
        },
      ];
    },
  };
}

export function createParkingLotProvider(): ParkingLotProvider {
  return {
    async listParkingItems() {
      return [
        {
          id: "park-branding",
          title: "Branch brand kit variants",
          notes: "Parked pending creative capacity",
          parkedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          initiativeTitle: "West Region Branch Opening",
        },
        {
          id: "park-vendor",
          title: "Secondary vendor shortlist",
          parkedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          initiativeTitle: "Product Suite Refresh",
        },
      ];
    },
  };
}

export function createTodayProvider(): TodayProvider {
  return {
    async listTodayFocus() {
      return [
        {
          id: "focus-1",
          title: "Assemble permit packet",
          initiativeTitle: "West Region Branch Opening",
          kind: "activity",
          reason: "Unblocks local permit milestone",
        },
        {
          id: "focus-2",
          title: "Research synthesis",
          initiativeTitle: "Product Suite Refresh",
          kind: "milestone",
          reason: "At-risk milestone this week",
        },
      ];
    },
  };
}

export function createNotesProvider(): NotesProvider {
  return {
    async listNotes() {
      return [
        {
          id: "note-1",
          body: "Confirm west region launch sequencing with facilities before hiring ramp.",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          initiativeTitle: "West Region Branch Opening",
        },
        {
          id: "note-2",
          body: "Product discovery needs clearer success criteria before engineering commitment.",
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          initiativeTitle: "Product Suite Refresh",
        },
      ];
    },
  };
}

export function createHorizonWorkspaceProvider(): HorizonWorkspaceProvider {
  const portfolio = createPortfolioProvider();
  const initiatives = createInitiativeProvider();
  const waiting = createWaitingProvider();
  const parking = createParkingLotProvider();
  const today = createTodayProvider();
  const milestones = createMilestoneProvider();
  const notes = createNotesProvider();

  return {
    async getWorkspaceModel() {
      const [
        portfolioModel,
        hierarchy,
        initiativeList,
        waitingOn,
        parkingLot,
        todayFocus,
        upcoming,
        notesList,
      ] = await Promise.all([
        portfolio.getPortfolio(),
        initiatives.getHierarchy(),
        initiatives.listInitiatives(),
        waiting.listWaitingItems(),
        parking.listParkingItems(),
        today.listTodayFocus(),
        milestones.listUpcomingMilestones(),
        notes.listNotes(),
      ]);

      return {
        mode: "strategic",
        modes: [
          {
            id: "operational",
            label: "Operational Mode",
            description: "Near-term execution focus across active initiatives (UI only).",
          },
          {
            id: "strategic",
            label: "Strategic Mode",
            description: "Long-horizon portfolio and initiative planning (UI only).",
          },
        ],
        portfolio: portfolioModel,
        hierarchy: [...hierarchy],
        initiatives: [...initiativeList],
        todayFocus: [...todayFocus],
        upcomingMilestones: [...upcoming],
        waitingOn: [...waitingOn],
        parkingLot: [...parkingLot],
        recentProgress: [
          {
            id: "prog-1",
            title: "Survey photography uploaded",
            detail: "Placeholder progress entry for site survey workstream.",
            at: new Date(Date.now() - 6 * 3600000).toISOString(),
            initiativeTitle: "West Region Branch Opening",
          },
          {
            id: "prog-2",
            title: "Discovery interviews completed",
            detail: "Placeholder progress for product discovery.",
            at: new Date(Date.now() - 30 * 3600000).toISOString(),
            initiativeTitle: "Product Suite Refresh",
          },
        ] satisfies ProgressEntry[],
        notes: [...notesList],
      };
    },
  };
}
