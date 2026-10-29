"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Cards,
  CaretLeft,
  ChatCenteredDots,
  Check,
  CheckCircle,
  Eye,
  GearSix,
  HighlighterCircle,
  House,
  Info,
  Lightbulb,
  NoteBlank,
  Plus,
  Question,
  Robot,
  ShieldCheck,
  Sparkle,
  Stack,
  X,
  XCircle,
} from "@phosphor-icons/react";
import type {
  Activity,
  ChoicePrompt,
  DraftReviewPrompt,
  MatchingPrompt,
  MythFactPrompt,
  SequencePrompt,
  TriageBucket,
  TriagePrompt,
  Verdict,
} from "@/domain/types";
import {
  advancePrompt,
  getCurrentPrompt,
  startActivity,
  submitResponse,
  summarizeSession,
} from "@/engine/activity-engine";
import {
  getBrowserStorageAdapter,
  recordCompletion,
} from "@/engine/progress-store";
import { MECHANIC_META } from "./hub-bento";
import { CopyLinkButton, ThemeToggle } from "./theme-toggle";

const ARABIC_DIGITS = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

const LIP_CYCLE = [
  {
    lip: "deck-lip-teal",
    medallionBg: "bg-[var(--medallion-teal)]",
    medallionInk: "text-[var(--medallion-teal-ink)]",
    Icon: Sparkle,
  },
  {
    lip: "deck-lip-coral",
    medallionBg: "bg-[var(--medallion-coral)]",
    medallionInk: "text-[var(--medallion-coral-ink)]",
    Icon: Stack,
  },
  {
    lip: "deck-lip-gold",
    medallionBg: "bg-[var(--medallion-gold)]",
    medallionInk: "text-[var(--medallion-gold-ink)]",
    Icon: Lightbulb,
  },
  {
    lip: "deck-lip-indigo",
    medallionBg: "bg-[var(--medallion-indigo)]",
    medallionInk: "text-[var(--medallion-indigo-ink)]",
    Icon: ShieldCheck,
  },
] as const;

function permuteDeterministically<T extends { id: string }>(
  items: readonly T[]
): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const hashA = a.id
      .split("")
      .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 11), 0);
    const hashB = b.id
      .split("")
      .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 11), 0);
    return hashB - hashA;
  });
  if (copy.length > 1 && copy.every((item, idx) => item.id === items[idx].id)) {
    const first = copy.shift()!;
    copy.push(first);
  }
  return copy;
}

