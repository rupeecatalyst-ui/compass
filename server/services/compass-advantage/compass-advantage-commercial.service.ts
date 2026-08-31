import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import {
  buildApprovedInitialSchedule,
  COMPASS_ADVANTAGE_PRODUCT_OPTIONS,
  isInitialAdvantageProduct,
} from "@/constants/compass-advantage/approved-initial";
import { calculateAdvantageFromSchedule } from "@/lib/compass-advantage/calculate";
import { toCompassAdvantageDto } from "@/lib/compass-advantage/map-dto";
import { buildAdvantagePin, mergePinIntoSnapshot, pickEffectiveSchedule, pinAlreadySet } from "@/lib/compass-advantage/pin";
import { isScheduleEffectiveAt, validateScheduleForPublication } from "@/lib/compass-advantage/validate";
import type {
  CompassAdvantageCalculationResult,
  CompassAdvantagePin,
  CompassAdvantageRangeInput,
  CompassAdvantageScheduleInput,
  CompassAdvantageScheduleStatus,
  CompassAdvantageWorkspaceProductSummary,
} from "@/types/compass-advantage-commercial";
import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";
import { getCompassProductDefinition } from "@/constants/compass-customer-gateway/product-registry";

const ACTOR_SYSTEM = { userId: "system", label: "system" };

type Actor = { userId: string; label: string };

type ScheduleRecord = Prisma.CompassAdvantageScheduleGetPayload<{
  include: { ranges: { include: { fixedBenefits: true } } };
}>;

function decimalString(value: Prisma.Decimal | null | undefined): string | null {
  return value == null ? null : value.toString();
}

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "P2021" || code === "P2010" || code === "P2022";
}

function toScheduleInput(row: ScheduleRecord): CompassAdvantageScheduleInput {
  return {
    id: row.id,
    productCode: row.productCode,
    versionNumber: row.versionNumber,
    status: row.status,
    advantageActive: row.advantageActive,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    changeReason: row.changeReason,
    ranges: [...row.ranges]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((range) => ({
        id: range.id,
        rangeFromRupees: range.rangeFromRupees.toString(),
        rangeToRupees: decimalString(range.rangeToRupees),
        noUpperLimit: range.noUpperLimit,
        percentageRate: range.percentageRate.toString(),
        customerDescription: range.customerDescription,
        internalNote: range.internalNote,
        active: range.active,
        displayOrder: range.displayOrder,
        fixedBenefits: [...range.fixedBenefits]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((benefit) => ({
            id: benefit.id,
            name: benefit.name,
            amountRupees: benefit.amountRupees.toString(),
            active: benefit.active,
            displayOrder: benefit.displayOrder,
            customerDescription: benefit.customerDescription,
          })),
      })),
  };
}

