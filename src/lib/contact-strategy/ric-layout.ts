/**
 * CO-FOUNDATION-010 — Automatic first-level radial layout for RIC.
 */

import type { RicContact, RicRelationship } from "./ric-types";

export interface RicLayoutNode {
  id: string;
  contact: RicContact;
  x: number;
  y: number;
  isCentre: boolean;
}

export interface RicLayoutEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const CENTRE_X = 420;
const CENTRE_Y = 280;
const RADIUS = 220;

export function buildRicRadialLayout(
  centre: RicContact,
  neighbours: RicContact[],
  edges: RicRelationship[],
): { nodes: RicLayoutNode[]; edges: RicLayoutEdge[] } {
  const nodes: RicLayoutNode[] = [
    {
      id: centre.id,
      contact: centre,
      x: CENTRE_X,
      y: CENTRE_Y,
      isCentre: true,
    },
  ];

  const n = Math.max(neighbours.length, 1);
  neighbours.forEach((contact, index) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    nodes.push({
      id: contact.id,
      contact,
      x: CENTRE_X + Math.cos(angle) * RADIUS,
      y: CENTRE_Y + Math.sin(angle) * RADIUS,
      isCentre: false,
    });
  });

  const layoutEdges: RicLayoutEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.fromId === centre.id ? e.fromId : e.toId === centre.id ? e.toId : e.fromId,
    target: e.fromId === centre.id ? e.toId : e.toId === centre.id ? e.fromId : e.toId,
    label: e.label,
  }));

  // Normalise so centre is always source for cleaner curves
  const normalised = layoutEdges.map((e) => {
    if (e.source === centre.id) return e;
    if (e.target === centre.id) {
      return { ...e, source: centre.id, target: e.source };
    }
    return e;
  });

  return { nodes, edges: normalised };
}
