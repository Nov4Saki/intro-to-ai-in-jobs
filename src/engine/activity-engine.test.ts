import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  startActivity,
  getCurrentPrompt,
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
    path.join(root, "README.md"),
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

test("all 8 presentation parts exist and each contains a genuine mixture of at least 3 game mechanics", () => {
  const activities = listActivities();
  assert.equal(activities.length, 8);

  for (const activity of activities) {
    const actualMechanics = new Set(activity.prompts.map((p) => p.mechanic));
    assert.ok(
      actualMechanics.size >= 3,
      `Expected "${activity.slug}" to mix at least 3 mechanics, found ${actualMechanics.size}`
    );
    for (const declared of activity.mechanicsUsed) {
      assert.equal(
        actualMechanics.has(declared),
        true,
        `Declared mechanic "${declared}" missing from prompts in "${activity.slug}"`
      );
    }
    for (const actual of actualMechanics) {
      assert.equal(
        activity.mechanicsUsed.includes(actual),
        true,
        `Actual mechanic "${actual}" missing from mechanicsUsed in "${activity.slug}"`
      );
    }
  }
});

test("every section checkpoint plays cleanly end-to-end across mixed mechanics", () => {
  for (const activity of listActivities()) {
    let state = startActivity(activity);

    while (!state.completed) {
      const prompt = getCurrentPrompt(state);

      if (prompt.mechanic === "triage") {
        state = submitResponse(state, {
          mechanic: "triage",
          bucket: prompt.expectedBucket,
        }).state;
      } else if (prompt.mechanic === "myth-fact") {
        state = submitResponse(state, {
          mechanic: "myth-fact",
          judgment: prompt.reality,
        }).state;
      } else if (prompt.mechanic === "choice") {
        state = submitResponse(state, {
          mechanic: "choice",
          optionId: prompt.correctOptionId,
        }).state;
      } else if (prompt.mechanic === "matching") {
        for (const pair of prompt.pairs) {
          state = submitResponse(state, {
            mechanic: "matching",
            conceptPairId: pair.id,
            examplePairId: pair.id,
          }).state;
        }
      } else if (prompt.mechanic === "draft-review") {
        const flawed = prompt.segments
          .filter((s) => s.isFlawed)
          .map((s) => s.id);
        assert.ok(
          flawed.length > 0,
          `Draft review "${prompt.id}" must have at least one flawed segment`
        );
        state = submitResponse(state, {
          mechanic: "draft-review",
          flaggedSegmentIds: flawed,
        }).state;
      } else if (prompt.mechanic === "sequence") {
        state = submitResponse(state, {
          mechanic: "sequence",
          orderedStepIds: prompt.stepsInOrder.map((s) => s.id),
        }).state;
      }

      assert.ok(state.currentVerdict?.promptResolved);
      assert.equal(state.currentVerdict?.outcome, "accurate");
      state = advancePrompt(state);
    }

    const summary = summarizeSession(state);
    assert.equal(summary.masteryPercent, 100);
    assert.equal(summary.accurateCount, activity.prompts.length);
  }
});

test("sequence, matching, choice, and draft-review nudge gently on slips before resolving", () => {
  const part1 = getActivity("part-1-basics");
  assert.ok(part1);

  // Prompt 0 in part-1-basics is a 3-step sequence: reversing keeps middle card (1 of 3) -> gentle partial nudge (unlocked!)
  let seqState = startActivity(part1);
  const p0 = getCurrentPrompt(seqState);
  assert.equal(p0.mechanic, "sequence");
  const reversed = [...p0.stepsInOrder].reverse().map((s) => s.id);
  const revRes = submitResponse(seqState, {
    mechanic: "sequence",
    orderedStepIds: reversed,
  });
  assert.equal(revRes.verdict.promptResolved, false);
  assert.equal(revRes.verdict.outcome, "partial");

  // Completing the sequence right afterward resolves the prompt cleanly
  seqState = submitResponse(revRes.state, {
    mechanic: "sequence",
    orderedStepIds: p0.stepsInOrder.map((s) => s.id),
  }).state;
  assert.equal(seqState.currentVerdict?.promptResolved, true);
  assert.equal(seqState.currentVerdict?.outcome, "partial");

  // Part 4 prompt 0 is matching: trigger one mismatch flip first, then match all pairs
  const part4 = getActivity("part-4-expectations");
  assert.ok(part4);
  let p4State = startActivity(part4);
  const matchPrompt = getCurrentPrompt(p4State);
  assert.equal(matchPrompt.mechanic, "matching");
  p4State = submitResponse(p4State, {
    mechanic: "matching",
    conceptPairId: matchPrompt.pairs[0].id,
    examplePairId: matchPrompt.pairs[1].id,
  }).state;
  for (const pair of matchPrompt.pairs) {
    p4State = submitResponse(p4State, {
      mechanic: "matching",
      conceptPairId: pair.id,
      examplePairId: pair.id,
    }).state;
  }
  assert.equal(p4State.currentVerdict?.outcome, "partial");

  // Part 6 prompt 1 is draft-review (Thursday lunch): tapping a safe sentence nudges without locking out
  const part6 = getActivity("part-6-workflow");
  assert.ok(part6);
  let p6State = startActivity(part6);
  const p6Seq = getCurrentPrompt(p6State);
  assert.equal(p6Seq.mechanic, "sequence");
  p6State = advancePrompt(
    submitResponse(p6State, {
      mechanic: "sequence",
      orderedStepIds: p6Seq.stepsInOrder.map((s) => s.id),
    }).state
  );
  const lunchPrompt = getCurrentPrompt(p6State);
  assert.equal(lunchPrompt.mechanic, "draft-review");
  const safeSeg = lunchPrompt.segments.find((s) => !s.isFlawed)!;
  const flawedSeg = lunchPrompt.segments.find((s) => s.isFlawed)!;
  const safeTap = submitResponse(p6State, {
    mechanic: "draft-review",
    flaggedSegmentIds: [safeSeg.id],
  });
  assert.equal(safeTap.verdict.promptResolved, false);
  const flawTap = submitResponse(safeTap.state, {
    mechanic: "draft-review",
    flaggedSegmentIds: [flawedSeg.id],
  });
  assert.equal(flawTap.verdict.promptResolved, true);
  assert.equal(flawTap.verdict.outcome, "partial");

  // Progress store check
  const storage = createMemoryStorageAdapter();
  assert.deepEqual(loadProgress(storage), {});
  recordCompletion(storage, "part-1-basics", 80, "2026-10-29T10:00:00Z");
  const after = recordCompletion(
    storage,
    "part-1-basics",
    95,
    "2026-10-29T10:05:00Z"
  );
  assert.equal(after["part-1-basics"].bestMasteryPercent, 95);
});