async function writeAudit(input: {
  organizationId: string;
  scheduleId?: string | null;
  productCode?: string | null;
  versionNumber?: number | null;
  action: string;
  actor: Actor;
  reason?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
}): Promise<void> {
  try {
    await prisma.compassAdvantageAudit.create({
      data: {
        organizationId: input.organizationId,
        scheduleId: input.scheduleId ?? null,
        productCode: input.productCode ?? null,
        versionNumber: input.versionNumber ?? null,
        action: input.action,
        actorUserId: input.actor.userId,
        actorLabel: input.actor.label,
        reason: input.reason ?? null,
        beforeValue: input.beforeValue === undefined ? Prisma.JsonNull : (input.beforeValue as Prisma.InputJsonValue),
        afterValue: input.afterValue === undefined ? Prisma.JsonNull : (input.afterValue as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
  }
}

async function loadScheduleById(organizationId: string, scheduleId: string): Promise<ScheduleRecord | null> {
  return prisma.compassAdvantageSchedule.findFirst({
    where: { id: scheduleId, organizationId },
    include: { ranges: { include: { fixedBenefits: true } } },
  });
}

async function listSchedulesForProduct(
  organizationId: string,
  productCode: string,
): Promise<ScheduleRecord[]> {
  return prisma.compassAdvantageSchedule.findMany({
    where: { organizationId, productCode },
    include: { ranges: { include: { fixedBenefits: true } } },
    orderBy: [{ versionNumber: "desc" }],
  });
}

function rangeCreateData(range: CompassAdvantageRangeInput) {
  return {
    rangeFromRupees: range.rangeFromRupees,
    rangeToRupees: range.noUpperLimit ? null : range.rangeToRupees,
    noUpperLimit: range.noUpperLimit,
    percentageRate: range.percentageRate,
    customerDescription: range.customerDescription ?? null,
    internalNote: range.internalNote ?? null,
    active: range.active,
    displayOrder: range.displayOrder,
    fixedBenefits: {
      create: range.fixedBenefits.map((benefit) => ({
        name: benefit.name,
        amountRupees: benefit.amountRupees,
        active: benefit.active,
        displayOrder: benefit.displayOrder,
        customerDescription: benefit.customerDescription ?? null,
      })),
    },
  };
}

export async function listAdvantageProductSummaries(
  organizationId: string,
): Promise<CompassAdvantageWorkspaceProductSummary[]> {
  try {
    const rows = await prisma.compassAdvantageSchedule.findMany({
      where: { organizationId },
      orderBy: [{ productCode: "asc" }, { versionNumber: "desc" }],
    });
    return COMPASS_ADVANTAGE_PRODUCT_OPTIONS.map((product) => {
      const productRows = rows.filter((row) => row.productCode === product.code);
      const published = productRows.find((row) => row.status === "published" && !row.effectiveTo) ??
        productRows.find((row) => row.status === "published");
      const draft = productRows.find((row) => row.status === "draft");
      return {
        productCode: product.code,
        productLabel: product.label,
        advantageActive: published?.advantageActive ?? false,
        currentPublishedVersion: published?.versionNumber ?? null,
        currentPublishedStatus: (published?.status as CompassAdvantageScheduleStatus | undefined) ?? null,
        effectiveFrom: published?.effectiveFrom.toISOString() ?? null,
        draftVersion: draft?.versionNumber ?? null,
      };
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return COMPASS_ADVANTAGE_PRODUCT_OPTIONS.map((product) => ({
      productCode: product.code,
      productLabel: product.label,
      advantageActive: false,
      currentPublishedVersion: null,
      currentPublishedStatus: null,
      effectiveFrom: null,
      draftVersion: null,
    }));
  }
}

export async function getAdvantageWorkspace(organizationId: string, productCode: string) {
  const schedules = await listSchedulesForProduct(organizationId, productCode);
  const current = schedules.find((row) => row.status === "published" && !row.effectiveTo) ??
    schedules.find((row) => row.status === "published") ??
    schedules.find((row) => row.status === "draft") ??
    null;
  const draft = schedules.find((row) => row.status === "draft") ?? null;
  return {
    productCode,
    productLabel: COMPASS_ADVANTAGE_PRODUCT_OPTIONS.find((item) => item.code === productCode)?.label ?? productCode,
    current: current ? toScheduleInput(current) : null,
    draft: draft ? toScheduleInput(draft) : null,
    history: schedules.map(toScheduleInput),
  };
}

export async function createDraftVersion(input: {
  organizationId: string;
  productCode: string;
  copyFromScheduleId?: string | null;
  copyFromProductCode?: string | null;
  actor: Actor;
  reason?: string;
}): Promise<CompassAdvantageScheduleInput> {
  const existing = await listSchedulesForProduct(input.organizationId, input.productCode);
  if (existing.some((row) => row.status === "draft")) {
    throw Object.assign(new Error("A draft already exists for this product. Edit or publish it first."), {
      statusCode: 409,
      code: "DRAFT_EXISTS",
    });
  }
  const latestVersion = existing.reduce((max, row) => Math.max(max, row.versionNumber), 0);
  let source: ScheduleRecord | null = null;
  if (input.copyFromScheduleId) {
    source = await loadScheduleById(input.organizationId, input.copyFromScheduleId);
  } else if (input.copyFromProductCode) {
    const other = await listSchedulesForProduct(input.organizationId, input.copyFromProductCode);
    source =
      other.find((row) => row.status === "published" && !row.effectiveTo) ??
      other.find((row) => row.status === "published") ??
      other.find((row) => row.status === "draft") ??
      null;
  } else {
    source = existing.find((row) => row.status === "published") ?? existing[0] ?? null;
  }

  const created = await prisma.compassAdvantageSchedule.create({
    data: {
      organizationId: input.organizationId,
      productCode: input.productCode,
      versionNumber: latestVersion + 1,
      status: "draft",
      advantageActive: source?.advantageActive ?? true,
      effectiveFrom: new Date(),
      changeReason: input.reason ?? "New draft version",
      createdByUserId: input.actor.userId,
      ranges: source
        ? { create: toScheduleInput(source).ranges.map(rangeCreateData) }
        : undefined,
    },
    include: { ranges: { include: { fixedBenefits: true } } },
  });
  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: created.id,
    productCode: input.productCode,
    versionNumber: created.versionNumber,
    action: "new_version_created",
    actor: input.actor,
    reason: input.reason ?? "New draft version",
    afterValue: toScheduleInput(created),
  });
  return toScheduleInput(created);
}

export async function saveDraftSchedule(input: {
  organizationId: string;
  scheduleId: string;
  advantageActive: boolean;
  changeReason?: string | null;
  ranges: CompassAdvantageRangeInput[];
  actor: Actor;
}): Promise<CompassAdvantageScheduleInput> {
  const existing = await loadScheduleById(input.organizationId, input.scheduleId);
  if (!existing) {
    throw Object.assign(new Error("Schedule not found."), { statusCode: 404, code: "NOT_FOUND" });
  }
  if (existing.status !== "draft") {
    throw Object.assign(new Error("Published schedules are immutable. Create a new draft version."), {
      statusCode: 409,
      code: "PUBLISHED_IMMUTABLE",
    });
  }
  const before = toScheduleInput(existing);
  await prisma.compassAdvantageRange.deleteMany({ where: { scheduleId: existing.id } });
  const updated = await prisma.compassAdvantageSchedule.update({
    where: { id: existing.id },
    data: {
      advantageActive: input.advantageActive,
      changeReason: input.changeReason ?? existing.changeReason,
      ranges: { create: input.ranges.map(rangeCreateData) },
    },
    include: { ranges: { include: { fixedBenefits: true } } },
  });
  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: updated.id,
    productCode: updated.productCode,
    versionNumber: updated.versionNumber,
    action: "draft_modified",
    actor: input.actor,
    reason: input.changeReason ?? "Draft updated",
    beforeValue: before,
    afterValue: toScheduleInput(updated),
  });
  return toScheduleInput(updated);
}

export async function publishSchedule(input: {
  organizationId: string;
  scheduleId: string;
  effectiveFrom: Date;
  changeReason: string;
  actor: Actor;
}): Promise<CompassAdvantageScheduleInput> {
  const existing = await loadScheduleById(input.organizationId, input.scheduleId);
  if (!existing) {
    throw Object.assign(new Error("Schedule not found."), { statusCode: 404, code: "NOT_FOUND" });
  }
  if (existing.status !== "draft") {
    throw Object.assign(new Error("Only a draft can be published."), {
      statusCode: 409,
      code: "NOT_DRAFT",
    });
  }
  const candidate = {
    ...toScheduleInput(existing),
    status: "published" as const,
    effectiveFrom: input.effectiveFrom.toISOString(),
    changeReason: input.changeReason,
  };
  const validation = validateScheduleForPublication(candidate);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.errors.join(" ")), {
      statusCode: 400,
      code: "PUBLISH_VALIDATION_FAILED",
      details: validation,
    });
  }

  const siblings = await listSchedulesForProduct(input.organizationId, existing.productCode);
  const conflicting = siblings.filter((row) => {
    if (row.id === existing.id || row.status !== "published") return false;
    const asInput = toScheduleInput(row);
    return isScheduleEffectiveAt(asInput, input.effectiveFrom);
  });

  const published = await prisma.$transaction(async (tx) => {
    for (const row of conflicting) {
      await tx.compassAdvantageSchedule.update({
        where: { id: row.id },
        data: { effectiveTo: input.effectiveFrom },
      });
    }
    return tx.compassAdvantageSchedule.update({
      where: { id: existing.id },
      data: {
        status: "published",
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
        changeReason: input.changeReason,
        publishedByUserId: input.actor.userId,
        publishedAt: new Date(),
      },
      include: { ranges: { include: { fixedBenefits: true } } },
    });
  });

  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: published.id,
    productCode: published.productCode,
    versionNumber: published.versionNumber,
    action: "published",
    actor: input.actor,
    reason: input.changeReason,
    beforeValue: toScheduleInput(existing),
    afterValue: toScheduleInput(published),
  });
  return toScheduleInput(published);
}

