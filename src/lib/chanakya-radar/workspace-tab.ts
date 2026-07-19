/** Shared Radar / Kanban workspace tab — header + page stay in sync. */

export type ChanakyaRadarWorkspaceTab = "radar" | "kanban";

export const CHANAKYA_RADAR_WORKSPACE_TAB_EVENT = "compass:chanakya-radar-workspace-tab";
const STORAGE_KEY = "catalyst-one:chanakya-radar:workspace-tab";

function isTab(v: unknown): v is ChanakyaRadarWorkspaceTab {
  return v === "radar" || v === "kanban";
}

export function getChanakyaRadarWorkspaceTab(): ChanakyaRadarWorkspaceTab {
  if (typeof window === "undefined") return "radar";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTab(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "radar";
}

export function setChanakyaRadarWorkspaceTab(tab: ChanakyaRadarWorkspaceTab): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CHANAKYA_RADAR_WORKSPACE_TAB_EVENT, { detail: { tab } }),
  );
}

export function subscribeChanakyaRadarWorkspaceTab(
  listener: (tab: ChanakyaRadarWorkspaceTab) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = (e: Event) => {
    const tab = (e as CustomEvent<{ tab: ChanakyaRadarWorkspaceTab }>).detail?.tab;
    if (isTab(tab)) listener(tab);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && isTab(e.newValue)) listener(e.newValue);
  };
  window.addEventListener(CHANAKYA_RADAR_WORKSPACE_TAB_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANAKYA_RADAR_WORKSPACE_TAB_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
