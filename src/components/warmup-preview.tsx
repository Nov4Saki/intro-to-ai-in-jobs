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

const BUCKETS: {
  id: TriageBucket;
  label: string;
  hint: string;
  Icon: typeof Robot;
}[] = [
  {
    id: "ai",
    label: "ذكاء اصطناعي",
    hint: "يتعلّم من الأمثلة",
    Icon: Robot,
  },
  {
    id: "automation",
    label: "أتمتة تقليدية",
    hint: "قاعدة ثابتة",
    Icon: GearSix,
  },
  {
    id: "unsure",
    label: "غير مؤكد",
    hint: "المعلومات لا تكفي",
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
  const [selectedBucket, setSelectedBucket] = useState<TriageBucket | null>(null);

  function handlePick(bucket: TriageBucket) {
    if (state.currentVerdict) return;
    setSelectedBucket(bucket);
    const res = submitResponse(state, { mechanic: "triage", bucket });
    setState(res.state);
  }

  function handleReset() {
    setSelectedBucket(null);
    setState(startActivity(miniActivity));
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="surface-elevated overflow-hidden rounded-2xl"
    >
      <div className="aspect-[16/9] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
        <img
          src="https://picsum.photos/seed/modern-university-desk-light/960/540"
          alt="مساحة عمل دراسية حديثة ومنظمة"
          width={960}
          height={540}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {prompt.contextTag}
          </span>
          {state.currentVerdict && (
            <button
              type="button"
              onClick={handleReset}
              className="tactile-btn inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              <ArrowCounterClockwise size={14} weight="regular" />
              <span>جرّب مجدداً</span>
            </button>
          )}
        </div>

        <p className="mb-4 text-base font-medium leading-relaxed text-[var(--text-primary)]">
          {prompt.scenario}
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {BUCKETS.map(({ id, label, hint, Icon }) => {
            const isChosen = selectedBucket === id;
            const isExpected =
              state.currentVerdict !== null && prompt.expectedBucket === id;
            let borderStyle =
              "border-[var(--border-subtle)] bg-[var(--surface-page)] hover:border-[var(--accent)]";
            if (state.currentVerdict) {
              if (isExpected) {
                borderStyle =
                  "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]";
              } else if (isChosen) {
                borderStyle =
                  "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]";
              } else {
                borderStyle =
                  "border-[var(--border-subtle)] bg-[var(--surface-page)] opacity-60";
              }
            }

            return (
              <button
                key={id}
                type="button"
                disabled={state.currentVerdict !== null}
                onClick={() => handlePick(id)}
                className={`tactile-btn flex flex-col items-start rounded-xl border p-3 text-right ${borderStyle}`}
              >
                <div className="mb-1 flex w-full items-center justify-between">
                  <Icon size={18} weight="duotone" />
                  {isExpected && <CheckCircle size={16} weight="fill" />}
                </div>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs opacity-80">{hint}</span>
              </button>
            );
          })}
        </div>

        {state.currentVerdict && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`mt-4 rounded-xl border p-3.5 text-sm leading-relaxed ${
              state.currentVerdict.outcome === "accurate"
                ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
                : "border-[var(--verdict-revisit-border)] bg-[var(--verdict-revisit-bg)] text-[var(--verdict-revisit-text)]"
            }`}
          >
            <p className="font-semibold">{state.currentVerdict.headline}</p>
            <p className="mt-1 opacity-95">{state.currentVerdict.explanation}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