export async function setScheduleLifecycle(input: {
  organizationId: string;
  scheduleId: string;
  status: "suspended" | "retired";
  reason: string;
  actor: Actor;
}): Promise<CompassAdvantageScheduleInput> {
  const existing = await loadScheduleById(input.organizationId, input.scheduleId);
  if (!existing) {
    throw Object.assign(new Error("Schedule not found."), { statusCode: 404, code: "NOT_FOUND" });
  }
  const updated = await prisma.compassAdvantageSchedule.update({
    where: { id: existing.id },
    data: { status: input.status, changeReason: input.reason },
    include: { ranges: { include: { fixedBenefits: true } } },
  });
  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: updated.id,
    productCode: updated.productCode,
    versionNumber: updated.versionNumber,
    action: input.status,
    actor: input.actor,
    reason: input.reason,
    beforeValue: toScheduleInput(existing),
    afterValue: toScheduleInput(updated),
  });
  return toScheduleInput(updated);
}

export async function setProductAdvantageActive(input: {
  organizationId: string;
  productCode: string;
  advantageActive: boolean;
  actor: Actor;
  reason?: string;
}): Promise<void> {
  const current = (await listSchedulesForProduct(input.organizationId, input.productCode)).find(
    (row) => row.status === "draft" || (row.status === "published" && !row.effectiveTo),
  );
  if (!current) {
    throw Object.assign(new Error("Create a draft or published schedule before toggling Advantage."), {
      statusCode: 404,
      code: "NO_SCHEDULE",
    });
  }
  if (current.status !== "draft") {
    throw Object.assign(new Error("Activation can be edited on a draft, then published."), {
      statusCode: 409,
      code: "PUBLISHED_IMMUTABLE",
    });
  }
  const before = toScheduleInput(current);
  const updated = await prisma.compassAdvantageSchedule.update({
    where: { id: current.id },
    data: { advantageActive: input.advantageActive },
    include: { ranges: { include: { fixedBenefits: true } } },
  });
  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: updated.id,
    productCode: updated.productCode,
    versionNumber: updated.versionNumber,
    action: input.advantageActive ? "product_activated" : "product_deactivated",
    actor: input.actor,
    reason: input.reason ?? (input.advantageActive ? "Advantage activated" : "Advantage deactivated"),
    beforeValue: before,
    afterValue: toScheduleInput(updated),
  });
}

