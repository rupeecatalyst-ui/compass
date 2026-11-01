/**
 * One answer save runs at a time for each journey session.
 * Snapshots that have not started are replaced by the latest snapshot,
 * so a burst of identical full-snapshot saves cannot pile up.
 * The save already sent to the server is never cancelled.
 * A failed save rejects its own callers and still releases the next save.
 */
type SaveWaiter = {
  resolve: () => void;
  reject: (reason: unknown) => void;
};

type PendingSave = {
  execute: () => Promise<void>;
  waiters: SaveWaiter[];
};

const pendingBySession = new Map<string, PendingSave>();
const inflightBySession = new Map<string, Promise<void>>();

function pumpJourneyAnswerSave(sessionToken: string) {
  if (inflightBySession.has(sessionToken)) return;
  const pending = pendingBySession.get(sessionToken);
  if (!pending) return;
  pendingBySession.delete(sessionToken);
  const run = pending
    .execute()
    .then(() => {
      pending.waiters.forEach((waiter) => waiter.resolve());
    })
    .catch((reason: unknown) => {
      pending.waiters.forEach((waiter) => waiter.reject(reason));
    })
    .finally(() => {
      inflightBySession.delete(sessionToken);
      pumpJourneyAnswerSave(sessionToken);
    });
  inflightBySession.set(sessionToken, run);
}

export function enqueueJourneyAnswerSave(
  sessionToken: string,
  save: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject };
    const pending = pendingBySession.get(sessionToken);
    if (pending) {
      pending.execute = save;
      pending.waiters.push(waiter);
      return;
    }
    pendingBySession.set(sessionToken, { execute: save, waiters: [waiter] });
    pumpJourneyAnswerSave(sessionToken);
  });
}
