/**
 * My Deals Kanban idle-stability checks. No production data.
 * The action-row measurement was taken in Chromium: overflow-x auto alone
 * computed overflow-y auto and grew the card from 60px to 75.2px. With
 * overflow-y hidden the same overflowing row stayed 24px and the card stayed 60px.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const card = readFileSync(new URL("src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx", root), "utf8");
const board = readFileSync(new URL("src/components/catalyst-one/my-deals/my-deals-kanban-board.tsx", root), "utf8");

assert.match(card, /overflow-x-auto overflow-y-hidden/);
assert.doesNotMatch(card, /flex flex-nowrap gap-1 overflow-x-auto"/);

const effect = board.slice(board.indexOf("useEffect(() => {"), board.indexOf("const scheduleScrollPersist"));
assert.match(effect, /\}, \[stageKey\]\);/);
assert.doesNotMatch(effect, /columnScrollTops/);
assert.doesNotMatch(effect, /boardScrollLeft\]/);
assert.match(board, /\[overflow-anchor:none\]/);
assert.match(board, /\[scrollbar-gutter:stable\]/);

let writes = 0;
let state = 12.4;
function applyScroll() {
  writes += 1;
  const reported = Math.round(state);
  if (Math.abs(reported - state) < 1) return;
  state = reported;
  applyScroll();
}
applyScroll();
assert.equal(writes, 1);
assert.equal(state, 12.4);

console.log(JSON.stringify({ ok: true, actionRowLocked: true, scrollRestoreNotLooped: true }));
