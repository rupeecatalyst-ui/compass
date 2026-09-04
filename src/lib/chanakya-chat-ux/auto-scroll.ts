/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * UI-only scroll helpers. Does not touch streaming protocol.
 */

export function isChanakyaChatNearBottom(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
  thresholdPx = 96,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

export function restoreChanakyaChatScrollAnchor(
  el: { scrollHeight: number; scrollTop: number },
  previousScrollHeight: number,
): void {
  const delta = el.scrollHeight - previousScrollHeight;
  if (delta > 0) el.scrollTop += delta;
}