export async function previewAdvantageCalculation(input: {
  organizationId: string;
  productCode: string;
  requestedLoanAmount: string;
  caseReceivedAt: Date;
  actor: Actor;
}): Promise<{
  result: CompassAdvantageCalculationResult;
  validationGaps: ReturnType<typeof validateScheduleForPublication>["uncoveredGaps"];
}> {
  const schedules = (await listSchedulesForProduct(input.organizationId, input.productCode)).map(toScheduleInput);
  const schedule = pickEffectiveSchedule(schedules, input.productCode, input.caseReceivedAt);
  const result = calculateWithProductPolicy({
    productCode: input.productCode,
    schedule,
    requestedLoanAmount: input.requestedLoanAmount,
  });
  await writeAudit({
    organizationId: input.organizationId,
    scheduleId: schedule?.id ?? null,
    productCode: input.productCode,
    versionNumber: schedule?.versionNumber ?? null,
    action: "preview",
    actor: input.actor,
    reason: "Administrative calculation preview",
    afterValue: {
      productCode: input.productCode,
      requestedLoanAmount: input.requestedLoanAmount,
      caseReceivedAt: input.caseReceivedAt.toISOString(),
      applies: result.applies,
      status: result.status,
      scheduleVersion: result.scheduleVersion,
    },
  });
  return {
    result,
    validationGaps: schedule ? validateScheduleForPublication(schedule).uncoveredGaps : [],
  };
}

export async function seedApprovedInitialSchedules(input: {
  organizationId: string;
  actor?: Actor;
  effectiveFrom?: Date;
}): Promise<{ created: string[] }> {
  const actor = input.actor ?? ACTOR_SYSTEM;
  const effectiveFrom = input.effectiveFrom ?? new Date("2026-01-01T00:00:00.000Z");
  const created: string[] = [];
  for (const productCode of ["HOME_LOAN", "HOME_LOAN_BT"] as const) {
    const existing = await prisma.compassAdvantageSchedule.findFirst({
      where: { organizationId: input.organizationId, productCode, versionNumber: 1 },
    });
    if (existing) continue;
    const draft = buildApprovedInitialSchedule(productCode);
    const row = await prisma.compassAdvantageSchedule.create({
      data: {
        organizationId: input.organizationId,
        productCode,
        versionNumber: 1,
        status: "published",
        advantageActive: true,
        effectiveFrom,
        changeReason: draft.changeReason,
        createdByUserId: actor.userId,
        publishedByUserId: actor.userId,
        publishedAt: effectiveFrom,
        ranges: { create: draft.ranges.map(rangeCreateData) },
      },
    });
    await writeAudit({
      organizationId: input.organizationId,
      scheduleId: row.id,
      productCode,
      versionNumber: 1,
      action: "configuration_created",
      actor,
      reason: draft.changeReason,
      afterValue: { productCode, versionNumber: 1, status: "published" },
    });
    created.push(row.id);
  }
  return { created };
}

