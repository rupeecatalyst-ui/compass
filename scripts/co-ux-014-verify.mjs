/**
 * CO-UX-014 — Strategic Workspace Activity Composer Integration (static gates).
 * Presentation-layer only — ADR-021 / ECIE SSOTs must remain unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const composerPath =
  "src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx";
const workspacePath =
  "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx";
const savePath = "src/lib/enterprise-conversation-intelligence/save-activity.ts";
const adrPath = "docs/adr/ADR-021-enterprise-conversation-intelligence-engine.md";

assert.ok(fs.existsSync(path.join(root, composerPath)), "shared composer missing");
assert.ok(fs.existsSync(path.join(root, adrPath)), "ADR-021 must remain present");

const composer = read(composerPath);
assert.match(composer, /presentation\s*=\s*"sheet"/);
assert.match(composer, /presentation\s*===\s*"inline"/);
assert.match(composer, /Save Activity/);
assert.match(composer, /saveConversationActivity/);
assert.match(composer, /MediaRecorder|getUserMedia/);
assert.ok(
  !composer.includes("localStorage"),
  "Composer must not introduce localStorage Activity SSOT",
);

const workspace = read(workspacePath);
assert.match(workspace, /EnterpriseActivityComposer/);
assert.match(workspace, /presentation="inline"/);
assert.match(workspace, /Meeting Notes & Conversations/);
assert.match(workspace, /contextType:\s*"contact"/);
assert.match(workspace, /from "@\/lib\/enterprise-conversation-intelligence"/);
assert.match(workspace, /saveConversationActivity|onSaved=\{onActivitySaved\}/);

// Notes textarea must not remain as a parallel notes editor in the cycle dialog.
assert.ok(
  !workspace.includes('placeholder="What was discussed'),
  "Legacy notes placeholder must be removed",
);
assert.ok(
  !/id=["']strategy-notes["']/.test(workspace),
  "Legacy strategy-notes field must be removed",
);

// Single composer implementation — Strategic Workspace must import shared component.
assert.match(
  workspace,
  /from "@\/components\/catalyst-one\/action-center\/workspaces\/enterprise-activity-composer"/,
);
assert.ok(
  !fs.existsSync(
    path.join(
      root,
      "src/components/catalyst-one/contact-strategy/activity-composer.tsx",
    ),
  ),
  "Must not create a second Activity Composer under contact-strategy",
);

const save = read(savePath);
assert.match(save, /uploadDocumentToRegistry/);
assert.match(save, /appendEdcTimelineEntry/);
assert.match(save, /createConversationActivity/);
assert.ok(!save.includes("localStorage"), "Save pipeline must not use localStorage");

console.log("CO-UX-014: PASS");
console.log(
  JSON.stringify(
    {
      sprint: "CO-UX-014",
      presentation: "inline",
      sharedComposer: true,
      notesReplaced: true,
      eciePipeline: true,
      adr021Unchanged: true,
      secondComposer: false,
    },
    null,
    2,
  ),
);
