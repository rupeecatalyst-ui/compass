export type DeskPopulation<T> = { items: T[]; loading: boolean; error: string | null };

function authorizationFailure(error: unknown): boolean {
  const e = error as { status?: number; statusCode?: number; code?: string; message?: string } | null;
  return e?.status === 401 || e?.status === 403 || e?.statusCode === 401 || e?.statusCode === 403 ||
    ["UNAUTHORIZED", "FORBIDDEN", "SESSION_EXPIRED", "TOKEN_EXPIRED", "EMPLOYEE_ACCESS_DENIED"].includes(e?.code || "") ||
    Boolean(e?.message?.startsWith("Authorization session changed during request"));
}

/** Each authorized result publishes independently; any access failure invalidates both. */
export async function loadDeskPopulations<D, O>(input: {
  loadDeals: () => Promise<D[]>;
  loadOpportunities: () => Promise<O[]>;
  isCurrent: () => boolean;
  onDeals: (state: DeskPopulation<D>) => void;
  onOpportunities: (state: DeskPopulation<O>) => void;
}): Promise<void> {
  let denied = false;
  const run = async <T>(load: () => Promise<T[]>, publish: (state: DeskPopulation<T>) => void) => {
    if (!input.isCurrent() || denied) return;
    publish({ items: [], loading: true, error: null });
    try {
      const items = await load();
      if (input.isCurrent() && !denied) publish({ items, loading: false, error: null });
    } catch (error) {
      if (!input.isCurrent() || denied) return;
      const message = error instanceof Error ? error.message : "Case Workbench could not refresh.";
      if (authorizationFailure(error)) {
        denied = true;
        const state = { items: [], loading: false, error: message };
        input.onDeals(state);
        input.onOpportunities(state);
      } else {
        publish({ items: [], loading: false, error: message });
      }
    }
  };
  await Promise.all([run(input.loadDeals, input.onDeals), run(input.loadOpportunities, input.onOpportunities)]);
}