export async function pinAdvantageOnOpportunity(input: {
  organizationId: string;
  opportunityId: string;
  productCode: string;
  caseReceivedAt: Date;
  snapshot: unknown;
}): Promise<{ snapshot: Record<string, unknown>; pin: CompassAdvantagePin }> {
  const existingPin = pinAlreadySet(input.snapshot);
  if (existingPin) {
    return {
      snapshot:
        input.snapshot && typeof input.snapshot === "object"
          ? { ...(input.snapshot as Record<string, unknown>) }
          : {},
      pin: existingPin,
    };
  }
  let schedule: CompassAdvantageScheduleInput | null = null;
  try {
    const rows = await listSchedulesForProduct(input.organizationId, input.productCode);
    schedule = pickEffectiveSchedule(rows.map(toScheduleInput), input.productCode, input.caseReceivedAt);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
  }
  const pin = buildAdvantagePin({
    productCode: input.productCode,
    caseReceivedAt: input.caseReceivedAt,
    schedule,
  });
  return { snapshot: mergePinIntoSnapshot(input.snapshot, pin), pin };
}

export async function resolveCompassAdvantageForOpportunity(input: {
  organizationId: string;
  opportunityId: string;
  opportunityReference: string;
  compassProductCode: CompassProductCode;
  requestedLoanAmount?: number | string | null;
  caseReceivedAt: Date;
  snapshot: unknown;
  persist: boolean;
}): Promise<CompassAdvantageDto> {
  const productCode = getCompassProductDefinition(input.compassProductCode).enterpriseProductCode;
  const amount =
    input.requestedLoanAmount == null || input.requestedLoanAmount === ""
      ? null
      : String(input.requestedLoanAmount);

  try {
    const existing = await prisma.compassAdvantageSnapshot.findUnique({
      where: { opportunityId: input.opportunityId },
    });
    if (existing) {
      return snapshotToDto(input.compassProductCode, existing);
    }

    const pin =
      pinAlreadySet(input.snapshot) ??
      (
        await pinAdvantageOnOpportunity({
          organizationId: input.organizationId,
          opportunityId: input.opportunityId,
          productCode,
          caseReceivedAt: input.caseReceivedAt,
          snapshot: input.snapshot,
        })
      ).pin;

    const result = await calculateForPin({
      organizationId: input.organizationId,
      productCode,
      pin,
      requestedLoanAmount: amount,
    });
    const dto = toCompassAdvantageDto(input.compassProductCode, result, {
      caseReceivedAt: pin.caseReceivedAt,
      calculatedAt: new Date().toISOString(),
    });

    if (input.persist && result.applies && result.totalAdvantageAmount) {
      await prisma.compassAdvantageSnapshot.create({
        data: {
          organizationId: input.organizationId,
          opportunityId: input.opportunityId,
          opportunityReference: input.opportunityReference,
          productCode,
          requestedLoanAmount: result.requestedLoanAmount ?? "0",
          matchedRangeFrom: result.matchedRange?.rangeFromRupees ?? null,
          matchedRangeTo: result.matchedRange?.rangeToRupees ?? null,
          matchedRangeNoUpperLimit: result.matchedRange?.noUpperLimit ?? false,
          percentageRate: result.percentageRate,
          percentageBenefitAmount: result.percentageBenefitAmount ?? "0",
          fixedBenefitComponents: result.fixedBenefitComponents,
          totalFixedBenefitAmount: result.totalFixedBenefitAmount ?? "0",
          totalAdvantageAmount: result.totalAdvantageAmount,
          currency: "INR",
          scheduleId: result.scheduleId,
          scheduleVersion: result.scheduleVersion,
          caseReceivedAt: new Date(pin.caseReceivedAt),
          calculatedAt: new Date(),
          effectiveTimestamp: result.effectiveFrom ? new Date(result.effectiveFrom) : new Date(pin.caseReceivedAt),
          customerExplanation: result.customerExplanation,
          calculationStatus: result.status,
        },
      });
    }
    return dto;
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const result = calculateWithProductPolicy({
      productCode,
      schedule: null,
      requestedLoanAmount: amount,
    });
    return toCompassAdvantageDto(input.compassProductCode, result, {
      caseReceivedAt: input.caseReceivedAt.toISOString(),
      calculatedAt: new Date().toISOString(),
    });
  }
}

