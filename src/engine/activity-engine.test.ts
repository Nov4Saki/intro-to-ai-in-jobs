import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  startActivity,
  submitResponse,
  advancePrompt,
  summarizeSession,
} from "./activity-engine.ts";
import {
  createMemoryStorageAdapter,
  loadProgress,
  recordCompletion,
} from "./progress-store.ts";
import { SESSION_1, getActivity, listActivities } from "../content/session-1.ts";

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(ts|tsx|css|md)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

test("curriculum and UI source contain zero em-dashes or en-dashes and obey eyebrow cap", () => {
  const serialized = JSON.stringify(SESSION_1);
  assert.equal(
    serialized.includes("—"),
    false,
    "Found forbidden em-dash in SESSION_1 content"
  );
  assert.equal(
    serialized.includes("–"),
    false,
    "Found forbidden en-dash in SESSION_1 content"
  );

  const root = process.cwd();
  const files = [
    ...collectFiles(path.join(root, "src")),
    ...collectFiles(path.join(root, "docs")),
    path.join(root, "GLOSSARY.md"),
  ];

  let eyebrowMatches = 0;
  for (const file of files) {
    if (file.endsWith("activity-engine.test.ts")) continue;
    const text = fs.readFileSync(file, "utf8");
    assert.equal(
      text.includes("—"),
      false,
      `Found forbidden em-dash in ${path.relative(root, file)}`
    );
    assert.equal(
      text.includes("–"),
      false,
      `Found forbidden en-dash in ${path.relative(root, file)}`
    );
    const matches = text.match(/uppercase\s+tracking/g);
    if (matches) eyebrowMatches += matches.length;
  }

  assert.ok(
    eyebrowMatches <= 1,
    `Expected at most 1 eyebrow label across UI, found ${eyebrowMatches}`
  );
});

test("triage activity evaluates accurate and revisit responses through completion", () => {
  const triage = getActivity("triage");
  assert.ok(triage);

  let state = startActivity(triage);
  for (let i = 0; i < triage.prompts.length; i++) {
    const prompt = triage.prompts[i];
    assert.equal(prompt.mechanic, "triage");
    const chosenBucket = i === 0 ? "ai" : prompt.expectedBucket; // intentionally miss prompt 0 (expected: automation)
    const result = submitResponse(state, {
      mechanic: "triage",
      bucket: chosenBucket,
    });
    assert.equal(result.verdict.promptResolved, true);
    assert.equal(
      result.verdict.outcome,
      i === 0 ? "revisit" : "accurate"
    );
    state = advancePrompt(result.state);
  }

  assert.equal(state.completed, true);
  const summary = summarizeSession(state);
  assert.equal(summary.totalPrompts, triage.prompts.length);
  assert.equal(summary.accurateCount, triage.prompts.length - 1);
  assert.equal(summary.revisitCount, 1);
});

test("matching activity tracks incremental pairs and distinguishes clean vs slip rounds", () => {
  const matching = getActivity("matching");
  assert.ok(matching);

  let state = startActivity(matching);
  const round1 = matching.prompts[0];
  assert.equal(round1.mechanic, "matching");

  // Clean round 1
  for (let i = 0; i < round1.pairs.length; i++) {
    const pair = round1.pairs[i];
    const res = submitResponse(state, {
      mechanic: "matching",
      conceptPairId: pair.id,
      examplePairId: pair.id,
    });
    state = res.state;
    const isLast = i === round1.pairs.length - 1;
    assert.equal(res.verdict.promptResolved, isLast);
    if (isLast) {
      assert.equal(res.verdict.outcome, "accurate");
    }
  }

  state = advancePrompt(state);
  assert.equal(state.currentIndex, 1);

  // Round 2 with one mismatch slip first
  const round2 = matching.prompts[1];
  assert.equal(round2.mechanic, "matching");
  const slipRes = submitResponse(state, {
    mechanic: "matching",
    conceptPairId: round2.pairs[0].id,
    examplePairId: round2.pairs[1].id,
  });
  assert.equal(slipRes.verdict.outcome, "revisit");
  assert.equal(slipRes.verdict.promptResolved, false);
  state = slipRes.state;

  for (const pair of round2.pairs) {
    const res = submitResponse(state, {
      mechanic: "matching",
      conceptPairId: pair.id,
      examplePairId: pair.id,
    });
    state = res.state;
  }

  assert.equal(state.currentVerdict?.outcome, "partial");
  state = advancePrompt(state);
  assert.equal(state.completed, true);

  const summary = summarizeSession(state);
  assert.equal(summary.accurateCount, 1);
  assert.equal(summary.partialCount, 1);
  assert.equal(summary.masteryPercent, 75);
});

test("draft-review activity grades exact flags, false alarms, and missed flaws", () => {
  const reviewDesk = getActivity("review-desk");
  assert.ok(reviewDesk);

  let state = startActivity(reviewDesk);

  // Prompt 0: exact flag
  const p0 = reviewDesk.prompts[0];
  assert.equal(p0.mechanic, "draft-review");
  const p0Flaws = p0.segments.filter((s) => s.isFlawed).map((s) => s.id);
  const r0 = submitResponse(state, {
    mechanic: "draft-review",
    flaggedSegmentIds: p0Flaws,
  });
  assert.equal(r0.verdict.outcome, "accurate");
  state = advancePrompt(r0.state);

  // Prompt 1: flag flaw + false alarm -> partial
  const p1 = reviewDesk.prompts[1];
  assert.equal(p1.mechanic, "draft-review");
  const r1 = submitResponse(state, {
    mechanic: "draft-review",
    flaggedSegmentIds: p1.segments.map((s) => s.id),
  });
  assert.equal(r1.verdict.outcome, "partial");
  state = advancePrompt(r1.state);

  // Prompt 2: flag nothing -> revisit
  const r2 = submitResponse(state, {
    mechanic: "draft-review",
    flaggedSegmentIds: [],
  });
  assert.equal(r2.verdict.outcome, "revisit");
  state = advancePrompt(r2.state);

  assert.equal(state.completed, true);
});

test("all five session activities have valid prompts and progress store keeps best mastery", () => {
  assert.equal(listActivities().length, 5);

  const storage = createMemoryStorageAdapter();
  assert.deepEqual(loadProgress(storage), {});

  recordCompletion(storage, "quiz", 67, "2026-10-29T10:00:00Z");
  const afterHigher = recordCompletion(storage, "quiz", 100, "2026-10-29T10:05:00Z");
  assert.equal(afterHigher.quiz.bestMasteryPercent, 100);

  const afterLower = recordCompletion(storage, "quiz", 50, "2026-10-29T10:10:00Z");
  assert.equal(afterLower.quiz.bestMasteryPercent, 100);
});
