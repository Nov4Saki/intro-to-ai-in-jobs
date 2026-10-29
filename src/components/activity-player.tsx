"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  FlagBanner,
  GearSix,
  House,
  Info,
  Question,
  Robot,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  Activity,
  ChoicePrompt,
  DraftReviewPrompt,
  MatchingPrompt,
  MythFactPrompt,
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
import { CopyLinkButton, ThemeToggle } from "./theme-toggle";

const ARABIC_OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ"];

function permuteExamplesDeterministically<T extends { id: string }>(
  items: readonly T[]
): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const hashA = a.id
      .split("")
      .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 7), 0);
    const hashB = b.id
      .split("")
      .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 7), 0);
    return hashB - hashA;
  });
  // Ensure at least one offset if sort happened to match original order
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
  const [state, setState] = useState(() => startActivity(activity));

  // Per-prompt local UI selections
  const [selectedTriage, setSelectedTriage] = useState<TriageBucket | null>(null);
  const [selectedMythFact, setSelectedMythFact] = useState<
    "myth" | "fact" | null
  >(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [flaggedSegmentIds, setFlaggedSegmentIds] = useState<string[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const currentPrompt = getCurrentPrompt(state);
  const totalPrompts = activity.prompts.length;
  const progressRatio = state.completed
    ? 1
    : (state.currentIndex + (state.currentVerdict ? 1 : 0)) / totalPrompts;

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
    setSelectedTriage(null);
    setSelectedMythFact(null);
    setSelectedChoiceId(null);
    setSelectedConceptId(null);
    setFlaggedSegmentIds([]);
    setErrorBanner(null);
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
    setSelectedTriage(bucket);
    const res = submitResponse(state, { mechanic: "triage", bucket });
    setState(res.state);
  }

  function handleMythFactPick(judgment: "myth" | "fact") {
    if (state.currentVerdict) return;
    setSelectedMythFact(judgment);
    const res = submitResponse(state, { mechanic: "myth-fact", judgment });
    setState(res.state);
  }

  function handleChoicePick(optionId: string) {
    if (state.currentVerdict) return;
    setSelectedChoiceId(optionId);
    const res = submitResponse(state, { mechanic: "choice", optionId });
    setState(res.state);
  }

  function handleMatchingExamplePick(examplePairId: string) {
    if (state.currentVerdict) return;
    if (!selectedConceptId) {
      setErrorBanner("اختر المهمة من العمود الأيمن أولاً، ثم انقر على المثال المطابق لها.");
      return;
    }
    setErrorBanner(null);
    const res = submitResponse(state, {
      mechanic: "matching",
      conceptPairId: selectedConceptId,
      examplePairId,
    });
    setState(res.state);
    if (res.verdict.outcome === "accurate") {
      setSelectedConceptId(null);
    }
  }

  function toggleSegmentFlag(segmentId: string) {
    if (state.currentVerdict) return;
    setErrorBanner(null);
    setFlaggedSegmentIds((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId]
    );
  }

  function handleSubmitDraftReview() {
    if (state.currentVerdict) return;
    if (flaggedSegmentIds.length === 0) {
      setErrorBanner(
        "حدّد جملة واحدة على الأقل تحتوي على خلل أو افتراض غير مؤكد قبل اعتماد المراجعة."
      );
      return;
    }
    setErrorBanner(null);
    const res = submitResponse(state, {
      mechanic: "draft-review",
      flaggedSegmentIds,
    });
    setState(res.state);
  }

  const shuffledExamples = useMemo(() => {
    if (currentPrompt.mechanic !== "matching") return [];
    return permuteExamplesDeterministically(currentPrompt.pairs);
  }, [currentPrompt]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--surface-page)]">
      {/* Top sticky bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-page)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <ArrowRight size={16} weight="bold" />
              <span>كل الأنشطة</span>
            </Link>
            <span className="hidden text-sm font-semibold text-[var(--text-primary)] sm:inline">
              {activity.shortTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {!state.completed && (
              <span className="rounded-xl bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                {state.currentIndex + 1} / {totalPrompts}
              </span>
            )}
            <CopyLinkButton label="مشاركة النشاط" compact />
            <ThemeToggle />
          </div>
        </div>
        {/* Thin hardware-accelerated progress line without heavy track clutter */}
        <div className="h-[2px] w-full overflow-hidden bg-transparent">
          <div
            style={{ transform: `scaleX(${progressRatio})` }}
            className="h-full w-full origin-right bg-[var(--accent)] transition-transform duration-300 ease-out"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        {/* Activity intro header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[var(--accent)]">
            {activity.agendaSlot}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold leading-snug text-[var(--text-primary)] sm:text-3xl">
            {activity.title}
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
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
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="surface-elevated rounded-2xl p-5 sm:p-8"
            >
              {currentPrompt.mechanic === "triage" && (
                <TriageStage
                  prompt={currentPrompt}
                  selected={selectedTriage}
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
                <ChoiceStage
                  prompt={currentPrompt}
                  selectedId={selectedChoiceId}
                  resolved={state.currentVerdict !== null}
                  onPick={handleChoicePick}
                />
              )}

              {currentPrompt.mechanic === "matching" && (
                <MatchingStage
                  prompt={currentPrompt}
                  shuffledExamples={shuffledExamples}
                  matchedPairIds={state.matchedPairIds}
                  selectedConceptId={selectedConceptId}
                  lastFeedback={state.lastFeedback}
                  resolved={state.currentVerdict !== null}
                  onSelectConcept={(pairId) => {
                    setErrorBanner(null);
                    setSelectedConceptId(pairId);
                  }}
                  onSelectExample={handleMatchingExamplePick}
                />
              )}

              {currentPrompt.mechanic === "draft-review" && (
                <DraftReviewStage
                  prompt={currentPrompt}
                  flaggedIds={flaggedSegmentIds}
                  resolved={state.currentVerdict !== null}
                  onToggleFlag={toggleSegmentFlag}
                  onSubmit={handleSubmitDraftReview}
                />
              )}

              {errorBanner && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] px-4 py-3 text-sm font-medium text-[var(--verdict-partial-text)]"
                >
                  <WarningCircle size={18} weight="fill" className="shrink-0" />
                  <span>{errorBanner}</span>
                </div>
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

function TriageStage({
  prompt,
  selected,
  resolved,
  onPick,
}: {
  prompt: TriagePrompt;
  selected: TriageBucket | null;
  resolved: boolean;
  onPick: (bucket: TriageBucket) => void;
}) {
  const buckets: {
    id: TriageBucket;
    label: string;
    desc: string;
    Icon: typeof Robot;
  }[] = [
    {
      id: "ai",
      label: "ذكاء اصطناعي",
      desc: "يتعلّم الأنماط من الأمثلة",
      Icon: Robot,
    },
    {
      id: "automation",
      label: "أتمتة تقليدية",
      desc: "تتبع قواعد ثابتة أو جدولاً زمنياً",
      Icon: GearSix,
    },
    {
      id: "unsure",
      label: "غير مؤكد",
      desc: "المعلومات المعطاة لا تكفي للحكم",
      Icon: Question,
    },
  ];

  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
        {prompt.contextTag}
      </span>

      <p className="mt-4 text-lg font-semibold leading-relaxed text-[var(--text-primary)] sm:text-xl">
        {prompt.scenario}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {buckets.map(({ id, label, desc, Icon }) => {
          const isSelected = selected === id;
          const isExpected = resolved && prompt.expectedBucket === id;

          let cardClass =
            "border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--accent)]";
          if (resolved) {
            if (isExpected) {
              cardClass =
                "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
            } else if (isSelected) {
              cardClass =
                "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
            } else {
              cardClass =
                "border-[var(--border-subtle)] bg-[var(--surface-page)] opacity-55";
            }
          }

          return (
            <button
              key={id}
              type="button"
              disabled={resolved}
              onClick={() => onPick(id)}
              className={`tactile-btn flex flex-col items-start rounded-xl border p-4 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${cardClass}`}
            >
              <div className="mb-2 flex w-full items-center justify-between">
                <Icon size={22} weight="duotone" />
                {isExpected && <CheckCircle size={18} weight="fill" />}
              </div>
              <span className="text-base font-bold">{label}</span>
              <span className="mt-1 text-xs leading-relaxed opacity-85">
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const choices: { id: "myth" | "fact"; label: string; sub: string }[] = [
    {
      id: "myth",
      label: "خرافة شائعة",
      sub: "تعميم غير دقيق أو مبالغة",
    },
    {
      id: "fact",
      label: "حقيقة صحيحة",
      sub: "تتفق مع واقع عمل الأنظمة",
    },
  ];

  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
        افحص العبارة التالية
      </span>

      <blockquote className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-page)] p-5 text-lg font-semibold leading-relaxed text-[var(--text-primary)] sm:text-xl">
        &quot;{prompt.claim}&quot;
      </blockquote>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((c) => {
          const isSelected = selected === c.id;
          const isExpected = resolved && prompt.reality === c.id;

          let btnStyle =
            "border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--accent)]";
          if (resolved) {
            if (isExpected) {
              btnStyle =
                "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
            } else if (isSelected) {
              btnStyle =
                "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
            } else {
              btnStyle =
                "border-[var(--border-subtle)] bg-[var(--surface-page)] opacity-55";
            }
          }

          return (
            <button
              key={c.id}
              type="button"
              disabled={resolved}
              onClick={() => onPick(c.id)}
              className={`tactile-btn flex flex-col items-start rounded-xl border p-4 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${btnStyle}`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-bold">{c.label}</span>
                {isExpected && <CheckCircle size={18} weight="fill" />}
              </div>
              <span className="mt-1 text-xs opacity-85">{c.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceStage({
  prompt,
  selectedId,
  resolved,
  onPick,
}: {
  prompt: ChoicePrompt;
  selectedId: string | null;
  resolved: boolean;
  onPick: (optionId: string) => void;
}) {
  return (
    <div>
      <span className="inline-block rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
        {prompt.contextTag}
      </span>

      <h2 className="mt-4 text-lg font-bold leading-relaxed text-[var(--text-primary)] sm:text-xl">
        {prompt.question}
      </h2>

      <div className="mt-6 flex flex-col gap-3">
        {prompt.options.map((opt, idx) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = resolved && prompt.correctOptionId === opt.id;

          let optStyle =
            "border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--accent)]";
          if (resolved) {
            if (isCorrect) {
              optStyle =
                "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
            } else if (isSelected) {
              optStyle =
                "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
            } else {
              optStyle =
                "border-[var(--border-subtle)] bg-[var(--surface-page)] opacity-60";
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={resolved}
              onClick={() => onPick(opt.id)}
              className={`tactile-btn flex items-start gap-3.5 rounded-xl border p-4 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${optStyle}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/25 text-xs font-bold">
                {ARABIC_OPTION_LETTERS[idx] ?? idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium leading-relaxed sm:text-base">
                {opt.label}
              </span>
              {isCorrect && (
                <CheckCircle size={20} weight="fill" className="shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingStage({
  prompt,
  shuffledExamples,
  matchedPairIds,
  selectedConceptId,
  lastFeedback,
  resolved,
  onSelectConcept,
  onSelectExample,
}: {
  prompt: MatchingPrompt;
  shuffledExamples: readonly { id: string; concept: string; example: string }[];
  matchedPairIds: readonly string[];
  selectedConceptId: string | null;
  lastFeedback: Verdict | null;
  resolved: boolean;
  onSelectConcept: (pairId: string) => void;
  onSelectExample: (pairId: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        {prompt.instruction}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Right column in RTL: Concepts */}
        <div className="flex flex-col gap-2.5 md:col-span-5">
          <p className="mb-1 text-xs font-semibold text-[var(--text-muted)]">
            1. اختر المهمة
          </p>
          {prompt.pairs.map((pair) => {
            const isMatched = matchedPairIds.includes(pair.id);
            const isSelected = selectedConceptId === pair.id;

            let cls =
              "border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--accent)]";
            if (isMatched) {
              cls =
                "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
            } else if (isSelected) {
              cls =
                "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-2 ring-[var(--accent)]/30";
            }

            return (
              <button
                key={pair.id}
                type="button"
                disabled={isMatched || resolved}
                onClick={() => onSelectConcept(pair.id)}
                className={`tactile-btn flex items-center justify-between gap-2 rounded-xl border p-3.5 text-right text-sm font-bold sm:text-base ${cls}`}
              >
                <span>{pair.concept}</span>
                {isMatched && <Check size={18} weight="bold" />}
              </button>
            );
          })}
        </div>

        {/* Left column in RTL: Shuffled Examples */}
        <div className="flex flex-col gap-2.5 md:col-span-7">
          <p className="mb-1 text-xs font-semibold text-[var(--text-muted)]">
            2. اربطها بالموقف المطابق
          </p>
          {shuffledExamples.map((pair) => {
            const isMatched = matchedPairIds.includes(pair.id);
            const cls = isMatched
              ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)] opacity-85"
              : selectedConceptId
              ? "border-[var(--border-strong)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--accent)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:border-[var(--border-strong)]";

            return (
              <button
                key={pair.id}
                type="button"
                disabled={isMatched || resolved}
                onClick={() => onSelectExample(pair.id)}
                className={`tactile-btn flex items-start justify-between gap-3 rounded-xl border p-3.5 text-right text-sm leading-relaxed ${cls}`}
              >
                <span>{pair.example}</span>
                {isMatched && (
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step micro-feedback before the entire round resolves */}
      {!resolved && lastFeedback && (
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
            lastFeedback.outcome === "accurate"
              ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
              : "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
          }`}
        >
          <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{lastFeedback.headline}</p>
            <p className="mt-0.5 opacity-90">{lastFeedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftReviewStage({
  prompt,
  flaggedIds,
  resolved,
  onToggleFlag,
  onSubmit,
}: {
  prompt: DraftReviewPrompt;
  flaggedIds: readonly string[];
  resolved: boolean;
  onToggleFlag: (segmentId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {prompt.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {prompt.roleContext}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Source Notes & Constraints */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 sm:p-5 lg:col-span-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            الملاحظات والقواعد المرجعية
          </h3>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {prompt.sourceNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Clickable AI Draft */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-page)] p-4 sm:p-5 lg:col-span-7">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {prompt.draftHeader}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                انقر على الجملة التي تحتوي على خلل لتمييزها
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {prompt.segments.map((seg) => {
                const isFlagged = flaggedIds.includes(seg.id);
                let segStyle =
                  "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:border-[var(--accent)]";

                if (resolved) {
                  if (seg.isFlawed) {
                    segStyle =
                      "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
                  } else if (isFlagged && !seg.isFlawed) {
                    segStyle =
                      "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]";
                  } else {
                    segStyle =
                      "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)] opacity-85";
                  }
                } else if (isFlagged) {
                  segStyle =
                    "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)] ring-2 ring-[var(--verdict-partial-border)]";
                }

                return (
                  <button
                    key={seg.id}
                    type="button"
                    disabled={resolved}
                    onClick={() => onToggleFlag(seg.id)}
                    className={`tactile-btn flex flex-col items-start rounded-xl border p-3.5 text-right text-sm leading-relaxed ${segStyle}`}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className="font-medium">{seg.text}</span>
                      {!resolved && isFlagged && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-black/10 px-2 py-0.5 text-xs font-semibold">
                          <FlagBanner size={13} weight="fill" />
                          <span>محدّدة</span>
                        </span>
                      )}
                    </div>
                    {resolved && (
                      <span className="mt-2 border-t border-current/20 pt-1.5 text-xs font-semibold">
                        {seg.note}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!resolved && (
            <div className="mt-5 flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                تم تحديد {flaggedIds.length} جمل للمراجعة
              </span>
              <button
                type="button"
                onClick={onSubmit}
                className="tactile-btn whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                اعتماد المراجعة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const toneClass =
    verdict.outcome === "accurate"
      ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
      : verdict.outcome === "partial"
      ? "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
      : "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`mt-6 rounded-xl border p-4 sm:p-5 ${toneClass}`}
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
          <span>{isLastPrompt ? "عرض النتيجة" : "الموقف التالي"}</span>
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
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="surface-elevated rounded-2xl p-6 sm:p-10"
    >
      <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--verdict-accurate-bg)] px-3.5 py-1.5 text-xs font-bold text-[var(--verdict-accurate-text)]">
        <CheckCircle size={18} weight="fill" />
        <span>اكتمل النشاط</span>
      </div>

      <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        درجة الإتقان: <span className="tabular-nums">{summary.masteryPercent}%</span>
      </h2>

      <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[var(--text-secondary)]">
        {summary.takeaway}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[var(--border-subtle)] py-5">
        <div>
          <p className="text-2xl font-bold text-[var(--accent)] tabular-nums">
            {summary.accurateCount}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
            إجابات دقيقة
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {summary.partialCount}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
            إتقان جزئي
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-muted)] tabular-nums">
            {summary.revisitCount}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
            تحتاج مراجعة
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {nextActivity ? (
            <Link
              href={`/${nextActivity.slug}/`}
              className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <span>النشاط التالي: {nextActivity.shortTitle}</span>
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
            <span>إعادة المحاولة</span>
          </button>
        </div>

        <Link
          href="/"
          className="text-sm font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
        >
          عرض جميع أنشطة الجلسة
        </Link>
      </div>
    </motion.section>
  );
}
