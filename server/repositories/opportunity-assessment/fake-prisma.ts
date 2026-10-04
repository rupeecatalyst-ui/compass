import type { OpportunityAssessmentPrismaSurface } from "./prisma-surface";

type AssessmentRow = Record<string, unknown>;

function cloneRows(rows: Map<string, AssessmentRow>) {
  return new Map([...rows.entries()].map(([id, row]) => [id, structuredClone(row)]));
}

function matchesWhere(row: AssessmentRow, where: Record<string, unknown> | undefined) {
  if (!where) return true;
  for (const [key, expected] of Object.entries(where)) {
    if (row[key] !== expected) return false;
  }
  return true;
}

function applyData(row: AssessmentRow, data: Record<string, unknown>) {
  const next = { ...row };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "increment" in (value as object)) {
      next[key] = Number(next[key] ?? 0) + Number((value as { increment: number }).increment);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function uniqueConflict(modelName: string, target: string[], constraint: string) {
  return { code: "P2002" as const, meta: { modelName, target, constraint } };
}

export class FakeOpportunityAssessmentPrisma implements OpportunityAssessmentPrismaSurface {
  assessments = new Map<string, AssessmentRow>();
  revisions = new Map<string, AssessmentRow>();
  runs = new Map<string, AssessmentRow>();
  lastThrown: unknown = null;
  failNextCreate: string | null = null;
  private ids: () => string;
  private clock: () => Date;

  constructor(ids: () => string = () => crypto.randomUUID(), clock: () => Date = () => new Date()) {
    this.ids = ids;
    this.clock = clock;
  }

  async $transaction<T>(fn: (tx: OpportunityAssessmentPrismaSurface) => Promise<T>): Promise<T> {
    const snapshot = {
      assessments: cloneRows(this.assessments),
      revisions: cloneRows(this.revisions),
      runs: cloneRows(this.runs),
    };
    try {
      return await fn(this);
    } catch (error) {
      this.assessments = snapshot.assessments;
      this.revisions = snapshot.revisions;
      this.runs = snapshot.runs;
      throw error;
    }
  }

  enterpriseOpportunityAssessment = this.delegate("assessments", {
    uniqueBy: (row) => [
      ["id", String(row.id)],
      ["opportunityId", String(row.opportunityId)],
    ],
    modelName: "EnterpriseOpportunityAssessment",
    constraints: {
      opportunityId: ["opportunity_id", "enterprise_opportunity_assessments_opportunity_id_key"],
      id: ["id", "enterprise_opportunity_assessments_pkey"],
    },
  });

  enterpriseOpportunityAssessmentRevision = this.delegate("revisions", {
    uniqueBy: (row) => [
      ["id", String(row.id)],
      ["assessmentId+revisionNumber", `${row.assessmentId}:${row.revisionNumber}`],
      ...(row.commandId ? [["organizationId+commandId", `${row.organizationId}:${row.commandId}`] as const] : []),
    ],
    modelName: "EnterpriseOpportunityAssessmentRevision",
    constraints: {
      "assessmentId+revisionNumber": ["revision_number", "eoar_assessment_revision_key"],
      "organizationId+commandId": ["command_id", "eoar_org_command_id_key"],
      id: ["id", "enterprise_opportunity_assessment_revisions_pkey"],
    },
  });

  enterpriseOpportunityAssessmentRecommendationRun = this.delegate("runs", {
    uniqueBy: (row) => [["id", String(row.id)]],
    modelName: "EnterpriseOpportunityAssessmentRecommendationRun",
    constraints: {
      id: ["id", "enterprise_opportunity_assessment_recommendation_runs_pkey"],
    },
  });

  throwRaw(message: string) {
    const error = new Error(message);
    this.lastThrown = error;
    throw error;
  }

  private store(kind: "assessments" | "revisions" | "runs") {
    return this[kind];
  }

  private delegate(
    kind: "assessments" | "revisions" | "runs",
    config: {
      uniqueBy: (row: AssessmentRow) => Array<readonly [string, string]>;
      modelName: string;
      constraints: Record<string, [string, string]>;
    },
  ) {
    return {
      findUnique: async (args: Record<string, unknown>) => {
        const where = (args.where ?? {}) as Record<string, unknown>;
        return [...this.store(kind).values()].find((row) => matchesWhere(row, where)) ?? null;
      },
      findFirst: async (args: Record<string, unknown>) => {
        const where = (args.where ?? {}) as Record<string, unknown>;
        return [...this.store(kind).values()].find((row) => matchesWhere(row, where)) ?? null;
      },
      findMany: async (args: Record<string, unknown>) => {
        const where = (args.where ?? {}) as Record<string, unknown>;
        const rows = [...this.store(kind).values()].filter((row) => matchesWhere(row, where));
        const orderBy = args.orderBy as { revisionNumber?: "asc" | "desc" } | undefined;
        if (orderBy?.revisionNumber === "asc") {
          rows.sort((a, b) => Number(a.revisionNumber) - Number(b.revisionNumber));
        }
        return rows;
      },
      create: async (args: Record<string, unknown>) => {
        if (this.failNextCreate) {
          const error = new Error(this.failNextCreate);
          this.failNextCreate = null;
          this.lastThrown = error;
          throw error;
        }
        const data = { ...(args.data as AssessmentRow) };
        if (!data.id) data.id = this.ids();
        if (!data.createdAt) data.createdAt = this.clock();
        if (!data.updatedAt) data.updatedAt = this.clock();
        for (const [key, token] of config.uniqueBy(data)) {
          const collision = [...this.store(kind).values()].some((existing) =>
            config.uniqueBy(existing).some(([existingKey, existingToken]) => existingKey === key && existingToken === token),
          );
          if (collision) {
            const [target, constraint] = config.constraints[key] ?? ["id", "pkey"];
            const error = uniqueConflict(config.modelName, [target], constraint);
            this.lastThrown = error;
            throw error;
          }
        }
        this.store(kind).set(String(data.id), structuredClone(data));
        return structuredClone(data);
      },
      updateMany: async (args: Record<string, unknown>) => {
        const where = (args.where ?? {}) as Record<string, unknown>;
        const data = (args.data ?? {}) as Record<string, unknown>;
        let count = 0;
        for (const [id, row] of this.store(kind)) {
          if (!matchesWhere(row, where)) continue;
          this.store(kind).set(id, applyData(row, data));
          count += 1;
        }
        return { count };
      },
    };
  }
}
