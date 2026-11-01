"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  ChatCenteredDots,
  Check,
  CheckCircle,
  Clock,
  Confetti,
  DotsSixVertical,
  HandTap,
  HighlighterCircle,
  Info,
  Lightbulb,
  LinkSimpleHorizontal,
  NoteBlank,
  SealCheck,
  SelectionInverse,
  ShieldCheck,
  Sparkle,
  Stack,
  Trophy,
  X,
  XCircle,
} from "@phosphor-icons/react";
import type {
  Activity,
  BucketSortPrompt,
  ChoicePrompt,
  DraftReviewPrompt,
  MatchingPrompt,
  MythFactPrompt,
  OddOneOutPrompt,
  SequencePrompt,
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
  loadProgress,
  recordCompletion,
  type SessionProgressMap,
} from "@/engine/progress-store";
import { BucketSortBoard } from "./bucket-sort-board";
import { MECHANIC_META } from "./hub-bento";
import { CopyLinkButton, ThemeToggle } from "./theme-toggle";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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
}: {
  activity: Activity;
}) {
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => startActivity(activity));
  const [progressMap, setProgressMap] = useState<SessionProgressMap>({});

  useEffect(() => {
    setHydrated(true);
    setProgressMap(loadProgress(getBrowserStorageAdapter()));
  }, []);

  const [selectedMythFact, setSelectedMythFact] = useState<
    "myth" | "fact" | null
  >(null);
  const [triedOptionIds, setTriedOptionIds] = useState<string[]>([]);
  const [triedOddMemberIds, setTriedOddMemberIds] = useState<string[]>([]);
  const [verifiedSafeSegmentIds, setVerifiedSafeSegmentIds] = useState<
    string[]
  >([]);

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
      const updated = recordCompletion(
        getBrowserStorageAdapter(),
        activity.slug,
        summary.masteryPercent
      );
      setProgressMap(updated);
    }
  }, [state, activity.slug]);

  function resetLocalSelections() {
    setSelectedMythFact(null);
    setTriedOptionIds([]);
    setTriedOddMemberIds([]);
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

  function handleBucketSortStep(itemId: string, bucketId: string): Verdict {
    const res = submitResponse(state, {
      mechanic: "bucket-sort",
      itemId,
      bucketId,
    });
    setState(res.state);
    return res.verdict;
  }

  function handleMythFactPick(judgment: "myth" | "fact") {
    if (state.currentVerdict) return;
    setSelectedMythFact(judgment);
    const res = submitResponse(state, { mechanic: "myth-fact", judgment });
    setState(res.state);
  }

  function handleOddOneOutPick(itemId: string) {
    if (state.currentVerdict) return;
    const res = submitResponse(state, { mechanic: "odd-one-out", itemId });
    setState(res.state);
    if (!res.verdict.promptResolved && !triedOddMemberIds.includes(itemId)) {
      setTriedOddMemberIds((prev) => [...prev, itemId]);
    }
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
              <span>كل الأجزاء</span>
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-2 transition-opacity hover:opacity-85 sm:flex"
            >
              <img
                src={`${BASE_PATH}/assets/formal-templates/logo-transparent.png`}
                alt="شركة حلول المستقبل للتدريب"
                className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
              />
            </Link>
            <span className="hidden text-sm font-bold text-[var(--text-primary)] md:inline">
              {activity.shortTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {!state.completed && (
              <span className="whitespace-nowrap rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)] tabular-nums">
                اللعبة {ARABIC_DIGITS[state.currentIndex] ?? state.currentIndex + 1}{" "}
                من {ARABIC_DIGITS[totalPrompts - 1] ?? totalPrompts}
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
        {!state.completed && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full border border-[var(--lip-teal)]/35 bg-[var(--accent-soft)] px-3 py-1 text-[var(--medallion-teal-ink)]">
                {activity.partBadge} · {activity.slideRange}
              </span>
              <span className="font-medium text-[var(--text-muted)]">
                {activity.agendaSlot}
              </span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold leading-snug text-[var(--text-primary)] sm:text-3xl">
              {activity.title}
            </h1>
          </div>
        )}

        <AnimatePresence mode="wait">
          {state.completed ? (
            <CompletionView
              key="completion"
              activity={activity}
              state={state}
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
              {/* Game header & circular Arabic step badges */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div className="inline-flex items-center gap-2.5">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${stageTheme.medallionBg} ${stageTheme.medallionInk}`}
                  >
                    <CurrentMechanicIcon size={21} weight="duotone" />
                  </span>
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {currentMechanicMeta.label}
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      نشاط تفاعلي سريع من أفكار هذا الجزء
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

              {currentPrompt.mechanic === "bucket-sort" && (
                <BucketSortStage
                  key={currentPrompt.id}
                  prompt={currentPrompt}
                  sortedItemIds={state.sortedItemIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onSortItem={handleBucketSortStep}
                />
              )}

              {currentPrompt.mechanic === "matching" && (
                <SnapMatchStage
                  key={currentPrompt.id}
                  prompt={currentPrompt}
                  shuffledExamples={shuffledExamples}
                  matchedPairIds={state.matchedPairIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onPairAttempt={handleMatchingPairAttempt}
                  reduceMotion={Boolean(reduceMotion)}
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

              {currentPrompt.mechanic === "draft-review" && (
                <DraftReviewStage
                  prompt={currentPrompt}
                  verifiedSafeIds={verifiedSafeSegmentIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onTapSegment={handleTapDraftSegment}
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

              {currentPrompt.mechanic === "odd-one-out" && (
                <OddOneOutStage
                  prompt={currentPrompt}
                  triedMemberIds={triedOddMemberIds}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onPick={handleOddOneOutPick}
                />
              )}

              {currentPrompt.mechanic === "choice" && (
                <ScenarioChoiceStage
                  prompt={currentPrompt}
                  triedIds={triedOptionIds}
                  resolved={state.currentVerdict !== null}
                  onPick={handleChoicePick}
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

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] py-4 text-xs text-[var(--text-secondary)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={`${BASE_PATH}/assets/formal-templates/logo-transparent.png`}
              alt="شركة حلول المستقبل للتدريب"
              className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
            />
            <span className="font-medium">شركة حلول المستقبل للتدريب</span>
          </div>
          <span>الذكاء الاصطناعي في العمل</span>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
 * SHARED 1-GLANCE INSTRUCTION STRIP ("كيف تلعب؟")
 * ============================================================================ */
function HowToPlayStrip({ text }: { text: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/85 px-3.5 py-2.5 text-xs sm:text-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--medallion-teal-ink)]">
        <HandTap size={16} weight="duotone" />
      </span>
      <p className="font-medium text-[var(--text-primary)]">
        <span className="font-bold text-[var(--accent)]">كيف تلعب: </span>
        {text}
      </p>
    </div>
  );
}

/* ============================================================================
 * 1. BUCKET-SORT -> Drag Pieces into Actual Named Buckets!
 * ============================================================================ */
function BucketSortStage({
  prompt,
  sortedItemIds,
  lastFeedback,
  resolved,
  onSortItem,
}: {
  prompt: BucketSortPrompt;
  sortedItemIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onSortItem: (itemId: string, bucketId: string) => Verdict;
}) {
  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-3 mb-3 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>

      <HowToPlayStrip text={prompt.instruction} />

      <BucketSortBoard
        buckets={prompt.buckets}
        items={prompt.items}
        sortedItemIds={sortedItemIds}
        lastFeedback={lastFeedback}
        resolved={resolved}
        onSortItem={onSortItem}
      />
    </div>
  );
}

/* ============================================================================
 * 2. MATCHING -> 100% Face-Up Snap-Pair Connector (Tap or Drag Either Side!)
 * ============================================================================ */
function SnapMatchStage({
  prompt,
  shuffledExamples,
  matchedPairIds,
  lastFeedback,
  resolved,
  onPairAttempt,
  reduceMotion,
}: {
  prompt: MatchingPrompt;
  shuffledExamples: readonly { id: string; concept: string; example: string }[];
  matchedPairIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onPairAttempt: (conceptPairId: string, examplePairId: string) => Verdict;
  reduceMotion: boolean;
}) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    null
  );
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(
    null
  );
  const [dragConceptId, setDragConceptId] = useState<string | null>(null);
  const [hoverExampleId, setHoverExampleId] = useState<string | null>(null);

  function attemptConnect(conceptId: string, exampleId: string) {
    setSelectedConceptId(null);
    setSelectedExampleId(null);
    setDragConceptId(null);
    setHoverExampleId(null);
    onPairAttempt(conceptId, exampleId);
  }

  function handleTapConcept(conceptId: string) {
    if (resolved || matchedPairIds.includes(conceptId)) return;
    if (selectedExampleId) {
      attemptConnect(conceptId, selectedExampleId);
      return;
    }
    setSelectedConceptId((prev) => (prev === conceptId ? null : conceptId));
  }

  function handleTapExample(exampleId: string) {
    if (resolved || matchedPairIds.includes(exampleId)) return;
    if (selectedConceptId) {
      attemptConnect(selectedConceptId, exampleId);
      return;
    }
    setSelectedExampleId((prev) => (prev === exampleId ? null : exampleId));
  }

  const matchedPairs = prompt.pairs.filter((p) =>
    matchedPairIds.includes(p.id)
  );
  const remainingConcepts = prompt.pairs.filter(
    (p) => !matchedPairIds.includes(p.id)
  );
  const remainingExamples = shuffledExamples.filter(
    (p) => !matchedPairIds.includes(p.id)
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
          {prompt.title}
        </h2>
        <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)] tabular-nums">
          تم توصيل {matchedPairIds.length} من {prompt.pairs.length}
        </span>
      </div>

      <HowToPlayStrip
        text={`${prompt.instruction} (يمكنك البدء من أي عمود أو سحب البطاقة مباشرة).`}
      />

      {/* Connected Pairs Shelf */}
      {matchedPairs.length > 0 && (
        <div className="mb-5 flex flex-col gap-2.5">
          {matchedPairs.map((pair) => (
            <motion.div
              key={pair.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-3.5 text-[var(--verdict-accurate-text)] sm:grid-cols-11"
            >
              <div className="text-sm font-bold sm:col-span-5">
                {pair.concept}
              </div>
              <div className="flex items-center justify-center sm:col-span-1">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                  <LinkSimpleHorizontal size={15} weight="bold" />
                </span>
              </div>
              <div className="text-xs font-semibold leading-relaxed sm:col-span-5 sm:text-sm">
                {pair.example}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Unmatched Two-Column Board */}
      {!resolved && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Right Column in RTL: Concepts */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--text-muted)]">
              ١. المفاهيم ({remainingConcepts.length} متبقية)
            </span>
            {remainingConcepts.map((pair) => {
              const isSelected = selectedConceptId === pair.id;
              return (
                <button
                  key={pair.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", pair.id);
                    setDragConceptId(pair.id);
                  }}
                  onDragEnd={() => {
                    setDragConceptId(null);
                    setHoverExampleId(null);
                  }}
                  onClick={() => handleTapConcept(pair.id)}
                  className={`tactile-btn deck-card deck-lip-teal flex items-center justify-between gap-3 rounded-2xl p-4 text-right transition-[transform,border-color,background-color,box-shadow] ${
                    isSelected
                      ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
                      : "deck-hover-lift bg-[var(--surface-card)] hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="text-sm font-bold leading-relaxed text-[var(--text-primary)] sm:text-base">
                    {pair.concept}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border-strong)] bg-[var(--surface-page)] text-[var(--text-muted)]"
                    }`}
                  >
                    <CaretLeft size={14} weight="bold" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Left Column in RTL: Shuffled Examples */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--text-muted)]">
              ٢. الأمثلة والأوصاف المطابقة
            </span>
            {remainingExamples.map((pair) => {
              const isSelected = selectedExampleId === pair.id;
              const isHoverTarget = hoverExampleId === pair.id;
              const waitingForMatch = Boolean(selectedConceptId || dragConceptId);
              return (
                <button
                  key={pair.id}
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverExampleId(pair.id);
                  }}
                  onDragLeave={() => setHoverExampleId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedConceptId =
                      e.dataTransfer.getData("text/plain") || dragConceptId;
                    if (droppedConceptId) {
                      attemptConnect(droppedConceptId, pair.id);
                    }
                  }}
                  onClick={() => handleTapExample(pair.id)}
                  className={`tactile-btn deck-card deck-lip-indigo flex items-center justify-between gap-3 rounded-2xl p-4 text-right transition-[transform,border-color,background-color,box-shadow] ${
                    isSelected || isHoverTarget
                      ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
                      : waitingForMatch
                      ? "border-dashed border-[var(--accent)] bg-[var(--surface-card)] hover:bg-[var(--accent-soft)]/40"
                      : "deck-hover-lift bg-[var(--surface-card)] hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
                    {pair.example}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected || isHoverTarget
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border-strong)] bg-[var(--surface-page)] text-[var(--text-muted)]"
                    }`}
                  >
                    <LinkSimpleHorizontal size={14} weight="bold" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Helpful active selection prompt or mismatch nudge */}
      {!resolved && (selectedConceptId || selectedExampleId) && (
        <p className="mt-4 text-center text-xs font-bold text-[var(--accent)]">
          ممتاز! الآن اضغط على البطاقة المطابقة لها في العمود المقابل لتوصيلهما.
        </p>
      )}

      {!resolved && lastFeedback && lastFeedback.outcome === "revisit" && (
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
 * 3. SEQUENCE -> Slide 6 / 14 / 21 / 25 Horizontal Step Flow (Tap or Drag!)
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
  const totalSlots = prompt.stepsInOrder.length;
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array(totalSlots).fill(null)
  );
  const [lockedIndices, setLockedIndices] = useState<number[]>([]);
  const [hoverSlotIdx, setHoverSlotIdx] = useState<number | null>(null);

  const stepById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of prompt.stepsInOrder) {
      map.set(s.id, s.label);
    }
    return map;
  }, [prompt.stepsInOrder]);

  const placedSet = new Set(slots.filter((id): id is string => id !== null));
  const availableSteps = poolSteps.filter((s) => !placedSet.has(s.id));
  const nextEmptyIdx = slots.findIndex((id) => id === null);

  function commitSlots(next: (string | null)[]) {
    setSlots(next);
    if (next.every((id) => id !== null)) {
      const verdict = onSubmitSequence(next as string[]);
      if (!verdict.promptResolved) {
        const nextLocked: number[] = [];
        const cleaned = next.map((id, idx) => {
          if (id === prompt.stepsInOrder[idx].id) {
            nextLocked.push(idx);
            return id;
          }
          return null;
        });
        setLockedIndices(nextLocked);
        setSlots(cleaned);
      } else {
        setLockedIndices(prompt.stepsInOrder.map((_, idx) => idx));
      }
    }
  }

  function handlePlaceIntoNextEmpty(stepId: string) {
    if (resolved) return;
    const emptyIdx = slots.findIndex((id) => id === null);
    if (emptyIdx === -1) return;
    const next = [...slots];
    next[emptyIdx] = stepId;
    commitSlots(next);
  }

  function handleDropIntoSlot(slotIdx: number, stepId: string) {
    setHoverSlotIdx(null);
    if (resolved || lockedIndices.includes(slotIdx)) return;
    if (!stepById.has(stepId)) return;
    const next = slots.map((existing, i) =>
      existing === stepId && !lockedIndices.includes(i) ? null : existing
    );
    next[slotIdx] = stepId;
    commitSlots(next);
  }

  function handleRemoveSlot(slotIdx: number) {
    if (resolved || lockedIndices.includes(slotIdx)) return;
    const next = [...slots];
    next[slotIdx] = null;
    setSlots(next);
  }

  const gridColsClass =
    totalSlots === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>
      <h2 className="mt-3 mb-3 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>

      <HowToPlayStrip text={prompt.instruction} />

      {/* Horizontal Slide-Deck Slot Track */}
      <div className={`mt-6 grid grid-cols-1 gap-4 ${gridColsClass}`}>
        {slots.map((stepId, idx) => {
          const isLocked = lockedIndices.includes(idx);
          const isNextTarget = !resolved && idx === nextEmptyIdx;
          const isHovered = hoverSlotIdx === idx;
          const lipStyle = LIP_CYCLE[idx % LIP_CYCLE.length].lip;

          return (
            <div key={idx} className="relative flex items-stretch">
              <div
                onDragOver={(e) => {
                  if (!resolved && !isLocked) {
                    e.preventDefault();
                    setHoverSlotIdx(idx);
                  }
                }}
                onDragLeave={() => setHoverSlotIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedId = e.dataTransfer.getData("text/plain");
                  if (droppedId) handleDropIntoSlot(idx, droppedId);
                }}
                className={`relative flex min-h-[124px] w-full flex-col justify-between rounded-2xl p-4 transition-[transform,border-color,background-color,box-shadow] ${
                  stepId
                    ? isLocked
                      ? "deck-card border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
                      : `deck-card ${lipStyle} bg-[var(--surface-card)]`
                    : isHovered || isNextTarget
                    ? "border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/35"
                    : "border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)]/55"
                }`}
              >
                {/* Perched Slide-Deck Circular Arabic Number Badge */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isLocked
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-navy)] text-[var(--text-navy-surface)]"
                    }`}
                  >
                    {ARABIC_DIGITS[idx] ?? idx + 1}
                  </span>

                  {stepId && !isLocked && !resolved && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(idx)}
                      aria-label="إرجاع البطاقة"
                      className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                    >
                      <X size={15} weight="bold" />
                    </button>
                  )}

                  {isLocked && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold">
                      <CheckCircle size={16} weight="fill" />
                      <span>مُثبّت</span>
                    </span>
                  )}
                </div>

                {stepId ? (
                  <p className="text-sm font-semibold leading-relaxed">
                    {stepById.get(stepId)}
                  </p>
                ) : (
                  <p
                    className={`text-xs font-semibold ${
                      isNextTarget
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {isNextTarget
                      ? `اضغط على بطاقة بالأسفل لوضع الخطوة ${ARABIC_DIGITS[idx]} هنا`
                      : `خانة الخطوة ${ARABIC_DIGITS[idx]}`}
                  </p>
                )}
              </div>

              {idx < totalSlots - 1 && (
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

      {/* Gentle Nudge Banner when partial */}
      {!resolved && lastFeedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] p-3.5 text-sm text-[var(--verdict-partial-text)]">
          <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-95">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}

      {/* Unplaced Card Tray */}
      {!resolved && availableSteps.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 text-xs font-bold text-[var(--text-secondary)]">
            بطاقات الخطوات المتاحة (اضغط لوضعها في الخانة رقم{" "}
            {ARABIC_DIGITS[nextEmptyIdx] ?? nextEmptyIdx + 1} أو اسحبها):
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {availableSteps.map((step, i) => {
              const lip = LIP_CYCLE[i % LIP_CYCLE.length].lip;
              return (
                <button
                  key={step.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", step.id);
                  }}
                  onClick={() => handlePlaceIntoNextEmpty(step.id)}
                  className={`tactile-btn deck-card deck-hover-lift flex cursor-grab items-center justify-between gap-3 rounded-xl p-4 text-right text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] active:cursor-grabbing ${lip}`}
                >
                  <span className="leading-relaxed">{step.label}</span>
                  <DotsSixVertical
                    size={18}
                    weight="bold"
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 4. DRAFT-REVIEW -> Slide 26 & 27 Sticky Note + Live Highlighter Paper
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
      <h2 className="mb-3 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>

      <HowToPlayStrip text={prompt.roleContext} />

      <div className="mt-5 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
        {/* Right column in RTL: Slide 26 Warm Yellow Sticky Note */}
        <div className="deck-sticky-note rounded-2xl p-5 sm:p-6 lg:col-span-5 lg:-rotate-1">
          <div className="mb-3 flex items-center gap-2 text-[#6e4d00] dark:text-[#ffe08a]">
            <NoteBlank size={20} weight="duotone" />
            <h3 className="text-sm font-bold">ملاحظاتكم الأصلية</h3>
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
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--medallion-gold)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--medallion-gold-ink)]">
              <HighlighterCircle size={14} weight="fill" />
              <span>اضغط على الجملة الخاطئة لتظليلها</span>
            </span>
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            {prompt.segments.map((seg) => {
              const isSafeChecked = verifiedSafeIds.includes(seg.id);
              const showFlawHighlight = resolved && seg.isFlawed;

              let segBoxCls =
                "group border-[var(--border-subtle)] bg-[var(--surface-page)]/70 hover:border-[var(--lip-gold)] hover:bg-[var(--surface-note)]/60";
              if (showFlawHighlight) {
                segBoxCls =
                  "border-[var(--lip-gold)] bg-[var(--surface-note)] shadow-sm";
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

                    {!resolved && !isSafeChecked && (
                      <span className="shrink-0 rounded-md bg-[var(--medallion-gold)] px-2 py-0.5 text-[11px] font-bold text-[var(--medallion-gold-ink)] opacity-75 group-hover:opacity-100">
                        ظلّل
                      </span>
                    )}

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
 * 5. MYTH-FACT -> Tactile Stamp Card + Slide 28 Side-by-Side Reveal
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
      <HowToPlayStrip text="اقرأ العبارة التالية ثم اختمها بأحد الختمين بالأسفل: خرافة شائعة أم حقيقة صحيحة؟" />

      {/* Statement Card */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-page)] p-5 sm:p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--medallion-teal)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
          <ChatCenteredDots size={16} weight="duotone" />
          <span>بطاقة الادعاء</span>
        </div>
        <p className="text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
          &laquo;{prompt.claim}&raquo;
        </p>
      </div>

      {/* Stamp buttons */}
      {!resolved ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("myth")}
            className="tactile-btn deck-card deck-lip-coral deck-hover-lift flex items-center justify-between gap-4 rounded-2xl p-5 text-right hover:border-[var(--lip-coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                اختم: خرافة شائعة
              </span>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                مبالغة أو تعميم غير صحيح
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
                اختم: حقيقة صحيحة
              </span>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                عبارة واقعية تتفق مع الجلسة
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
                {prompt.reality === "myth" ? "ختم الخرافة" : "ختم الحقيقة"}
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
              <span className="text-xs font-bold">الخلاصة في الشريحة</span>
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
 * 6. ODD-ONE-OUT -> Spot and Pop the 1 Impostor Card out of 4!
 * ============================================================================ */
function OddOneOutStage({
  prompt,
  triedMemberIds,
  lastFeedback,
  resolved,
  onPick,
}: {
  prompt: OddOneOutPrompt;
  triedMemberIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  onPick: (itemId: string) => void;
}) {
  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-3 mb-3 text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>

      <HowToPlayStrip text="ثلاث بطاقات صحيحة تنتمي للمجموعة، وبطاقة واحدة فقط دخيلة. اضغط على البطاقة الدخيلة لاستبعادها!" />

      {/* Group Rule Banner */}
      <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[var(--lip-indigo)]/25 bg-[var(--medallion-indigo)] px-4 py-3 text-sm font-bold text-[var(--medallion-indigo-ink)]">
        <SelectionInverse size={20} weight="duotone" className="shrink-0" />
        <span>{prompt.groupRule}</span>
      </div>

      {/* 2x2 Face-Up Group Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {prompt.items.map((item, idx) => {
          const style = LIP_CYCLE[idx % LIP_CYCLE.length];
          const wasCheckedMember = triedMemberIds.includes(item.id);
          const isCaughtImpostor = resolved && item.isOdd;
          const isConfirmedMember =
            wasCheckedMember || (resolved && !item.isOdd);

          let cardCls =
            "deck-hover-lift bg-[var(--surface-card)] hover:border-[var(--lip-coral)]";
          if (isCaughtImpostor) {
            cardCls =
              "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
          } else if (isConfirmedMember) {
            cardCls =
              "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)]/65 text-[var(--verdict-accurate-text)]";
          }

          return (
            <button
              key={item.id}
              type="button"
              disabled={resolved || wasCheckedMember}
              onClick={() => onPick(item.id)}
              className={`tactile-btn deck-card flex flex-col justify-between rounded-2xl p-5 text-right transition-[transform,border-color,background-color,box-shadow] ${style.lip} ${cardCls}`}
            >
              <div>
                <div className="mb-3 flex w-full items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-navy)] text-xs font-bold text-[var(--text-navy-surface)]">
                    {ARABIC_DIGITS[idx]}
                  </span>

                  {isCaughtImpostor && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lip-coral)] px-2.5 py-0.5 text-xs font-bold text-white">
                      <XCircle size={15} weight="fill" />
                      <span>البطاقة الدخيلة!</span>
                    </span>
                  )}

                  {isConfirmedMember && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--verdict-accurate-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--verdict-accurate-text)]">
                      <CheckCircle size={15} weight="fill" />
                      <span>تنتمي للمجموعة</span>
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold leading-relaxed sm:text-base">
                  {item.label}
                </p>
              </div>

              {(resolved || wasCheckedMember) && (
                <p className="mt-3 border-t border-[var(--border-subtle)] pt-2 text-xs font-medium opacity-90">
                  {item.note}
                </p>
              )}
            </button>
          );
        })}
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
 * 7. CHOICE -> 3-Card Workplace Roleplay Decision
 * ============================================================================ */
function ScenarioChoiceStage({
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
  const gridCols =
    prompt.options.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-3 mb-3 text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
        {prompt.question}
      </h2>

      <HowToPlayStrip text="تخيّل نفسك في هذا الموقف واضغط على بطاقة التصرّف الأذكى!" />

      <div className={`mt-5 grid grid-cols-1 gap-4 ${gridCols}`}>
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
              "border-[var(--verdict-partial-border)] bg-[var(--surface-subtle)] opacity-80";
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
 * ROUND VERDICT & ARABIC "GREAT JOB!" CELEBRATION SCREEN AFTER EACH SECTION
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
          className="tactile-btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {isLastPrompt ? (
            <>
              <Confetti size={18} weight="fill" />
              <span>احتفال نهاية الجزء</span>
            </>
          ) : (
            <>
              <span>اللعبة التالية</span>
              <ArrowLeft size={16} weight="bold" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

const CONFETTI_PARTICLES = [
  { x: -130, y: -42, rot: -28, color: "#FFC93C", size: 12, round: false },
  { x: -95, y: -68, rot: 22, color: "#0E8A82", size: 10, round: true },
  { x: -62, y: -36, rot: -15, color: "#E8573A", size: 11, round: false },
  { x: -28, y: -74, rot: 35, color: "#223162", size: 9, round: true },
  { x: 0, y: -82, rot: 12, color: "#FFC93C", size: 13, round: false },
  { x: 32, y: -72, rot: -30, color: "#E8573A", size: 10, round: true },
  { x: 66, y: -38, rot: 18, color: "#0E8A82", size: 12, round: false },
  { x: 98, y: -64, rot: -24, color: "#FFC93C", size: 10, round: true },
  { x: 132, y: -40, rot: 29, color: "#223162", size: 11, round: false },
  { x: -115, y: 12, rot: 40, color: "#0E8A82", size: 9, round: false },
  { x: 118, y: 14, rot: -36, color: "#E8573A", size: 9, round: false },
] as const;

function CompletionView({
  activity,
  state,
  onRestart,
  reduceMotion,
}: {
  activity: Activity;
  state: ReturnType<typeof startActivity>;
  onRestart: () => void;
  reduceMotion: boolean;
}) {
  const summary = summarizeSession(state);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="deck-card deck-lip-gold relative overflow-hidden rounded-3xl p-6 sm:p-10"
    >
      {/* Celebratory Header Centerpiece */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5 flex items-center justify-center pt-4">
          {/* Geometric Slide-Deck Confetti Burst */}
          {!reduceMotion &&
            CONFETTI_PARTICLES.map((p, idx) => (
              <motion.span
                key={idx}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1],
                  x: p.x,
                  y: p.y,
                  scale: 1,
                  rotate: p.rot,
                }}
                transition={{
                  duration: 0.55,
                  delay: 0.05 + idx * 0.02,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
                className={`pointer-events-none absolute ${
                  p.round ? "rounded-full" : "rounded-[3px]"
                }`}
              />
            ))}

          {/* Glowing Marigold Trophy Crest */}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#fff3cf] bg-[#ffc93c] text-[#1e2a4a] shadow-lg"
          >
            <Trophy size={48} weight="fill" />
          </motion.div>
        </div>

        {/* Festive Arabic Great Job Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] px-4 py-1.5 text-sm font-bold text-[var(--verdict-accurate-text)]">
          <Confetti size={18} weight="fill" />
          <span>أحسنت! عمل رائع في {activity.partBadge}</span>
        </span>

        <h2 className="mt-4 text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl">
          أتقنت ألعاب {activity.partBadge} بنجاح
        </h2>

        <p className="mt-2.5 max-w-[56ch] text-sm font-medium leading-relaxed text-[var(--text-secondary)] sm:text-base">
          أكملت جميع الأنشطة التفاعلية في «{activity.title}» (
          {ARABIC_DIGITS[summary.totalPrompts - 1] ?? summary.totalPrompts} من{" "}
          {ARABIC_DIGITS[summary.totalPrompts - 1] ?? summary.totalPrompts} ألعاب
          مكتملة).
        </p>

        {/* Completed Games Stamp Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {activity.prompts.map((prompt, idx) => {
            const meta = MECHANIC_META[prompt.mechanic];
            return (
              <span
                key={prompt.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] px-3 py-1.5 text-xs font-bold text-[var(--verdict-accurate-text)]"
              >
                <SealCheck size={16} weight="fill" />
                <span>
                  {ARABIC_DIGITS[idx]} · {meta.label}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Slide 5 / Slide 21 style deep indigo takeaway card */}
      <div className="mt-7 rounded-2xl bg-[#1e2a4a] p-5 text-[#faf6ee] sm:p-6">
        <span className="inline-block rounded-full bg-[#ffc93c] px-3 py-0.5 text-xs font-bold text-[#1e2a4a]">
          الفكرة الذهبية من {activity.partBadge}
        </span>
        <p className="mt-3 text-base font-medium leading-relaxed sm:text-lg">
          {summary.takeaway}
        </p>
      </div>

      {/* Classroom standby message: wait for the trainer's cue */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/80 p-4 sm:p-5 text-right">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--medallion-teal-ink)]">
          <Clock size={22} weight="duotone" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
            اكتمل نشاط {activity.partBadge} بنجاح
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            تابع الآن مع المدرّب في القاعة؛ وسيرسل لكم رابط النشاط التالي فور انتهاء الجزء القادم من العرض التقديمي.
          </p>
        </div>
      </div>

      {/* Action Buttons: Standalone replay and copy link without external links */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] sm:text-base"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
          <span>إعادة لعب هذا الجزء</span>
        </button>

        <CopyLinkButton
          relativePath={activity.slug}
          label="مشاركة رابط هذا النشاط"
        />
      </div>

      <div className="mt-8 flex items-center justify-center gap-2.5 opacity-85">
        <img
          src={`${BASE_PATH}/assets/formal-templates/logo-transparent.png`}
          alt="شركة حلول المستقبل للتدريب"
          className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
        />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          شركة حلول المستقبل للتدريب
        </span>
      </div>
    </motion.section>
  );
}
