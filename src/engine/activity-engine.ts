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
    verdict = evaluateTriage(prompt, response.bucket, state.hadSlipInCurrentPrompt);
  } else if (prompt.mechanic === "myth-fact" && response.mechanic === "myth-fact") {
    verdict = evaluateMythFact(prompt, response.judgment);
  } else if (prompt.mechanic === "choice" && response.mechanic === "choice") {
    verdict = evaluateChoice(
      prompt,
      response.optionId,
      state.hadSlipInCurrentPrompt
    );
  } else if (
    prompt.mechanic === "draft-review" &&
    response.mechanic === "draft-review"
  ) {
    verdict = evaluateDraftReview(
      prompt,
      response.flaggedSegmentIds,
      state.hadSlipInCurrentPrompt
    );
  } else if (prompt.mechanic === "sequence" && response.mechanic === "sequence") {
    verdict = evaluateSequence(
      prompt,
      response.orderedStepIds,
      state.hadSlipInCurrentPrompt
    );
  } else {
    throw new Error("Unsupported prompt mechanic.");
  }

  if (!verdict.promptResolved) {
    return {
      state: {
        ...state,
        hadSlipInCurrentPrompt: true,
        lastFeedback: verdict,
      },
      verdict,
    };
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

  const weightedPoints = accurateCount + partialCount * 0.75 + revisitCount * 0.5;
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

function evaluateTriage(
  prompt: TriagePrompt,
  chosen: TriageBucket,
  hadPriorSlip: boolean
): Verdict {
  const isAccurate = chosen === prompt.expectedBucket;
  const expectedLabel = BUCKET_LABELS[prompt.expectedBucket];

  if (isAccurate) {
    const outcome: VerdictOutcome = hadPriorSlip ? "partial" : "accurate";
    return {
      outcome,
      headline: `ذاكرة حاضرة: ${expectedLabel}`,
      explanation: prompt.explanation,
      promptResolved: true,
    };
  }

  const chosenLabel = BUCKET_LABELS[chosen];
  return {
    outcome: "revisit",
    headline: `ليست "${chosenLabel}" تماماً`,
    explanation:
      "تذكّر ما ورد في البطاقة: هل هناك تعلّم من أمثلة، أم قاعدة ثابتة، أم أن الوصف لا يوضّح الآلية؟ جرّب بطاقة أخرى.",
    promptResolved: false,
  };
}

function evaluateMythFact(
  prompt: MythFactPrompt,
  judgment: "myth" | "fact"
): Verdict {
  const isAccurate = judgment === prompt.reality;
  const realityLabel = prompt.reality === "myth" ? "خرافة شائعة" : "حقيقة صحيحة";

  return {
    outcome: isAccurate ? "accurate" : "partial",
    headline: isAccurate
      ? `تذكّر سليم! هي فعلاً ${realityLabel}`
      : `تذكير لطيف من الشريحة: هي ${realityLabel}`,
    explanation: `${prompt.correctionTitle}. ${prompt.explanation}`,
    promptResolved: true,
  };
}

function evaluateChoice(
  prompt: ChoicePrompt,
  optionId: string,
  hadPriorSlip: boolean
): Verdict {
  const chosenOption = prompt.options.find((opt) => opt.id === optionId);
  if (!chosenOption) {
    throw new Error(`Unknown option id "${optionId}".`);
  }

  const isAccurate = optionId === prompt.correctOptionId;

  if (isAccurate) {
    const outcome: VerdictOutcome = hadPriorSlip ? "partial" : "accurate";
    return {
      outcome,
      headline: "تماماً كما ورد في الشريحة!",
      explanation: chosenOption.rationale,
      promptResolved: true,
    };
  }

  return {
    outcome: "revisit",
    headline: "جرّب بطاقة مجاورة",
    explanation: chosenOption.rationale,
    promptResolved: false,
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
      headline: "هذه البطاقة مكشوفة بالفعل",
      explanation: "اقلب بطاقة أخرى لإكمال الأزواج.",
      promptResolved: false,
    };
    return { state, verdict: alreadyMatchedVerdict };
  }

  if (conceptPairId !== examplePairId) {
    const slipVerdict: Verdict = {
      outcome: "revisit",
      headline: "احفظ موضعهما وجرّب زوجاً آخر",
      explanation: `تذكّر ارتباط "${targetPair.concept}" بما يطابقه في الشريحة.`,
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
      headline: `تطابق جميل (${updatedMatched.length} من ${prompt.pairs.length})`,
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
        ? "ذاكرة لمّاحة! كشفتَ كل الأزواج من المرة الأولى"
        : "جميل! اكتملت جميع بطاقات الذاكرة",
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
  flaggedSegmentIds: readonly string[],
  hadPriorSlip: boolean
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

  if (caughtFlaws.length === flawedSegments.length) {
    const outcome: VerdictOutcome =
      hadPriorSlip || falseAlarms.length > 0 ? "partial" : "accurate";
    return {
      outcome,
      headline: "عين فاحصة! التقطتَ التفصيلة الدخيلة",
      explanation: prompt.takeaway,
      promptResolved: true,
      details,
    };
  }

  const firstFalseAlarm = falseAlarms[0];
  return {
    outcome: "revisit",
    headline: "هذه الجملة مطابقة للملاحظات الصفراء",
    explanation: firstFalseAlarm
      ? `${firstFalseAlarm.note} ابحث عن الجملة الأخرى التي أضافها النظام من عنده.`
      : "ابحث في المسودة عن الجملة التي لم ترد في الملاحظات الصفراء.",
    promptResolved: false,
    details,
  };
}

function evaluateSequence(
  prompt: SequencePrompt,
  orderedStepIds: readonly string[],
  hadPriorSlip: boolean
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
      label: step.id,
      note: accurate ? "في موضعه الصحيح" : "يحتاج تبديلاً",
      accurate,
    };
  });

  if (exactMatches === expected.length) {
    const outcome: VerdictOutcome = hadPriorSlip ? "partial" : "accurate";
    return {
      outcome,
      headline: "ترتيب مطابق للشريحة تماماً!",
      explanation: prompt.explanation,
      promptResolved: true,
      details,
    };
  }

  if (exactMatches > 0) {
    return {
      outcome: "partial",
      headline: `ثبّتنا لك ${exactMatches} من ${expected.length} في مكانها الصحيح`,
      explanation: "رتّب البطاقات المتبقية لتكتمل سلسلة الشريحة.",
      promptResolved: false,
      details,
    };
  }

  return {
    outcome: "revisit",
    headline: "قاربت! لنجرّب نقطة البداية من جديد",
    explanation: "تذكّر أي بطاقة تمثّل الخطوة الأولى على يمين الشريحة.",
    promptResolved: false,
    details,
  };
}
