import type { ReactNode } from "react";

export type EnterpriseGridColumnAlign = "left" | "center" | "right";

export interface EnterpriseGridColumnDef<T> {
  id: string;
  label: string;
  /** Default visibility */
  defaultVisible?: boolean;
  /** Default order (lower first) */
  defaultOrder?: number;
  /** Default width in px */
  defaultWidth?: number;
  /** Freeze to start of grid */
  frozen?: boolean;
  align?: EnterpriseGridColumnAlign;
  sortable?: boolean;
  minWidth?: number;
  render: (row: T) => ReactNode;
  /** Optional plain text for export */
  exportValue?: (row: T) => string;
}

export type EnterpriseGridViewScope = "default" | "personal" | "department";

export interface EnterpriseGridViewState {
  id: string;
  name: string;
  scope: EnterpriseGridViewScope;
  visibleColumnIds: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  frozenColumnIds: string[];
}

export interface EnterpriseGridPreferences {
  activeViewId: string;
  views: EnterpriseGridViewState[];
}
