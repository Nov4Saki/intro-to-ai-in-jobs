"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  HandGrabbing,
  Trophy,
} from "@phosphor-icons/react";
import type { Activity, BucketSortPrompt, Verdict } from "@/domain/types";
import { startActivity, submitResponse } from "@/engine/activity-engine";
import { BucketSortBoard } from "./bucket-sort-board";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function WarmupPreview({ prompt }: { prompt: BucketSortPrompt }) {
  const reduceMotion = useReducedMotion();
  const miniActivity: Activity = useMemo(
    () => ({
      slug: "warmup",
      partBadge: "التمهيد",
      slideRange: "الشريحة 4",
      title: prompt.title,
      shortTitle: prompt.title,
      subtitle: "",
      mechanicsUsed: ["bucket-sort"],
      agendaSlot: "",
      estimatedMinutes: 1,
      learningGoal: "",
      prompts: [prompt],
      closingTakeaway: "",
    }),
    [prompt]
  );

  const [state, setState] = useState(() => startActivity(miniActivity));
  const resolved = state.currentVerdict !== null;

  function handleSortItem(itemId: string, bucketId: string): Verdict {
    const res = submitResponse(state, {
      mechanic: "bucket-sort",
      itemId,
      bucketId,
    });
    setState(res.state);
    return res.verdict;
  }

  function handleReset() {
    setState(startActivity(miniActivity));
  }

  return (
    <div className="surface-elevated rounded-2xl">
      {/* Slide 1 / Slide 11 style window chrome with 3 brand dots */}
      <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--border-subtle)] bg-[var(--surface-window-bar)] px-4 py-2.5">
        <span className="text-xs font-bold text-[var(--text-primary)]">
          {prompt.contextTag}
        </span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-teal)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-gold)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lip-coral)]" />
        </div>
      </div>

      {/* Compact Slide 1 cover illustration */}
      <div className="h-32 w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[#18224a] sm:h-36">
        <img
          src={`${BASE_PATH}/deck-art/cover-inbox.png`}
          alt="رسم توضيحي من شريحة غلاف الجلسة يوضّح فرز البريد الوارد إلى فواتير ومواعيد ودعم فني"
          width={1115}
          height={697}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
            <HandGrabbing size={15} weight="duotone" />
            <span>اسحب كل قطعة وضعها داخل الدلو الصحيح</span>
          </span>
          {(resolved || state.sortedItemIds.length > 0) && (
            <button
              type="button"
              onClick={handleReset}
              className="tactile-btn inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              <span>إعادة اللعب</span>
            </button>
          )}
        </div>

        {resolved && (
          <motion.div
            initial={
              reduceMotion
                ? false
                : { opacity: 0, transform: "scale(0.96)" }
            }
            animate={{ opacity: 1, transform: "scale(1)" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="mb-4 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-3.5 text-[var(--verdict-accurate-text)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] text-[#1e2a4a]">
                  <Trophy size={22} weight="fill" />
                </span>
                <div>
                  <p className="text-sm font-bold">أحسنت! فرز رائع</p>
                  <p className="mt-0.5 text-xs opacity-95">
                    {prompt.completionNote}
                  </p>
                </div>
              </div>
              <Link
                href="/part-1-basics/"
                className="tactile-btn inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-[var(--accent-ink)]"
              >
                <span>الجزء 1</span>
                <ArrowLeft size={14} weight="bold" />
              </Link>
            </div>
          </motion.div>
        )}

        <BucketSortBoard
          buckets={prompt.buckets}
          items={prompt.items}
          sortedItemIds={state.sortedItemIds}
          lastFeedback={state.lastFeedback}
          resolved={resolved}
          compact
          onSortItem={handleSortItem}
        />
      </div>
    </div>
  );
}
