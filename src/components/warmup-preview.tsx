"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  CheckCircle,
  GearSix,
  Question,
  Robot,
} from "@phosphor-icons/react";
import type { Activity, TriageBucket, TriagePrompt } from "@/domain/types";
import { startActivity, submitResponse } from "@/engine/activity-engine";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const BUCKETS: {
  id: TriageBucket;
  label: string;
  hint: string;
  lipClass: string;
  medallionBg: string;
  medallionInk: string;
  Icon: typeof Robot;
}[] = [
  {
    id: "ai",
    label: "ذكاء اصطناعي",
    hint: "يتعلّم من الأمثلة",
    lipClass: "deck-lip-teal",
    medallionBg: "bg-[var(--medallion-teal)]",
    medallionInk: "text-[var(--medallion-teal-ink)]",
    Icon: Robot,
  },
  {
    id: "automation",
    label: "أتمتة تقليدية",
    hint: "قاعدة ثابتة",
    lipClass: "deck-lip-indigo",
    medallionBg: "bg-[var(--medallion-indigo)]",
    medallionInk: "text-[var(--medallion-indigo-ink)]",
    Icon: GearSix,
  },
  {
    id: "unsure",
    label: "غير مؤكد",
    hint: "الوصف لا يكفي",
    lipClass: "deck-lip-gold",
    medallionBg: "bg-[var(--medallion-gold)]",
    medallionInk: "text-[var(--medallion-gold-ink)]",
    Icon: Question,
  },
];

export function WarmupPreview({ prompt }: { prompt: TriagePrompt }) {
  const reduceMotion = useReducedMotion();
  const miniActivity: Activity = useMemo(
    () => ({
      slug: "warmup",
      partBadge: "التمهيد",
      slideRange: "الشريحة 4",
      title: prompt.contextTag,
      shortTitle: prompt.contextTag,
      subtitle: "",
      mechanicsUsed: ["triage"],
      agendaSlot: "",
      estimatedMinutes: 1,
      learningGoal: "",
      prompts: [prompt],
      closingTakeaway: "",
    }),
    [prompt]
  );

  const [state, setState] = useState(() => startActivity(miniActivity));
  const [triedBuckets, setTriedBuckets] = useState<TriageBucket[]>([]);

  function handlePick(bucket: TriageBucket) {
    if (state.currentVerdict) return;
    const res = submitResponse(state, { mechanic: "triage", bucket });
    setState(res.state);
    if (!res.verdict.promptResolved && !triedBuckets.includes(bucket)) {
      setTriedBuckets((prev) => [...prev, bucket]);
    }
  }

  function handleReset() {
    setTriedBuckets([]);
    setState(startActivity(miniActivity));
  }

  const resolved = state.currentVerdict !== null;

  return (
    <div className="surface-elevated overflow-hidden rounded-2xl">
      {/* Slide 1 / Slide 11 style window chrome with 3 brand dots */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-window-bar)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {prompt.contextTag}
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-teal)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-gold)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-coral)]" />
        </div>
      </div>

      {/* Authentic Slide 1 illustration filling banner seamlessly */}
      <div className="aspect-[16/10] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[#18224a]">
        <img
          src={`${BASE_PATH}/deck-art/cover-inbox.png`}
          alt="رسم توضيحي من شريحة غلاف الجلسة يوضّح فرز البريد الوارد إلى فواتير ومواعيد ودعم فني"
          width={1115}
          height={697}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
            جرّب بطاقة سريعة قبل أن نبدأ
          </span>
          {(resolved || triedBuckets.length > 0) && (
            <button
              type="button"
              onClick={handleReset}
              className="tactile-btn inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              <span>إعادة البطاقة</span>
            </button>
          )}
        </div>

        <p className="mb-4 text-sm font-medium leading-relaxed text-[var(--text-primary)] sm:text-base">
          {prompt.scenario}
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {BUCKETS.map(
            ({ id, label, hint, lipClass, medallionBg, medallionInk, Icon }) => {
              const wasTried = triedBuckets.includes(id);
              const isWinner = resolved && prompt.expectedBucket === id;

              let stateCls =
                "deck-card deck-hover-lift bg-[var(--surface-card)] hover:border-[var(--accent)]";
              if (isWinner) {
                stateCls =
                  "deck-card border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
              } else if (wasTried) {
                stateCls =
                  "deck-card border-[var(--verdict-partial-border)] bg-[var(--surface-subtle)] opacity-60";
              } else if (resolved) {
                stateCls = "deck-card opacity-50";
              }

              return (
                <button
                  key={id}
                  type="button"
                  disabled={resolved || wasTried}
                  onClick={() => handlePick(id)}
                  className={`tactile-btn flex flex-col items-start rounded-xl p-3 text-right ${lipClass} ${stateCls}`}
                >
                  <div className="mb-2 flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${medallionBg} ${medallionInk}`}
                    >
                      <Icon size={17} weight="duotone" />
                    </span>
                    {isWinner && (
                      <CheckCircle
                        size={18}
                        weight="fill"
                        className="text-[var(--accent)]"
                      />
                    )}
                  </div>
                  <span className="text-sm font-bold">{label}</span>
                  <span className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {hint}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {state.lastFeedback && (
          <motion.div
            key={state.lastFeedback.headline}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`mt-4 rounded-xl border p-3.5 text-sm leading-relaxed ${
              resolved
                ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
                : "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
            }`}
          >
            <p className="font-bold">{state.lastFeedback.headline}</p>
            <p className="mt-1 opacity-95">{state.lastFeedback.explanation}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
