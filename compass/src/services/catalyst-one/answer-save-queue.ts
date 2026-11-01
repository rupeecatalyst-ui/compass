/**
 * One answer save runs at a time for each journey session.
 * A later snapshot cannot be overwritten by an earlier response.
 * A failed save rejects its own caller and still releases the next save.
 */
const answerSaveTailBySession = new Map<string, Promise<void>>();

export function enqueueJourneyAnswerSave(
  sessionToken: string,
  save: () => Promise<void>,
): Promise<void> {
  const previous = answerSaveTailBySession.get(sessionToken) ?? Promise.resolve();
  const current = previous.then(save, save);
  const tail = current.then(
    () => undefined,
    () => undefined,
  );
  answerSaveTailBySession.set(sessionToken, tail);
  void tail.finally(() => {
    if (answerSaveTailBySession.get(sessionToken) === tail) {
      answerSaveTailBySession.delete(sessionToken);
    }
  });
  return current;
}
