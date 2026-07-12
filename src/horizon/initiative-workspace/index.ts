/**
 * Horizon Initiative / Initiatives Workspace
 * Expandable hierarchy working area — UI architecture only.
 *
 * Future TODOs (not in this sprint):
 * - Persist inline edits via domain services
 * - Drag-and-drop reordering / reparenting
 * - Permission-aware edit modes
 * - Aggregate progress / health from children
 * - Link to documents, tasks, and dialogue
 * - AI assist (explicitly deferred)
 * - Database-backed providers
 */

export type * from "./types";
export {
  createInitiativeWorkspaceProvider,
  createHierarchyProvider,
  createProgressProvider,
  createHealthProvider,
} from "./providers";
export type {
  InitiativeWorkspaceProvider,
  HierarchyProvider,
  ProgressProvider,
  HealthProvider,
} from "./providers";
export * from "./components";
