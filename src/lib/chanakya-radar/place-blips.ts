/**
 * CO-SPRINT-107 — Ring-based opportunity placement for CHANAKYA Radar.
 * Colour = status · Ring/radius = stage ageing · Angle = layout only.
 */

import {
  CHANAKYA_RADAR_AGEING_RINGS,
  CHANAKYA_RADAR_PLACEMENT,
  CHANAKYA_RADAR_QUADRANTS,
  resolveChanakyaRadarAgeingRingIndex,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";

export interface ChanakyaRadarBlipPlacement {
  row: ChanakyaRadarDealRow;
  x: number;
  y: number;
  color: string;
  q: ChanakyaOperationalQuadrantId;
  ringIndex: number;
  radius: number;
  deg: number;
}

const CFG = CHANAKYA_RADAR_PLACEMENT;

function stageAgeDays(row: ChanakyaRadarDealRow): number {
  return Math.max(row.daysInStage, row.idleDays, 0);
}

/** Stable 0–1 hash from id (deterministic jitter). */
function unitHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function ringBandRadius(ringIndex: number): { mid: number; halfWidth: number } {
  const n = Math.max(1, CHANAKYA_RADAR_AGEING_RINGS.length);
  const span = CFG.outerRadius - CFG.innerRadius;
  const band = span / n;
  const mid = CFG.innerRadius + band * (ringIndex + 0.5);
  return { mid, halfWidth: band * 0.5 };
}

function polar(deg: number, r: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: CFG.centerX + r * Math.cos(rad),
    y: CFG.centerY + r * Math.sin(rad),
  };
}

/**
 * Place each opportunity on an ageing ring inside its status quadrant.
 * Collision resolution adjusts angle only — ring membership is preserved.
 */
export function placeChanakyaRadarBlips(
  rows: ChanakyaRadarDealRow[],
): ChanakyaRadarBlipPlacement[] {
  const byQ: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarDealRow[]> = {
    on_track: [],
    needs_attention: [],
    follow_up_required: [],
    at_risk: [],
  };
  for (const r of rows) byQ[r.quadrant].push(r);

  const placed: { x: number; y: number }[] = [];
  const result: ChanakyaRadarBlipPlacement[] = [];
  const minDist =
    rows.length >= CFG.denseCountThreshold ? CFG.minDistanceDense : CFG.minDistanceBase;

  const tooClose = (x: number, y: number) =>
    placed.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy < minDist * minDist;
    });

  for (const q of CHANAKYA_RADAR_QUADRANTS) {
    const list = byQ[q.id];
    if (list.length === 0) continue;

    const byRing = new Map<number, ChanakyaRadarDealRow[]>();
    for (const row of list) {
      const idx = resolveChanakyaRadarAgeingRingIndex(stageAgeDays(row));
      const bucket = byRing.get(idx) ?? [];
      bucket.push(row);
      byRing.set(idx, bucket);
    }

    const ringIndexes = [...byRing.keys()].sort((a, b) => a - b);
    for (const ringIndex of ringIndexes) {
      const ringRows = [...(byRing.get(ringIndex) ?? [])].sort((a, b) =>
        a.id.localeCompare(b.id),
      );
      const { mid, halfWidth } = ringBandRadius(ringIndex);
      const count = ringRows.length;
      const usableHalf = CFG.wedgeHalfDeg * 0.92;
      // Minimum angular spacing derived from chord ≈ minDist at this radius
      const minAngleDeg = Math.min(
        14,
        Math.max(2.5, (minDist / Math.max(mid, 1)) * (180 / Math.PI) * 1.15),
      );

      ringRows.forEach((row, i) => {
        const jitter =
          (unitHash(row.id) * 2 - 1) * CFG.radialJitterFraction * halfWidth * 2;
        const baseR = Math.min(
          CFG.outerRadius,
          Math.max(CFG.innerRadius, mid + jitter),
        );

        let t = count <= 1 ? 0.5 : (i + 0.5) / count;
        // Spread dense rings: alternate slight bias so arcs do not form
        if (count > 8) {
          t = (t + (i % 2 === 0 ? -0.015 : 0.015) + 1) % 1;
        }
        let deg = q.bearingDeg - usableHalf + t * usableHalf * 2;

        // Enforce min angular spacing vs already-placed peers in this ring/quadrant
        if (i > 0 && count > 1) {
          const prev = result[result.length - 1];
          if (prev && prev.q === q.id && prev.ringIndex === ringIndex) {
            const delta = Math.abs(deg - prev.deg);
            if (delta < minAngleDeg) {
              deg = prev.deg + minAngleDeg * (deg >= prev.deg ? 1 : -1);
              if (Math.abs(deg - q.bearingDeg) > usableHalf) {
                deg =
                  q.bearingDeg +
                  (deg > q.bearingDeg ? usableHalf : -usableHalf);
              }
            }
          }
        }

        let r = baseR;
        let { x, y } = polar(deg, r);
        let attempts = 0;
        while (tooClose(x, y) && attempts < CFG.maxCollisionAttempts) {
          const sign = attempts % 2 === 0 ? 1 : -1;
          deg += sign * CFG.collisionAngleStepDeg * (1 + Math.floor(attempts / 2) * 0.35);
          if (Math.abs(deg - q.bearingDeg) > usableHalf) {
            deg =
              q.bearingDeg -
              usableHalf +
              (((t + attempts * 0.11) % 1) * usableHalf * 2);
            // Keep ring: tiny inward/outward nudge only as last resort within band
            r = Math.min(
              CFG.outerRadius,
              Math.max(
                CFG.innerRadius,
                baseR + (attempts % 2 === 0 ? 0.6 : -0.6),
              ),
            );
          } else {
            r = baseR;
          }
          ({ x, y } = polar(deg, r));
          attempts += 1;
        }

        placed.push({ x, y });
        result.push({
          row,
          x,
          y,
          color: q.tone,
          q: q.id,
          ringIndex,
          radius: r,
          deg,
        });
      });
    }
  }

  return result;
}

/** Mid radii for drawing subtle ageing ring guides. */
export function chanakyaRadarRingGuideRadii(): number[] {
  return CHANAKYA_RADAR_AGEING_RINGS.map((_, i) => ringBandRadius(i).mid);
}
