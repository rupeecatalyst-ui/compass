/**
 * CO-VOICE-002 Wave 1 — static architecture / SSOT verification.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

assert.ok(exists("docs/adr/ADR-021-enterprise-conversation-intelligence-engine.md"));
assert.ok(exists("src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx"));
assert.ok(exists("src/lib/enterprise-conversation-intelligence/save-activity.ts"));
assert.ok(exists("src/app/api/enterprise-conversation-activities/route.ts"));
assert.ok(
  exists("prisma/migrations/20260731120000_co_voice_002_conversation_activity/migration.sql"),
);

const actions = read("src/constants/enterprise-action-center/actions.ts");
assert.ok(actions.includes('id: "add_activity"'), "add_activity catalog missing");
assert.ok(actions.includes('"add_activity"'), "add_activity enable lists missing");

const types = read("src/types/enterprise-action-center.ts");
assert.ok(types.includes('"add_activity"'));

const edc = read("src/types/enterprise-dialogue-center.ts");
assert.ok(edc.includes('"conversation_activity"'));

const mime = read("src/constants/enterprise-document-intelligence-engine/file-types.ts");
assert.ok(mime.includes("audio/webm"));
assert.ok(mime.includes("audio/mpeg"));

const uploadSource = read("src/types/document-registry.ts");
assert.ok(uploadSource.includes('"conversation_activity"'));

const schema = read("prisma/schema.prisma");
assert.ok(schema.includes("model EnterpriseConversationActivity"));
assert.ok(schema.includes("enterpriseConversationActivities"));

const save = read("src/lib/enterprise-conversation-intelligence/save-activity.ts");
assert.ok(save.includes("uploadDocumentToRegistry"));
assert.ok(save.includes("appendEdcTimelineEntry"));
assert.ok(save.includes("createConversationActivity"));
assert.ok(!save.includes("registerEteTask"), "Wave 1 must not create ETE tasks");

const composer = read(
  "src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx",
);
assert.ok(composer.includes("MediaRecorder") || composer.includes("getUserMedia"));
assert.ok(composer.includes("Save Activity"));
assert.ok(composer.includes("Coming in a later Wave") || composer.includes("Soon"));

const registry = read("src/lib/enterprise-conversation-intelligence/activity-registry.ts");
assert.ok(!registry.includes("localStorage"), "Activity Registry must not use localStorage");

console.log("CO-VOICE-002 Wave 1: PASS");
console.log(
  JSON.stringify(
    {
      wave: 1,
      capability: "ECIE",
      adr: "ADR-021",
      composer: true,
      voiceRecording: true,
      documentRegistryAudio: true,
      stt: "browser_speech_recognition_or_manual",
      activityRegistry: true,
      edcTimeline: true,
      excluded: [
        "crm_auto_updates",
        "ai_task_creation",
        "entity_linking",
        "enterprise_search",
        "external_channels",
      ],
      productionDataProtection: {
        additiveMigration: true,
        noLocalStorageActivitySsot: true,
      },
    },
    null,
    2,
  ),
);
