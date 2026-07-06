/** Context preservation for nested workspaces (CRC-002). */

export interface CustomerWorkspaceContext {
  tab: string;
  scrollTop: number;
  completedProductFilter?: string | null;
}

const PREFIX = "compass:workspace:customer:";

export function saveCustomerWorkspaceContext(
  customerId: string,
  ctx: CustomerWorkspaceContext,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${PREFIX}${customerId}`, JSON.stringify(ctx));
}

export function loadCustomerWorkspaceContext(
  customerId: string,
): CustomerWorkspaceContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${customerId}`);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as CustomerWorkspaceContext;
    const tabMigrations: Record<string, string> = {
      "active-loans": "portfolio",
      "completed-loans": "portfolio",
    };
    if (tabMigrations[ctx.tab]) {
      ctx.tab = tabMigrations[ctx.tab]!;
    }
    return ctx;
  } catch {
    return null;
  }
}

export function clearCustomerWorkspaceContext(customerId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${PREFIX}${customerId}`);
}

/** Navigation stack for nested workspace drill-down (CRC-013). */
export interface WorkspaceNavFrame {
  customerId: string;
  context: CustomerWorkspaceContext;
  loanFileId?: string | null;
}

const STACK_KEY = "compass:workspace:nav-stack";

export function pushWorkspaceNav(frame: WorkspaceNavFrame): void {
  if (typeof window === "undefined") return;
  const stack = loadWorkspaceNavStack();
  stack.push(frame);
  sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
}

export function popWorkspaceNav(): WorkspaceNavFrame | null {
  if (typeof window === "undefined") return null;
  const stack = loadWorkspaceNavStack();
  const frame = stack.pop() ?? null;
  sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
  return frame;
}

export function loadWorkspaceNavStack(): WorkspaceNavFrame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkspaceNavFrame[];
  } catch {
    return [];
  }
}

export function clearWorkspaceNavStack(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STACK_KEY);
}
