import type {
  Activity,
  AttendeeResponse,
  ChoicePrompt,
  DraftReviewPrompt,
  MatchingPrompt,
  MythFactPrompt,
  Prompt,
  SequencePrompt,
  TriageBucket,
  TriagePrompt,
  Verdict,
  VerdictOutcome,
} from "../domain/types.ts";

export interface ActivitySessionState {
  readonly activity: Activity;
  readonly currentIndex: number;
  readonly matchedPairIds: readonly string[];
  readonly hadSlipInCurrentPrompt: boolean;
  readonly lastFeedback: Verdict | null;
  readonly currentVerdict: Verdict | null;
  readonly outcomes: readonly VerdictOutcome[];
  readonly completed: boolean;
}

export interface ActivitySummary {
  readonly totalPrompts: number;
  readonly accurateCount: number;
  readonly partialCount: number;
  readonly revisitCount: number;
  readonly masteryPercent: number;
  readonly takeaway: string;
}

const BUCKET_LABELS: Record<TriageBucket, string> = {
  ai: "ذكاء اصطناعي",
  automation: "أتمتة تقليدية",
  unsure: "غير مؤكد",
};

export function startActivity(activity: Activity): ActivitySessionState {
  if (activity.prompts.length === 0) {
    throw new Error(`Activity "${activity.slug}" must contain at least one prompt.`);
  }
  return {
    activity,
    currentIndex: 0,
    matchedPairIds: [],
    hadSlipInCurrentPrompt: false,
    lastFeedback: null,
    currentVerdict: null,
    outcomes: [],
    completed: false,
  };
}

export function getCurrentPrompt(state: ActivitySessionState): Prompt {
  return state.activity.prompts[state.currentIndex];
}

export function submitResponse(
  state: ActivitySessionState,
  response: AttendeeResponse
): { state: ActivitySessionState; verdict: Verdict } {
  if (state.completed) {
    throw new Error("Cannot submit a response after the activity is completed.");
  }

  if (state.currentVerdict !== null) {
    return { state, verdict: state.currentVerdict };
  }

  const prompt = getCurrentPrompt(state);
  if (prompt.mechanic !== response.mechanic) {
    throw new Error(
      `Mechanic mismatch: prompt expects "${prompt.mechanic}", got "${response.mechanic}".`
    );
  }

  if (prompt.mechanic === "matching" && response.mechanic === "matching") {
    return evaluateMatchingStep(
      state,
      prompt,
      response.conceptPairId,
      response.examplePairId
    );
  }

  let verdict: Verdict;
  if (prompt.mechanic === "triage" && response.mechanic === "triage") {
    verdict = evaluateTriage(prompt, response.bucket);
  } else if (prompt.mechanic === "myth-fact" && response.mechanic === "myth-fact") {
    verdict = evaluateMythFact(prompt, response.judgment);
  } else if (prompt.mechanic === "choice" && response.mechanic === "choice") {
    verdict = evaluateChoice(prompt, response.optionId);
  } else if (
    prompt.mechanic === "draft-review" &&
    response.mechanic === "draft-review"
  ) {
    verdict = evaluateDraftReview(prompt, response.flaggedSegmentIds);
  } else if (prompt.mechanic === "sequence" && response.mechanic === "sequence") {
    verdict = evaluateSequence(prompt, response.orderedStepIds);
  } else {
    throw new Error("Unsupported prompt mechanic.");
  }

  return {
    state: {
      ...state,
      lastFeedback: verdict,
      currentVerdict: verdict,
      outcomes: [...state.outcomes, verdict.outcome],
    },
    verdict,
  };
}

export function advancePrompt(state: ActivitySessionState): ActivitySessionState {
  if (state.completed || state.currentVerdict === null) {
    return state;
  }

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.activity.prompts.length) {
    return {
      ...state,
      completed: true,
    };
  }

  return {
    ...state,
    currentIndex: nextIndex,
    matchedPairIds: [],
    hadSlipInCurrentPrompt: false,
    lastFeedback: null,
    currentVerdict: null,
  };
}