export function ActivityPlayer({
  activity,
  nextActivity,
}: {
  activity: Activity;
  nextActivity: Activity | null;
}) {
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => startActivity(activity));

  useEffect(() => {
    setHydrated(true);
  }, []);

  const [triedBuckets, setTriedBuckets] = useState<TriageBucket[]>([]);
  const [selectedMythFact, setSelectedMythFact] = useState<
    "myth" | "fact" | null
  >(null);
  const [triedOptionIds, setTriedOptionIds] = useState<string[]>([]);
  const [verifiedSafeSegmentIds, setVerifiedSafeSegmentIds] = useState<string[]>(
    []
  );

  const currentPrompt = getCurrentPrompt(state);
  const currentMechanicMeta = MECHANIC_META[currentPrompt.mechanic];
  const CurrentMechanicIcon = currentMechanicMeta.Icon;

  const totalPrompts = activity.prompts.length;
  const progressRatio = state.completed
    ? 1
    : (state.currentIndex + (state.currentVerdict ? 1 : 0)) / totalPrompts;

  const stageTheme = LIP_CYCLE[state.currentIndex % LIP_CYCLE.length];

  useEffect(() => {
    if (state.completed) {
      const summary = summarizeSession(state);
      recordCompletion(
        getBrowserStorageAdapter(),
        activity.slug,
        summary.masteryPercent
      );
    }
  }, [state, activity.slug]);

  function resetLocalSelections() {
    setTriedBuckets([]);
    setSelectedMythFact(null);
    setTriedOptionIds([]);
    setVerifiedSafeSegmentIds([]);
  }

  function handleNext() {
    resetLocalSelections();
    setState((prev) => advancePrompt(prev));
  }

  function handleRestart() {
    resetLocalSelections();
    setState(startActivity(activity));
  }

  function handleTriagePick(bucket: TriageBucket) {
    if (state.currentVerdict) return;
    const res = submitResponse(state, { mechanic: "triage", bucket });
    setState(res.state);
    if (!res.verdict.promptResolved && !triedBuckets.includes(bucket)) {
      setTriedBuckets((prev) => [...prev, bucket]);
    }
  }

  function handleMythFactPick(judgment: "myth" | "fact") {
    if (state.currentVerdict) return;
    setSelectedMythFact(judgment);
    const res = submitResponse(state, { mechanic: "myth-fact", judgment });
    setState(res.state);
  }

  function handleChoicePick(optionId: string) {
    if (state.currentVerdict) return;
    const res = submitResponse(state, { mechanic: "choice", optionId });
    setState(res.state);
    if (!res.verdict.promptResolved && !triedOptionIds.includes(optionId)) {
      setTriedOptionIds((prev) => [...prev, optionId]);
    }
  }

  function handleMatchingPairAttempt(
    conceptPairId: string,
    examplePairId: string
  ): Verdict {
    const res = submitResponse(state, {
      mechanic: "matching",
      conceptPairId,
      examplePairId,
    });
    setState(res.state);
    return res.verdict;
  }

  function handleTapDraftSegment(segmentId: string) {
    if (state.currentVerdict) return;
    const res = submitResponse(state, {
      mechanic: "draft-review",
      flaggedSegmentIds: [segmentId],
    });
    setState(res.state);
    if (
      !res.verdict.promptResolved &&
      !verifiedSafeSegmentIds.includes(segmentId)
    ) {
      setVerifiedSafeSegmentIds((prev) => [...prev, segmentId]);
    }
  }

  function handleSubmitSequence(orderedStepIds: readonly string[]): Verdict {
    const res = submitResponse(state, {
      mechanic: "sequence",
      orderedStepIds,
    });
    setState(res.state);
    return res.verdict;
  }

  const shuffledExamples = useMemo(() => {
    if (currentPrompt.mechanic !== "matching") return [];
    return permuteDeterministically(currentPrompt.pairs);
  }, [currentPrompt]);

  const shuffledSequencePool = useMemo(() => {
    if (currentPrompt.mechanic !== "sequence") return [];
    return permuteDeterministically(currentPrompt.stepsInOrder);
  }, [currentPrompt]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--surface-page)]">
      {/* Top sticky bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/92 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <ArrowRight size={16} weight="bold" />
              <span>كل المحطات</span>
            </Link>
            <span className="hidden text-sm font-bold text-[var(--text-primary)] sm:inline">
              {activity.shortTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {!state.completed && (
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)] tabular-nums">
                البطاقة {state.currentIndex + 1} من {totalPrompts}
              </span>
            )}
            <CopyLinkButton label="مشاركة الرابط" compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="h-[3px] w-full overflow-hidden bg-transparent">
          <div
            style={{ transform: `scaleX(${progressRatio})` }}
            className="h-full w-full origin-right bg-[var(--accent)] transition-transform duration-300 ease-out"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        {/* Slide-style header */}
        <div className="mb-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-[var(--lip-teal)]/35 bg-[var(--accent-soft)] px-3 py-1 text-[var(--medallion-teal-ink)]">
              {activity.partBadge} · {activity.slideRange}
            </span>
            <span className="font-medium text-[var(--text-muted)]">
              {activity.agendaSlot}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-[var(--text-primary)] sm:text-3xl">
            {activity.title}
          </h1>
          <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {activity.subtitle}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {state.completed ? (
            <CompletionView
              key="completion"
              activity={activity}
              state={state}
              nextActivity={nextActivity}
              onRestart={handleRestart}
              reduceMotion={Boolean(reduceMotion)}
            />
          ) : (
            <motion.section
              key={currentPrompt.id}
              initial={
                hydrated && !reduceMotion ? { opacity: 0, scale: 0.98 } : false
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className={`deck-card rounded-2xl p-5 sm:p-8 ${stageTheme.lip}`}
            >
              {/* Friendly card-type indicator & circular Arabic step badges */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div className="inline-flex items-center gap-2.5">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${stageTheme.medallionBg} ${stageTheme.medallionInk}`}
                  >
                    <CurrentMechanicIcon size={19} weight="duotone" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {currentMechanicMeta.label}
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      استرجاع خفيف من الشرائح بلا درجات
                    </p>
                  </div>
                </div>

                {/* Slide-deck circular Arabic badges (١ ٢ ٣ ٤) */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {activity.prompts.map((p, idx) => {
                    const isCurrent = idx === state.currentIndex;
                    const isDone = idx < state.currentIndex;
                    return (
                      <span
                        key={p.id}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isDone
                            ? "bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
                            : isCurrent
                            ? "bg-[var(--surface-navy)] text-[var(--text-navy-surface)]"
                            : "bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                        }`}
                      >
                        {isDone ? (
                          <Check size={13} weight="bold" />
                        ) : (
                          ARABIC_DIGITS[idx] ?? idx + 1
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {currentPrompt.mechanic === "triage" && (
                <TriageStage
                  prompt={currentPrompt}
                  triedBuckets={triedBuckets}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onPick={handleTriagePick}
                />
              )}

              {currentPrompt.mechanic === "myth-fact" && (
                <MythFactStage
                  prompt={currentPrompt}
                  selected={selectedMythFact}
                  resolved={state.currentVerdict !== null}
                  onPick={handleMythFactPick}
                />
              )}

              {currentPrompt.mechanic === "choice" && (
                <MemoryRecallTilesStage
                  prompt={currentPrompt}
                  triedIds={triedOptionIds}
                  resolved={state.currentVerdict !== null}
                  onPick={handleChoicePick}
                />
              )}

              {currentPrompt.mechanic === "matching" && (
                <MemoryFlipBoardStage
                  key={currentPrompt.id}
                  prompt={currentPrompt}
                  shuffledExamples={shuffledExamples}
                  matchedPairIds={state.matchedPairIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onPairAttempt={handleMatchingPairAttempt}
                />
              )}

              {currentPrompt.mechanic === "draft-review" && (
                <DraftReviewStage
                  prompt={currentPrompt}
                  verifiedSafeIds={verifiedSafeSegmentIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onTapSegment={handleTapDraftSegment}
                />
              )}

              {currentPrompt.mechanic === "sequence" && (
                <SequenceStage
                  key={currentPrompt.id}
                  prompt={currentPrompt}
                  poolSteps={shuffledSequencePool}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onSubmitSequence={handleSubmitSequence}
                />
              )}

              {state.currentVerdict && (
                <VerdictPanel
                  verdict={state.currentVerdict}
                  isLastPrompt={state.currentIndex + 1 >= totalPrompts}
                  onNext={handleNext}
                  reduceMotion={Boolean(reduceMotion)}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ============================================================================
 * 1. MATCHING -> True 3D Flip-Card Memory Board
 * ============================================================================ */
function MemoryFlipBoardStage({
  prompt,
  shuffledExamples,
  matchedPairIds,
  lastFeedback,
  resolved,
  onPairAttempt,
}: {
  prompt: MatchingPrompt;
  shuffledExamples: readonly { id: string; concept: string; example: string }[];
  matchedPairIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onPairAttempt: (conceptPairId: string, examplePairId: string) => Verdict;
}) {
  const [isPeeking, setIsPeeking] = useState(true);
  const [flippedConceptId, setFlippedConceptId] = useState<string | null>(null);
  const [flippedExampleId, setFlippedExampleId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    peekTimerRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 3800);

    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
    };
  }, []);

  function startImmediately() {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setIsPeeking(false);
  }

  function triggerQuickPeek() {
    if (resolved || isChecking) return;
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setIsPeeking(true);
    peekTimerRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 2400);
  }

  function evaluateOpenPair(conceptId: string, exampleId: string) {
    const verdict = onPairAttempt(conceptId, exampleId);
    if (verdict.outcome === "accurate") {
      setFlippedConceptId(null);
      setFlippedExampleId(null);
      setIsChecking(false);
    } else {
      setIsChecking(true);
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = setTimeout(() => {
        setFlippedConceptId(null);
        setFlippedExampleId(null);
        setIsChecking(false);
      }, 1150);
    }
  }

  function handleFlipConcept(pairId: string) {
    if (resolved || isChecking || matchedPairIds.includes(pairId)) return;
    if (isPeeking) startImmediately();

    if (flippedConceptId === pairId) return;
    setFlippedConceptId(pairId);

    if (flippedExampleId) {
      evaluateOpenPair(pairId, flippedExampleId);
    }
  }

  function handleFlipExample(pairId: string) {
    if (resolved || isChecking || matchedPairIds.includes(pairId)) return;
    if (isPeeking) startImmediately();

    if (flippedExampleId === pairId) return;
    setFlippedExampleId(pairId);

    if (flippedConceptId) {
      evaluateOpenPair(flippedConceptId, pairId);
    }
  }

  const pairCount = prompt.pairs.length;
  const gridColsClass =
    pairCount === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
            {prompt.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {prompt.instruction}
          </p>
        </div>

        {!resolved && (
          <div className="flex items-center gap-2">
            {isPeeking ? (
              <button
                type="button"
                onClick={startImmediately}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-xl bg-[var(--medallion-gold)] px-3.5 py-2 text-xs font-bold text-[var(--medallion-gold-ink)]"
              >
                <Cards size={16} weight="duotone" />
                <span>احفظ المواضع... أو انقر للبدء فوراً</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isChecking}
                onClick={triggerQuickPeek}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-page)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50"
              >
                <Eye size={16} weight="duotone" className="text-[var(--accent)]" />
                <span>لمحة سريعة للذاكرة</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Row 1: Concept Memory Cards */}
      <div className="mt-6">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            صف المفاهيم (اقلب بطاقة مفهوم)
          </span>
          <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
            {matchedPairIds.length} من {pairCount} أزواج مكشوفة
          </span>
        </div>

        <div className={`grid gap-3.5 ${gridColsClass}`}>
          {prompt.pairs.map((pair, idx) => {
            const isMatched = matchedPairIds.includes(pair.id);
            const isFaceUp =
              isPeeking ||
              resolved ||
              isMatched ||
              flippedConceptId === pair.id;
            const style = LIP_CYCLE[idx % LIP_CYCLE.length];
            const CardIcon = style.Icon;

            return (
              <button
                key={pair.id}
                type="button"
                disabled={resolved || isMatched || isChecking}
                onClick={() => handleFlipConcept(pair.id)}
                aria-label={
                  isFaceUp ? pair.concept : `بطاقة مفهوم رقم ${idx + 1} مقلوبة`
                }
                className="memory-perspective group min-h-[132px] w-full text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div
                  className="memory-card-inner min-h-[132px]"
                  data-flipped={isFaceUp ? "true" : "false"}
                >
                  {/* Front face (open slide card) */}
                  <div
                    className={`memory-face memory-face-front deck-card flex min-h-[132px] w-full flex-col justify-between rounded-2xl p-4 ${
                      style.lip
                    } ${
                      isMatched
                        ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)]"
                        : flippedConceptId === pair.id
                        ? "ring-2 ring-[var(--accent)]"
                        : ""
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${style.medallionBg} ${style.medallionInk}`}
                      >
                        <CardIcon size={18} weight="duotone" />
                      </span>
                      {isMatched && (
                        <CheckCircle
                          size={20}
                          weight="fill"
                          className="text-[var(--verdict-accurate-text)]"
                        />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-snug text-[var(--text-primary)] sm:text-base">
                      {pair.concept}
                    </p>
                  </div>

                  {/* Back face (Deck Teal patterned back) */}
                  <div className="memory-face-back deck-hover-lift flex min-h-[132px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#0b7069] bg-[#0e8a82] p-4 text-center text-white shadow-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
                      <Cards size={22} weight="duotone" />
                    </span>
                    <span className="text-xs font-bold">
                      بطاقة مفهوم {ARABIC_DIGITS[idx] ?? idx + 1}
                    </span>
                    <span className="text-[11px] opacity-85">انقر لقلب البطاقة</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Shuffled Example Memory Cards */}
      <div className="mt-6">
        <div className="mb-2.5">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            صف الأمثلة من الشريحة (اقلب البطاقة المطابقة)
          </span>
        </div>

        <div className={`grid gap-3.5 ${gridColsClass}`}>
          {shuffledExamples.map((pair, idx) => {
            const isMatched = matchedPairIds.includes(pair.id);
            const isFaceUp =
              isPeeking ||
              resolved ||
              isMatched ||
              flippedExampleId === pair.id;

            return (
              <button
                key={pair.id}
                type="button"
                disabled={resolved || isMatched || isChecking}
                onClick={() => handleFlipExample(pair.id)}
                aria-label={
                  isFaceUp ? pair.example : `بطاقة مثال رقم ${idx + 1} مقلوبة`
                }
                className="memory-perspective group min-h-[144px] w-full text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div
                  className="memory-card-inner min-h-[144px]"
                  data-flipped={isFaceUp ? "true" : "false"}
                >
                  {/* Front face (Slide 8/9 warm inner example card) */}
                  <div
                    className={`memory-face memory-face-front flex min-h-[144px] w-full flex-col justify-between rounded-2xl border p-4 shadow-sm ${
                      isMatched
                        ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)]"
                        : flippedExampleId === pair.id
                        ? "border-[var(--accent)] bg-[var(--surface-card)] ring-2 ring-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-page)]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="rounded-lg bg-[var(--surface-card)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)] ring-1 ring-[var(--border-subtle)]">
                        مثال تطبيقي
                      </span>
                      {isMatched && (
                        <CheckCircle
                          size={19}
                          weight="fill"
                          className="text-[var(--verdict-accurate-text)]"
                        />
                      )}
                    </div>
                    <p className="mt-2.5 text-xs font-medium leading-relaxed text-[var(--text-primary)] sm:text-sm">
                      {pair.example}
                    </p>
                  </div>

                  {/* Back face (Slide 1 Indigo patterned back with 3 brand dots) */}
                  <div className="memory-face-back deck-hover-lift flex min-h-[144px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-[#2d3e6e] bg-[#1e2a4a] p-4 text-center text-[#faf6ee] shadow-sm">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e8573a]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ffc93c]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#2ec4b6]" />
                    </div>
                    <span className="text-xs font-bold">
                      بطاقة مثال {ARABIC_DIGITS[idx] ?? idx + 1}
                    </span>
                    <span className="text-[11px] text-[#c8d2ea]">
                      انقر لقلب البطاقة
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!resolved && lastFeedback && (
        <div
          className={`mt-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
            lastFeedback.outcome === "accurate"
              ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
              : "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
          }`}
        >
          <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-95">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 2. SEQUENCE -> Slide 6 / 14 / 25 Horizontal Step-Card Builder
 * ============================================================================ */
function SequenceStage({
  prompt,
  poolSteps,
  lastFeedback,
  resolved,
  onSubmitSequence,
}: {
  prompt: SequencePrompt;
  poolSteps: readonly { id: string; label: string }[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onSubmitSequence: (orderedStepIds: readonly string[]) => Verdict;
}) {
  const stepCount = prompt.stepsInOrder.length;
  const stepMap = useMemo(
    () => new Map(prompt.stepsInOrder.map((s) => [s.id, s])),
    [prompt.stepsInOrder]
  );

  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array(stepCount).fill(null)
  );
  const [lockedIndices, setLockedIndices] = useState<number[]>([]);
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    };
  }, []);

  const placedIds = slots.filter((id): id is string => id !== null);
  const remainingSteps = poolSteps.filter((s) => !placedIds.includes(s.id));

  function handlePlaceCard(stepId: string) {
    if (resolved) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx === -1) return;

    const nextSlots = [...slots];
    nextSlots[emptyIdx] = stepId;
    setSlots(nextSlots);

    if (nextSlots.every((s) => s !== null)) {
      const fullOrder = nextSlots as string[];
      const verdict = onSubmitSequence(fullOrder);
      if (!verdict.promptResolved) {
        const newlyLocked: number[] = [];
        prompt.stepsInOrder.forEach((expected, i) => {
          if (fullOrder[i] === expected.id) {
            newlyLocked.push(i);
          }
        });
        setLockedIndices(newlyLocked);

        if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
        bounceTimerRef.current = setTimeout(() => {
          setSlots((prev) =>
            prev.map((val, i) => (newlyLocked.includes(i) ? val : null))
          );
        }, 620);
      }
    }
  }

  function handleRemoveSlot(slotIdx: number) {
    if (resolved || lockedIndices.includes(slotIdx)) return;
    setSlots((prev) => prev.map((val, i) => (i === slotIdx ? null : val)));
  }

  const gridColsClass =
    stepCount === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-3 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {prompt.instruction}
      </p>

      {/* Horizontal Slide-Deck Step Slots with Number Badges & Coral Chevrons */}
      <div className={`mt-7 grid grid-cols-1 gap-4 ${gridColsClass}`}>
        {prompt.stepsInOrder.map((expectedStep, slotIdx) => {
          const style = LIP_CYCLE[slotIdx % LIP_CYCLE.length];
          const chosenId = slots[slotIdx];
          const chosenStep = chosenId ? stepMap.get(chosenId) : undefined;
          const isLockedRight =
            resolved || lockedIndices.includes(slotIdx);

          return (
            <div key={expectedStep.id} className="relative flex items-stretch">
              {chosenStep ? (
                <button
                  type="button"
                  disabled={isLockedRight}
                  onClick={() => handleRemoveSlot(slotIdx)}
                  className={`deck-card relative flex min-h-[136px] w-full flex-col justify-between rounded-2xl p-4 pt-6 text-right ${
                    style.lip
                  } ${
                    isLockedRight
                      ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)]"
                      : "hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="absolute -top-3.5 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-navy)] text-xs font-bold text-[var(--text-navy-surface)]">
                    {ARABIC_DIGITS[slotIdx] ?? slotIdx + 1}
                  </span>

                  <p className="text-sm font-bold leading-relaxed text-[var(--text-primary)]">
                    {chosenStep.label}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    {isLockedRight ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[var(--verdict-accurate-text)]">
                        <CheckCircle size={16} weight="fill" />
                        <span>في موضعها الصحيح</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                        <X size={13} weight="bold" />
                        <span>انقر لإرجاعها</span>
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                <div
                  className={`deck-card relative flex min-h-[136px] w-full flex-col items-center justify-center rounded-2xl border-dashed bg-[var(--surface-page)]/75 p-4 pt-6 text-center ${style.lip}`}
                >
                  <span className="absolute -top-3.5 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-navy)] text-xs font-bold text-[var(--text-navy-surface)]">
                    {ARABIC_DIGITS[slotIdx] ?? slotIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    الموضع {ARABIC_DIGITS[slotIdx] ?? slotIdx + 1} في الشريحة
                  </span>
                </div>
              )}

              {slotIdx < stepCount - 1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 -left-3.5 z-10 hidden -translate-y-1/2 text-[var(--lip-coral)] md:inline-flex"
                >
                  <CaretLeft size={22} weight="bold" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Loose Shuffled Slide Cards Tray */}
      {!resolved && remainingSteps.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 sm:p-5">
          <p className="mb-3 text-xs font-bold text-[var(--text-secondary)]">
            انقر على البطاقة لوضعها في الخانة التالية ({remainingSteps.length} متبقية):
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {remainingSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => handlePlaceCard(step.id)}
                className="tactile-btn deck-hover-lift flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3.5 text-right text-sm font-semibold leading-relaxed text-[var(--text-primary)] shadow-xs hover:border-[var(--accent)]"
              >
                <span>{step.label}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Plus size={15} weight="bold" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!resolved && lastFeedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] p-3.5 text-sm text-[var(--verdict-partial-text)]">
          <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-95">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 3. TRIAGE -> Slide 11 / 12 / 32 Window Card + Slide 31 Top-Lip Cards
 * ============================================================================ */
function TriageStage({
  prompt,
  triedBuckets,
  lastFeedback,
  resolved,
  onPick,
}: {
  prompt: TriagePrompt;
  triedBuckets: readonly TriageBucket[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onPick: (bucket: TriageBucket) => void;
}) {
  const buckets: {
    id: TriageBucket;
    label: string;
    desc: string;
    lip: string;
    medallionBg: string;
    medallionInk: string;
    Icon: typeof Robot;
  }[] = [
    {
      id: "ai",
      label: "الذكاء الاصطناعي",
      desc: "يتعلّم الأنماط من الأمثلة",
      lip: "deck-lip-teal",
      medallionBg: "bg-[var(--medallion-teal)]",
      medallionInk: "text-[var(--medallion-teal-ink)]",
      Icon: Robot,
    },
    {
      id: "automation",
      label: "أتمتة تقليدية",
      desc: "تتبع قواعد ثابتة أو جدولاً زمنياً",
      lip: "deck-lip-indigo",
      medallionBg: "bg-[var(--medallion-indigo)]",
      medallionInk: "text-[var(--medallion-indigo-ink)]",
      Icon: GearSix,
    },
    {
      id: "unsure",
      label: "غير مؤكد",
      desc: "المعلومات المعطاة لا تكفي للحكم",
      lip: "deck-lip-gold",
      medallionBg: "bg-[var(--medallion-gold)]",
      medallionInk: "text-[var(--medallion-gold-ink)]",
      Icon: Question,
    },
  ];

  return (
    <div>
      {/* Slide 11 / 12 / 32 App Window Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-page)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-window-bar)] px-4 py-2.5">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {prompt.contextTag}
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-teal)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-gold)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-coral)]" />
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
            {prompt.scenario}
          </p>
        </div>
      </div>

      {/* Exact Slide 31 Three Top-Lip Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {buckets.map(
          ({ id, label, desc, lip, medallionBg, medallionInk, Icon }) => {
            const wasTried = triedBuckets.includes(id);
            const isExpected = resolved && prompt.expectedBucket === id;

            let cardState =
              "bg-[var(--surface-card)] deck-hover-lift hover:border-[var(--accent)]";
            if (isExpected) {
              cardState =
                "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
            } else if (wasTried) {
              cardState =
                "bg-[var(--surface-subtle)] opacity-55";
            } else if (resolved) {
              cardState = "bg-[var(--surface-card)] opacity-55";
            }

            return (
              <button
                key={id}
                type="button"
                disabled={resolved || wasTried}
                onClick={() => onPick(id)}
                className={`tactile-btn deck-card flex flex-col items-start rounded-2xl p-5 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${lip} ${cardState}`}
              >
                <div className="mb-3 flex w-full items-center justify-between">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${medallionBg} ${medallionInk}`}
                  >
                    <Icon size={23} weight="duotone" />
                  </span>
                  {isExpected && <CheckCircle size={20} weight="fill" />}
                </div>
                <span className="text-base font-bold">{label}</span>
                <span className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {desc}
                </span>
              </button>
            );
          }
        )}
      </div>

      {!resolved && lastFeedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] p-3.5 text-sm text-[var(--verdict-partial-text)]">
          <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-95">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 4. MYTH-FACT -> Slide 28-30 Coral vs. Mint Reveal Card
 * ============================================================================ */
function MythFactStage({
  prompt,
  selected,
  resolved,
  onPick,
}: {
  prompt: MythFactPrompt;
  selected: "myth" | "fact" | null;
  resolved: boolean;
  onPick: (judgment: "myth" | "fact") => void;
}) {
  return (
    <div>
      {/* Statement Card */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-page)] p-5 sm:p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--medallion-teal)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
          <ChatCenteredDots size={16} weight="duotone" />
          <span>خرافة أم حقيقة في الشرائح؟</span>
        </div>
        <p className="text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
          &laquo;{prompt.claim}&raquo;
        </p>
      </div>

      {/* Choice buttons modeled directly on Slide 28's Coral X & Mint Check */}
      {!resolved ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("myth")}
            className="tactile-btn deck-card deck-lip-coral deck-hover-lift flex items-center justify-between gap-4 rounded-2xl p-5 text-right hover:border-[var(--lip-coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                خرافة شائعة
              </span>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                مبالغة أو تعميم صحّحته الشريحة
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--medallion-coral)] text-[var(--medallion-coral-ink)]">
              <XCircle size={26} weight="fill" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPick("fact")}
            className="tactile-btn deck-card deck-lip-teal deck-hover-lift flex items-center justify-between gap-4 rounded-2xl p-5 text-right hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                حقيقة صحيحة
              </span>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                تتفق مع واقع عمل الأنظمة في الجلسة
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--medallion-teal)] text-[var(--medallion-teal-ink)]">
              <CheckCircle size={26} weight="fill" />
            </span>
          </button>
        </div>
      ) : (
        /* Slide 28 Exact Side-by-Side Coral <- Mint Reveal */
        <div className="mt-6 grid grid-cols-1 items-center gap-3 md:grid-cols-11">
          <div
            className={`rounded-2xl border p-5 md:col-span-5 ${
              prompt.reality === "myth"
                ? "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]"
                : "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">
                {prompt.reality === "myth" ? "خرافة" : "العبارة صحيحة"}
                {selected ? "" : ""}
              </span>
              {prompt.reality === "myth" ? (
                <XCircle size={22} weight="fill" />
              ) : (
                <CheckCircle size={22} weight="fill" />
              )}
            </div>
            <p className="mt-2 text-sm font-bold leading-relaxed">
              {prompt.claim}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="hidden justify-center text-[var(--lip-coral)] md:col-span-1 md:flex"
          >
            <ArrowLeft size={24} weight="bold" />
          </div>

          <div className="rounded-2xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-5 text-[var(--verdict-accurate-text)] md:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">الحقيقة في الشريحة</span>
              <CheckCircle size={22} weight="fill" />
            </div>
            <p className="mt-2 text-sm font-bold leading-relaxed">
              {prompt.correctionTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {prompt.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 5. CHOICE -> 2x2 Visual Recall Tiles (Zero أ/ب/ج/د Exam List!)
 * ============================================================================ */
function MemoryRecallTilesStage({
  prompt,
  triedIds,
  resolved,
  onPick,
}: {
  prompt: ChoicePrompt;
  triedIds: readonly string[];
  resolved: boolean;
  onPick: (optionId: string) => void;
}) {
  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-3.5 text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
        {prompt.question}
      </h2>
      <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
        اختر البطاقة التي تتفق مع ما رأيناه في الشرائح:
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {prompt.options.map((opt, idx) => {
          const style = LIP_CYCLE[idx % LIP_CYCLE.length];
          const TileIcon = style.Icon;
          const wasTried = triedIds.includes(opt.id);
          const isWinner = resolved && prompt.correctOptionId === opt.id;

          let tileCls =
            "bg-[var(--surface-card)] deck-hover-lift hover:border-[var(--accent)]";
          if (isWinner) {
            tileCls =
              "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
          } else if (wasTried) {
            tileCls =
              "border-[var(--verdict-partial-border)] bg-[var(--surface-subtle)] opacity-75";
          } else if (resolved) {
            tileCls = "bg-[var(--surface-card)] opacity-50";
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={resolved || wasTried}
              onClick={() => onPick(opt.id)}
              className={`tactile-btn deck-card flex flex-col justify-between rounded-2xl p-5 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${style.lip} ${tileCls}`}
            >
              <div>
                <div className="mb-3 flex w-full items-center justify-between">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${style.medallionBg} ${style.medallionInk}`}
                  >
                    <TileIcon size={20} weight="duotone" />
                  </span>
                  {isWinner && <CheckCircle size={22} weight="fill" />}
                </div>

                <p className="text-sm font-bold leading-relaxed sm:text-base">
                  {opt.label}
                </p>
              </div>

              {wasTried && !isWinner && (
                <p className="mt-3 border-t border-[var(--border-subtle)] pt-2.5 text-xs font-medium text-[var(--verdict-partial-text)]">
                  تلميح: {opt.rationale}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. DRAFT-REVIEW -> Slide 26 & 27 Sticky Note + Live Highlighter Paper
 * ============================================================================ */
function DraftReviewStage({
  prompt,
  verifiedSafeIds,
  lastFeedback,
  resolved,
  onTapSegment,
}: {
  prompt: DraftReviewPrompt;
  verifiedSafeIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onTapSegment: (segmentId: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {prompt.roleContext}
      </p>

      <div className="mt-6 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
        {/* Right column in RTL: Slide 26 Warm Yellow Sticky Note */}
        <div className="deck-sticky-note rounded-2xl p-5 sm:p-6 lg:col-span-5 lg:-rotate-1">
          <div className="mb-3 flex items-center gap-2 text-[#6e4d00] dark:text-[#ffe08a]">
            <NoteBlank size={20} weight="duotone" />
            <h3 className="text-sm font-bold">ملاحظاتكم السريعة</h3>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--text-primary)]">
            {prompt.sourceNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b88400] dark:bg-[#ffc93c]" />
                <span className="font-medium">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Center AI + Coral Chevron badge from Slide 26 */}
        <div
          aria-hidden="true"
          className="hidden flex-col items-center justify-center gap-1.5 lg:col-span-1 lg:flex"
        >
          <span className="rounded-full bg-[#0e8a82] px-3 py-1 font-mono text-xs font-bold text-white">
            AI
          </span>
          <CaretLeft
            size={24}
            weight="bold"
            className="text-[var(--lip-coral)]"
          />
        </div>

        {/* Left column in RTL: Slide 26 & 27 Draft Card with 1-tap Yellow Highlighter */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-window-bar)] px-4 py-2.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {prompt.draftHeader}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]">
              <HighlighterCircle size={15} weight="duotone" />
              <span>انقر على الجملة الدخيلة لتظليلها</span>
            </span>
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            {prompt.segments.map((seg) => {
              const isSafeChecked = verifiedSafeIds.includes(seg.id);
              const showFlawHighlight = resolved && seg.isFlawed;

              let segBoxCls =
                "border-[var(--border-subtle)] bg-[var(--surface-page)]/70 hover:border-[var(--lip-gold)] hover:bg-[var(--surface-note)]/50";
              if (showFlawHighlight) {
                segBoxCls =
                  "border-[var(--lip-gold)] bg-[var(--surface-note)]";
              } else if (resolved || isSafeChecked) {
                segBoxCls =
                  "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)]/55";
              }

              return (
                <button
                  key={seg.id}
                  type="button"
                  disabled={resolved || isSafeChecked}
                  onClick={() => onTapSegment(seg.id)}
                  className={`tactile-btn flex flex-col items-start rounded-xl border p-3.5 text-right text-sm leading-relaxed ${segBoxCls}`}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <span
                      className={
                        showFlawHighlight
                          ? "rounded-md bg-[var(--highlight-marker)] px-1.5 py-0.5 font-bold text-[var(--highlight-marker-ink)]"
                          : "font-medium text-[var(--text-primary)]"
                      }
                    >
                      {seg.text}
                    </span>

                    {(isSafeChecked || (resolved && !seg.isFlawed)) && (
                      <CheckCircle
                        size={19}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-[var(--verdict-accurate-text)]"
                      />
                    )}
                  </div>

                  {(resolved || isSafeChecked) && (
                    <span className="mt-2 border-t border-[var(--border-subtle)] pt-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      {seg.note}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!resolved && lastFeedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-3.5 text-sm text-[var(--verdict-accurate-text)]">
          <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-95">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * CELEBRATION & COMPLETION VIEWS (Zero Exam Grades / Percentages!)
 * ============================================================================ */
function VerdictPanel({
  verdict,
  isLastPrompt,
  onNext,
  reduceMotion,
}: {
  verdict: Verdict;
  isLastPrompt: boolean;
  onNext: () => void;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 rounded-2xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-4 text-[var(--verdict-accurate-text)] sm:p-5"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-base font-bold">{verdict.headline}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-95">
            {verdict.explanation}
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="tactile-btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <span>{isLastPrompt ? "خلاصة الجزء" : "البطاقة التالية"}</span>
          <ArrowLeft size={16} weight="bold" />
        </button>
      </div>
    </motion.div>
  );
}

function CompletionView({
  activity,
  state,
  nextActivity,
  onRestart,
  reduceMotion,
}: {
  activity: Activity;
  state: ReturnType<typeof startActivity>;
  nextActivity: Activity | null;
  onRestart: () => void;
  reduceMotion: boolean;
}) {
  const summary = summarizeSession(state);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="deck-card deck-lip-teal rounded-2xl p-6 sm:p-10"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-[var(--verdict-accurate-bg)] px-3.5 py-1.5 text-xs font-bold text-[var(--verdict-accurate-text)]">
        <CheckCircle size={18} weight="fill" />
        <span>اكتملت محطة {activity.partBadge}</span>
      </div>

      <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        ذاكرة نشطة! استرجعتَ أفكار {activity.partBadge} كاملة
      </h2>

      <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
        كشفتَ جميع البطاقات ({summary.totalPrompts} من {summary.totalPrompts})، منها{" "}
        <span className="font-bold text-[var(--accent)] tabular-nums">
          {summary.accurateCount}
        </span>{" "}
        من اللمسة الأولى.
      </p>

      {/* Slide 5 / Slide 21 style deep indigo takeaway card */}
      <div className="mt-6 rounded-2xl bg-[#1e2a4a] p-5 text-[#faf6ee] sm:p-6">
        <span className="inline-block rounded-full bg-[#ffc93c] px-3 py-0.5 text-xs font-bold text-[#1e2a4a]">
          الفكرة الباقية في الذاكرة
        </span>
        <p className="mt-3 text-base font-medium leading-relaxed sm:text-lg">
          {summary.takeaway}
        </p>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {nextActivity ? (
            <Link
              href={`/${nextActivity.slug}/`}
              className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <span>انتقل إلى {nextActivity.shortTitle}</span>
              <ArrowLeft size={16} weight="bold" />
            </Link>
          ) : (
            <Link
              href="/"
              className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <House size={18} weight="bold" />
              <span>العودة إلى لوحة الجلسة</span>
            </Link>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            <span>اللعب مجدداً</span>
          </button>
        </div>

        <Link
          href="/"
          className="text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
        >
          عرض جميع محطات الجلسة
        </Link>
      </div>
    </motion.section>
  );
}
