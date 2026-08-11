import { writeFileSync } from "node:fs";
import { runEaiSarathiConversationTurn } from "../src/lib/enterprise-ai-platform/conversation-experience/index.ts";

async function sample(label: string, turns: string[], emitLast = false) {
  let c: Awaited<ReturnType<typeof runEaiSarathiConversationTurn>>["continuity"] | undefined;
  const rows = [];
  for (let i = 0; i < turns.length; i++) {
    const u = turns[i]!;
    const r = await runEaiSarathiConversationTurn({
      utterance: u,
      continuity: c,
      emitActionProposals: emitLast && i === turns.length - 1,
    });
    c = r.continuity;
    rows.push({
      user: u,
      facing: r.facingText,
      blocked: r.blocked,
      conf: r.consultationSnapshot?.consultationConfidence,
      ready: r.consultationSnapshot?.readyForSummary,
      milestones: r.consultationSnapshot?.confidenceMilestones,
      proposals: r.actionProposals.map((p) => ({ kind: p.kind, title: p.title })),
      plannerQ: r.consultationSnapshot?.plannerNextQuestion,
    });
  }
  return { label, rows };
}

const out = [];
out.push(
  await sample("HL-first", [
    "I want to buy my first home",
    "I am salaried in Mumbai",
    "Looking for about 60 lakh",
    "Property is around 80 lakh",
  ]),
);
out.push(await sample("outside-cricket", ["Who will win the cricket match tomorrow?"]));
out.push(await sample("outside-politics", ["What do you think about the election?"]));
out.push(
  await sample("LAP", [
    "I need a Loan Against Property",
    "Business expansion",
    "Residential property",
    "About 50 lakh",
  ]),
);
out.push(
  await sample(
    "BT-emit",
    [
      "I want a Balance Transfer to reduce my EMI",
      "Current bank is HDFC",
      "Outstanding about 25 lakh",
      "I am salaried",
    ],
    true,
  ),
);

writeFileSync(
  "docs/co-sarathi-poat-001/_live-samples.json",
  JSON.stringify(out, null, 2),
  "utf8",
);
console.log("wrote samples", out.length);