export function summarizeSession(state: ActivitySessionState): ActivitySummary {
  const totalPrompts = state.activity.prompts.length;
  const accurateCount = state.outcomes.filter((o) => o === "accurate").length;
  const partialCount = state.outcomes.filter((o) => o === "partial").length;
  const revisitCount = state.outcomes.filter((o) => o === "revisit").length;

  const weightedPoints = accurateCount + partialCount * 0.5;
  const masteryPercent = Math.round((weightedPoints / totalPrompts) * 100);

  return {
    totalPrompts,
    accurateCount,
    partialCount,
    revisitCount,
    masteryPercent,
    takeaway: state.activity.closingTakeaway,
  };
}

function evaluateTriage(prompt: TriagePrompt, chosen: TriageBucket): Verdict {
  const isAccurate = chosen === prompt.expectedBucket;
  const expectedLabel = BUCKET_LABELS[prompt.expectedBucket];

  if (isAccurate) {
    return {
      outcome: "accurate",
      headline: `تصنيف دقيق: ${expectedLabel}`,
      explanation: prompt.explanation,
      promptResolved: true,
    };
  }

  return {
    outcome: "revisit",
    headline: `التصنيف الأدق هو: ${expectedLabel}`,
    explanation: prompt.explanation,
    promptResolved: true,
  };
}

function evaluateMythFact(
  prompt: MythFactPrompt,
  judgment: "myth" | "fact"
): Verdict {
  const isAccurate = judgment === prompt.reality;
  const realityLabel = prompt.reality === "myth" ? "خرافة شائعة" : "حقيقة صحيحة";

  return {
    outcome: isAccurate ? "accurate" : "revisit",
    headline: isAccurate
      ? `أحسنت! العبارة فعلاً ${realityLabel}`
      : `انتبه: هذه العبارة ${realityLabel}`,
    explanation: `${prompt.correctionTitle}. ${prompt.explanation}`,
    promptResolved: true,
  };
}

function evaluateChoice(prompt: ChoicePrompt, optionId: string): Verdict {
  const chosenOption = prompt.options.find((opt) => opt.id === optionId);
  if (!chosenOption) {
    throw new Error(`Unknown option id "${optionId}".`);
  }

  const correctOption = prompt.options.find(
    (opt) => opt.id === prompt.correctOptionId
  );
  const isAccurate = optionId === prompt.correctOptionId;

  if (isAccurate) {
    return {
      outcome: "accurate",
      headline: "اختيار سليم",
      explanation: chosenOption.rationale,
      promptResolved: true,
    };
  }

  return {
    outcome: "revisit",
    headline: "تحتاج إلى إعادة نظر",
    explanation: `${chosenOption.rationale} الخيار الأفضل: ${correctOption ? correctOption.label : ""}`,
    promptResolved: true,
  };
}

function evaluateMatchingStep(
  state: ActivitySessionState,
  prompt: MatchingPrompt,
  conceptPairId: string,
  examplePairId: string
): { state: ActivitySessionState; verdict: Verdict } {
  const targetPair = prompt.pairs.find((p) => p.id === conceptPairId);
  if (!targetPair || !prompt.pairs.some((p) => p.id === examplePairId)) {
    throw new Error("Invalid pair identifier submitted.");
  }

  if (state.matchedPairIds.includes(conceptPairId)) {
    const alreadyMatchedVerdict: Verdict = {
      outcome: "accurate",
      headline: "تم ربط هذا الزوج مسبقاً",
      explanation: "اختر مفهوماً آخر من القائمة لإكمال المجموعة.",
      promptResolved: false,
    };
    return { state, verdict: alreadyMatchedVerdict };
  }

  if (conceptPairId !== examplePairId) {
    const slipVerdict: Verdict = {
      outcome: "revisit",
      headline: "ليس التطابق الأنسب",
      explanation: `تأمّل وظيفة "${targetPair.concept}" الأساسية ثم جرّب ربطها بالمثال المطابق.`,
      promptResolved: false,
    };
    return {
      state: {
        ...state,
        hadSlipInCurrentPrompt: true,
        lastFeedback: slipVerdict,
      },
      verdict: slipVerdict,
    };
  }

  const updatedMatched = [...state.matchedPairIds, conceptPairId];
  const allMatched = updatedMatched.length === prompt.pairs.length;

  if (!allMatched) {
    const stepVerdict: Verdict = {
      outcome: "accurate",
      headline: `تطابق صحيح (${updatedMatched.length} من ${prompt.pairs.length})`,
      explanation: `${targetPair.concept}: ${targetPair.example}`,
      promptResolved: false,
    };
    return {
      state: {
        ...state,
        matchedPairIds: updatedMatched,
        lastFeedback: stepVerdict,
      },
      verdict: stepVerdict,
    };
  }

  const finalOutcome: VerdictOutcome = state.hadSlipInCurrentPrompt
    ? "partial"
    : "accurate";
  const roundVerdict: Verdict = {
    outcome: finalOutcome,
    headline:
      finalOutcome === "accurate"
        ? "اكتملت المجموعة من المحاولة الأولى!"
        : "اكتملت المجموعة بنجاح",
    explanation: prompt.completionNote,
    promptResolved: true,
  };

  return {
    state: {
      ...state,
      matchedPairIds: updatedMatched,
      lastFeedback: roundVerdict,
      currentVerdict: roundVerdict,
      outcomes: [...state.outcomes, finalOutcome],
    },
    verdict: roundVerdict,
  };
}