async function calculateForPin(input: {
  organizationId: string;
  productCode: string;
  pin: CompassAdvantagePin;
  requestedLoanAmount: string | null;
}): Promise<CompassAdvantageCalculationResult> {
  if (input.pin.noScheduleAtCreate || !input.pin.scheduleId) {
    return calculateWithProductPolicy({
      productCode: input.productCode,
      schedule: null,
      requestedLoanAmount: input.requestedLoanAmount,
    });
  }
  const row = await loadScheduleById(input.organizationId, input.pin.scheduleId);
  if (!row) {
    return calculateWithProductPolicy({
      productCode: input.productCode,
      schedule: null,
      requestedLoanAmount: input.requestedLoanAmount,
    });
  }
  const schedule = toScheduleInput(row);
  return calculateAdvantageFromSchedule({
    schedule: { ...schedule, status: "published", advantageActive: true },
    productCode: input.productCode,
    requestedLoanAmount: input.requestedLoanAmount,
  });
}

function calculateWithProductPolicy(input: {
  productCode: string;
  schedule: CompassAdvantageScheduleInput | null;
  requestedLoanAmount: string | null;
}): CompassAdvantageCalculationResult {
  if (!input.schedule) {
    return calculateAdvantageFromSchedule({
      schedule: null,
      productCode: input.productCode,
      requestedLoanAmount: input.requestedLoanAmount,
      unavailableStatus: isInitialAdvantageProduct(input.productCode)
        ? "not_available"
        : "product_not_applicable",
      unavailableReason: isInitialAdvantageProduct(input.productCode)
        ? "not_available"
        : "product_not_applicable",
    });
  }
  return calculateAdvantageFromSchedule({
    schedule: input.schedule,
    productCode: input.productCode,
    requestedLoanAmount: input.requestedLoanAmount,
  });
}

function snapshotToDto(
  compassProductCode: CompassProductCode,
  row: Prisma.CompassAdvantageSnapshotGetPayload<object>,
): CompassAdvantageDto {
  const components = Array.isArray(row.fixedBenefitComponents)
    ? (row.fixedBenefitComponents as Array<{ name: string; amountRupees: string; customerDescription?: string | null }>)
    : [];
  const result: CompassAdvantageCalculationResult = {
    status: "ready",
    reason: "ready",
    applies: true,
    currency: "INR",
    productCode: row.productCode,
    requestedLoanAmount: row.requestedLoanAmount.toString(),
    matchedRange: {
      rangeFromRupees: row.matchedRangeFrom?.toString() ?? "0",
      rangeToRupees: row.matchedRangeTo?.toString() ?? null,
      noUpperLimit: row.matchedRangeNoUpperLimit,
      percentageRate: row.percentageRate?.toString() ?? "0",
      customerDescription: null,
      displayOrder: 0,
    },
    percentageRate: row.percentageRate?.toString() ?? null,
    percentageBenefitAmount: row.percentageBenefitAmount.toString(),
    fixedBenefitComponents: components.map((item) => ({
      name: item.name,
      amountRupees: item.amountRupees,
      customerDescription: item.customerDescription ?? null,
    })),
    totalFixedBenefitAmount: row.totalFixedBenefitAmount.toString(),
    totalAdvantageAmount: row.totalAdvantageAmount.toString(),
    customerExplanation: row.customerExplanation,
    scheduleId: row.scheduleId,
    scheduleVersion: row.scheduleVersion,
    effectiveFrom: row.effectiveTimestamp.toISOString(),
  };
  return toCompassAdvantageDto(compassProductCode, result, {
    caseReceivedAt: row.caseReceivedAt.toISOString(),
    calculatedAt: row.calculatedAt.toISOString(),
  });
}
