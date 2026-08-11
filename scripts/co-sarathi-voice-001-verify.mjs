/**
 * CO-SARATHI-VOICE-001 — Voice Interaction Layer verify (static + module smoke).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.match(read("src/constants/sarathi-voice.ts"), /1\.0\.0-voice-001/);
assert.match(read("src/constants/sarathi-voice.ts"), /Listening\.\.\./);
assert.match(read("src/constants/sarathi-voice.ts"), /Understanding your request/);
assert.match(
  read("src/constants/sarathi-voice.ts"),
  /I'm reviewing what you've shared/,
);

const composer = read(
  "src/components/catalyst-one/sarathi/conversation-composer.tsx",
);
assert.match(composer, /startLiveBrowserStt/);
assert.match(composer, /SARATHI_VOICE_LANGUAGES/);
assert.match(composer, /useMicWaveform/);
assert.match(composer, /Mic/);
assert.match(composer, /Volume2/);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.match(workspace, /speakSarathiFacingText/);
assert.match(workspace, /ttsEnabled/);
assert.match(workspace, /voiceLanguage/);
assert.match(workspace, /SARATHI_VOICE_STATUS/);

assert.doesNotMatch(
  read("src/lib/enterprise-ai-platform/conversation-experience/consultant-facing.ts"),
  /I'm listening/,
);

assert.match(
  read("src/lib/enterprise-ai-platform/conversation-experience/natural-timing.ts"),
  /Understanding your request\.\.\./,
);
assert.match(
  read("src/lib/enterprise-ai-platform/conversation-experience/natural-timing.ts"),
  /I'm reviewing what you've shared\.\.\./,
);

assert.equal(existsSync(join(root, "src/lib/sarathi-voice/browser-tts.ts")), true);
assert.equal(existsSync(join(root, "src/lib/sarathi-voice/use-mic-waveform.ts")), true);
assert.equal(
  existsSync(join(root, "docs/co-sarathi-voice-001/CO-SARATHI-VOICE-001-REPORT.md")),
  true,
);

const { SARATHI_VOICE_LANGUAGES, SARATHI_VOICE_STATUS, sarathiSpeechLocale } =
  await import("../src/constants/sarathi-voice.ts");
assert.equal(SARATHI_VOICE_LANGUAGES.length, 3);
assert.equal(sarathiSpeechLocale("hi"), "hi-IN");
assert.equal(sarathiSpeechLocale("mr"), "mr-IN");
assert.equal(SARATHI_VOICE_STATUS.recording, "Listening...");
assert.equal(SARATHI_VOICE_STATUS.processing, "Understanding your request...");
assert.equal(SARATHI_VOICE_STATUS.typing, "I'm reviewing what you've shared...");

const { isBrowserSpeechSynthesisAvailable, cancelSarathiSpeech } = await import(
  "../src/lib/sarathi-voice/browser-tts.ts"
);
assert.equal(typeof isBrowserSpeechSynthesisAvailable, "function");
assert.equal(typeof cancelSarathiSpeech, "function");
assert.equal(isBrowserSpeechSynthesisAvailable(), false); // Node has no speechSynthesis

const { isBrowserSpeechRecognitionAvailable } = await import(
  "../src/lib/enterprise-conversation-intelligence/stt.ts"
);
assert.equal(typeof isBrowserSpeechRecognitionAvailable, "function");

console.log("CO-SARATHI-VOICE-001 verify: PASS");