function evaluateDraftReview(
  prompt: DraftReviewPrompt,
  flaggedSegmentIds: readonly string[]
): Verdict {
  const uniqueFlags = new Set(flaggedSegmentIds);
  const flawedSegments = prompt.segments.filter((s) => s.isFlawed);
  const validSegments = prompt.segments.filter((s) => !s.isFlawed);

  const caughtFlaws = flawedSegments.filter((s) => uniqueFlags.has(s.id));
  const falseAlarms = validSegments.filter((s) => uniqueFlags.has(s.id));

  const details = prompt.segments.map((seg) => {
    const flagged = uniqueFlags.has(seg.id);
    const accurate = seg.isFlawed ? flagged : !flagged;
    return {
      label: seg.text,
      note: seg.note,
      accurate,
    };
  });

  if (caughtFlaws.length === flawedSegments.length && falseAlarms.length === 0) {
    return {
      outcome: "accurate",
      headline: "مراجعة بشرية دقيقة!",
      explanation: prompt.takeaway,
      promptResolved: true,
      details,
    };
  }

  if (caughtFlaws.length > 0) {
    return {
      outcome: "partial",
      headline:
        falseAlarms.length > 0
          ? "التقطت الخلل، لكنك أشرت أيضاً إلى جملة سليمة"
          : "التقطت جزءاً من الخلل وفاتك جزء آخر",
      explanation: prompt.takeaway,
      promptResolved: true,
      details,
    };
  }

  return {
    outcome: "revisit",
    headline: "مرّ الخلل دون رصد!",
    explanation: prompt.takeaway,
    promptResolved: true,
    details,
  };
}

function evaluateSequence(
  prompt: SequencePrompt,
  orderedStepIds: readonly string[]
): Verdict {
  const expected = prompt.stepsInOrder;
  if (orderedStepIds.length !== expected.length) {
    throw new Error("Submitted sequence length does not match expected steps.");
  }

  const validIds = new Set(expected.map((s) => s.id));
  if (
    new Set(orderedStepIds).size !== expected.length ||
    orderedStepIds.some((id) => !validIds.has(id))
  ) {
    throw new Error("Submitted sequence contains invalid or duplicate step IDs.");
  }

  let exactMatches = 0;
  const details = expected.map((step, idx) => {
    const accurate = orderedStepIds[idx] === step.id;
    if (accurate) exactMatches += 1;
    return {
      label: `${idx + 1}. ${step.label}`,
      note: accurate ? "في موضعه الصحيح" : "موضع مختلف",
      accurate,
    };
  });

  if (exactMatches === expected.length) {
    return {
      outcome: "accurate",
      headline: "ترتيب سليم من البداية إلى النهاية!",
      explanation: prompt.explanation,
      promptResolved: true,
      details,
    };
  }

  const canonicalLine = expected
    .map((s, idx) => `(${idx + 1}) ${s.label}`)
    .join(" ثم ");

  if (exactMatches >= Math.ceil(expected.length / 2)) {
    return {
      outcome: "partial",
      headline: `أصبت في ${exactMatches} من ${expected.length} مواضع`,
      explanation: `${prompt.explanation} الترتيب الصحيح: ${canonicalLine}.`,
      promptResolved: true,
      details,
    };
  }

  return {
    outcome: "revisit",
    headline: "تحتاج الخطوات إلى إعادة ترتيب",
    explanation: `${prompt.explanation} الترتيب الصحيح: ${canonicalLine}.`,
    promptResolved: true,
    details,
  };
}
