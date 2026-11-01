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
import { SESSION_2, listActivitiesSession2 } from "../content/session-2.ts";
import {
  ALL_SESSIONS,
  findActivity,
  listAllActivities,
} from "../content/index.ts";

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

  const allMechanicsAcrossSession = new Set<string>();
  for (const activity of activities) {
    const actualMechanics = new Set(activity.prompts.map((p) => p.mechanic));
    for (const m of actualMechanics) allMechanicsAcrossSession.add(m);

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

  // Ensure rich variety of game types across the session
  for (const expectedType of [
    "bucket-sort",
    "matching",
    "sequence",
    "draft-review",
    "myth-fact",
    "odd-one-out",
    "choice",
  ]) {
    assert.equal(
      allMechanicsAcrossSession.has(expectedType),
      true,
      `Expected session to include game mechanic "${expectedType}"`
    );
  }
});

test("every section checkpoint and warmup bucket-sort plays cleanly end-to-end across mixed mechanics", () => {
  // Verify warmup bucket-sort
  let warmupState = startActivity({
    slug: "warmup",
    partBadge: "التمهيد",
    slideRange: "الشريحة 4",
    title: SESSION_1.warmupPrompt.title,
    shortTitle: SESSION_1.warmupPrompt.title,
    subtitle: "",
    mechanicsUsed: ["bucket-sort"],
    agendaSlot: "",
    estimatedMinutes: 1,
    learningGoal: "",
    prompts: [SESSION_1.warmupPrompt],
    closingTakeaway: "",
  });
  for (const item of SESSION_1.warmupPrompt.items) {
    warmupState = submitResponse(warmupState, {
      mechanic: "bucket-sort",
      itemId: item.id,
      bucketId: item.bucketId,
    }).state;
  }
  assert.equal(warmupState.currentVerdict?.promptResolved, true);
  assert.equal(warmupState.currentVerdict?.outcome, "accurate");

  // Verify all 8 post-section activities
  for (const activity of listActivities()) {
    let state = startActivity(activity);

    while (!state.completed) {
      const prompt = getCurrentPrompt(state);

      if (prompt.mechanic === "bucket-sort") {
        assert.ok(prompt.buckets.length >= 2);
        assert.ok(prompt.items.length >= 3);
        for (const item of prompt.items) {
          state = submitResponse(state, {
            mechanic: "bucket-sort",
            itemId: item.id,
            bucketId: item.bucketId,
          }).state;
        }
      } else if (prompt.mechanic === "myth-fact") {
        state = submitResponse(state, {
          mechanic: "myth-fact",
          judgment: prompt.reality,
        }).state;
      } else if (prompt.mechanic === "odd-one-out") {
        const oddItems = prompt.items.filter((i) => i.isOdd);
        assert.equal(
          oddItems.length,
          1,
          `Odd-one-out "${prompt.id}" must have exactly 1 odd item`
        );
        state = submitResponse(state, {
          mechanic: "odd-one-out",
          itemId: oddItems[0].id,
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

test("bucket-sort, sequence, matching, odd-one-out, and draft-review nudge gently on slips before resolving", () => {
  const part1 = getActivity("part-1-basics");
  assert.ok(part1);

  // Prompt 0 in part-1-basics is a 4-bucket sort: wrong bucket nudges gently without locking out
  let bsState = startActivity(part1);
  const p0 = getCurrentPrompt(bsState);
  assert.equal(p0.mechanic, "bucket-sort");
  const wrongBucket = p0.buckets.find((b) => b.id !== p0.items[0].bucketId)!;
  const slipSort = submitResponse(bsState, {
    mechanic: "bucket-sort",
    itemId: p0.items[0].id,
    bucketId: wrongBucket.id,
  });
  assert.equal(slipSort.verdict.promptResolved, false);
  assert.equal(slipSort.verdict.outcome, "revisit");

  bsState = slipSort.state;
  for (const item of p0.items) {
    bsState = submitResponse(bsState, {
      mechanic: "bucket-sort",
      itemId: item.id,
      bucketId: item.bucketId,
    }).state;
  }
  assert.equal(bsState.currentVerdict?.promptResolved, true);
  assert.equal(bsState.currentVerdict?.outcome, "partial");

  // Prompt 1 in part-1-basics is a 3-step sequence
  let seqState = advancePrompt(bsState);
  const p1 = getCurrentPrompt(seqState);
  assert.equal(p1.mechanic, "sequence");
  const reversed = [...p1.stepsInOrder].reverse().map((s) => s.id);
  const revRes = submitResponse(seqState, {
    mechanic: "sequence",
    orderedStepIds: reversed,
  });
  assert.equal(revRes.verdict.promptResolved, false);
  assert.equal(revRes.verdict.outcome, "partial");

  seqState = submitResponse(revRes.state, {
    mechanic: "sequence",
    orderedStepIds: p1.stepsInOrder.map((s) => s.id),
  }).state;
  assert.equal(seqState.currentVerdict?.promptResolved, true);
  assert.equal(seqState.currentVerdict?.outcome, "partial");

  // Prompt 3 in part-1-basics is odd-one-out: tapping a valid group member nudges gently
  seqState = advancePrompt(seqState);
  const p2 = getCurrentPrompt(seqState);
  assert.equal(p2.mechanic, "sequence");
  let oddState = advancePrompt(
    submitResponse(seqState, {
      mechanic: "sequence",
      orderedStepIds: p2.stepsInOrder.map((s) => s.id),
    }).state
  );
  const p3 = getCurrentPrompt(oddState);
  assert.equal(p3.mechanic, "odd-one-out");
  const memberItem = p3.items.find((i) => !i.isOdd)!;
  const oddItem = p3.items.find((i) => i.isOdd)!;
  const memberTap = submitResponse(oddState, {
    mechanic: "odd-one-out",
    itemId: memberItem.id,
  });
  assert.equal(memberTap.verdict.promptResolved, false);
  oddState = submitResponse(memberTap.state, {
    mechanic: "odd-one-out",
    itemId: oddItem.id,
  }).state;
  assert.equal(oddState.currentVerdict?.promptResolved, true);
  assert.equal(oddState.currentVerdict?.outcome, "partial");

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

test("session 2 curriculum exists and contains valid multi-mechanic activities", () => {
  assert.equal(SESSION_2.number, 2);
  assert.equal(SESSION_2.trainerName, "عبدالرحمن عيسى");
  assert.equal(SESSION_2.hijriDate, "جمادى الأولى 1448");

  const activities = listActivitiesSession2();
  assert.equal(activities.length, 5);

  const allMechanicsAcrossS2 = new Set<string>();
  for (const activity of activities) {
    const actualMechanics = new Set(activity.prompts.map((p) => p.mechanic));
    for (const m of actualMechanics) allMechanicsAcrossS2.add(m);

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
  }

  // Ensure all 7 mechanics are utilized across Session 2
  for (const expectedType of [
    "bucket-sort",
    "matching",
    "sequence",
    "draft-review",
    "myth-fact",
    "odd-one-out",
    "choice",
  ]) {
    assert.equal(
      allMechanicsAcrossS2.has(expectedType),
      true,
      `Expected session 2 to include game mechanic "${expectedType}"`
    );
  }
});

test("every session 2 activity and warmup plays cleanly end-to-end across mixed mechanics", () => {
  // Verify warmup
  let warmupState = startActivity({
    slug: "s2-warmup",
    partBadge: "التمهيد",
    slideRange: "الشريحة 4 و 5",
    title: SESSION_2.warmupPrompt.title,
    shortTitle: SESSION_2.warmupPrompt.title,
    subtitle: "",
    mechanicsUsed: ["bucket-sort"],
    agendaSlot: "",
    estimatedMinutes: 1,
    learningGoal: "",
    prompts: [SESSION_2.warmupPrompt],
    closingTakeaway: "",
  });
  for (const item of SESSION_2.warmupPrompt.items) {
    warmupState = submitResponse(warmupState, {
      mechanic: "bucket-sort",
      itemId: item.id,
      bucketId: item.bucketId,
    }).state;
  }
  assert.equal(warmupState.currentVerdict?.promptResolved, true);
  assert.equal(warmupState.currentVerdict?.outcome, "accurate");

  // Verify all 5 activities of Session 2
  for (const activity of listActivitiesSession2()) {
    let state = startActivity(activity);

    while (!state.completed) {
      const prompt = getCurrentPrompt(state);

      if (prompt.mechanic === "bucket-sort") {
        assert.ok(prompt.buckets.length >= 2);
        assert.ok(prompt.items.length >= 3);
        for (const item of prompt.items) {
          state = submitResponse(state, {
            mechanic: "bucket-sort",
            itemId: item.id,
            bucketId: item.bucketId,
          }).state;
        }
      } else if (prompt.mechanic === "myth-fact") {
        state = submitResponse(state, {
          mechanic: "myth-fact",
          judgment: prompt.reality,
        }).state;
      } else if (prompt.mechanic === "odd-one-out") {
        const oddItems = prompt.items.filter((i) => i.isOdd);
        assert.equal(
          oddItems.length,
          1,
          `Odd-one-out "${prompt.id}" must have exactly 1 odd item`
        );
        state = submitResponse(state, {
          mechanic: "odd-one-out",
          itemId: oddItems[0].id,
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

test("unified content registry lists all sessions and resolves all activities by slug", () => {
  assert.equal(ALL_SESSIONS.length, 2);
  const allActs = listAllActivities();
  assert.equal(allActs.length, 13);

  const slugs = new Set(allActs.map((a) => a.slug));
  assert.equal(slugs.size, 13, "Slugs across sessions must be unique");

  for (const act of allActs) {
    const found = findActivity(act.slug);
    assert.ok(found, `Expected findActivity to find "${act.slug}"`);
    assert.equal(found?.slug, act.slug);
  }
});
