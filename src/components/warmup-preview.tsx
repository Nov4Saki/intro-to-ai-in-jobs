"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle,
  DotsSixVertical,
  GearSix,
  HandTap,
  Robot,
  Trophy,
} from "@phosphor-icons/react";
import type { Activity, BucketSortPrompt, BucketTone } from "@/domain/types";
import { startActivity, submitResponse } from "@/engine/activity-engine";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ARABIC_DIGITS = ["١", "٢", "٣", "٤", "٥", "٦"];

const TONE_STYLES: Record<
  BucketTone,
  { lip: string; medallionBg: string; medallionInk: string; Icon: typeof Robot }
> = {
  teal: {
    lip: "deck-lip-teal",
    medallionBg: "bg-[var(--medallion-teal)]",
    medallionInk: "text-[var(--medallion-teal-ink)]",
    Icon: Robot,
  },
  indigo: {
    lip: "deck-lip-indigo",
    medallionBg: "bg-[var(--medallion-indigo)]",
    medallionInk: "text-[var(--medallion-indigo-ink)]",
    Icon: GearSix,
  },
  coral: {
    lip: "deck-lip-coral",
    medallionBg: "bg-[var(--medallion-coral)]",
    medallionInk: "text-[var(--medallion-coral-ink)]",
    Icon: Robot,
  },
  gold: {
    lip: "deck-lip-gold",
    medallionBg: "bg-[var(--medallion-gold)]",
    medallionInk: "text-[var(--medallion-gold-ink)]",
    Icon: GearSix,
  },
};

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
  const [dragOverBucketId, setDragOverBucketId] = useState<string | null>(null);

  const unsortedItems = prompt.items.filter(
    (item) => !state.sortedItemIds.includes(item.id)
  );
  const activeItem = unsortedItems[0] ?? null;
  const resolved = state.currentVerdict !== null;

  function handleSortIntoBucket(bucketId: string) {
    if (!activeItem || resolved) return;
    setDragOverBucketId(null);
    const res = submitResponse(state, {
      mechanic: "bucket-sort",
      itemId: activeItem.id,
      bucketId,
    });
    setState(res.state);
  }

  function handleReset() {
    setDragOverBucketId(null);
    setState(startActivity(miniActivity));
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-2xl">
      {/* Slide 1 / Slide 11 style window chrome with 3 brand dots */}
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

      {/* Compact Slide 1 cover illustration */}
      <div className="h-36 w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[#18224a] sm:h-40">
        <img
          src={`${BASE_PATH}/deck-art/cover-inbox.png`}
          alt="رسم توضيحي من شريحة غلاف الجلسة يوضّح فرز البريد الوارد إلى فواتير ومواعيد ودعم فني"
          width={1115}
          height={697}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="p-4 sm:p-5">
        {/* How to play pill */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--medallion-teal-ink)]">
            <HandTap size={15} weight="duotone" />
            <span>جرّب لعبة الفرز: اضغط على الصندوق أو اسحب البطاقة إليه</span>
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

        {/* Active card to sort OR celebratory completion state */}
        {!resolved && activeItem ? (
          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
              <span>
                البطاقة {ARABIC_DIGITS[state.sortedItemIds.length]} من{" "}
                {ARABIC_DIGITS[prompt.items.length - 1] ?? prompt.items.length}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <span>اختر الصندوق بالأسفل</span>
                <ArrowDown size={13} weight="bold" />
              </span>
            </div>

            <motion.div
              key={activeItem.id}
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              draggable
              onDragStart={(e) => {
                const evt = e as unknown as React.DragEvent<HTMLDivElement>;
                evt.dataTransfer?.setData("text/plain", activeItem.id);
              }}
              className="deck-card deck-lip-gold flex cursor-grab items-center justify-between gap-3 rounded-xl bg-[var(--surface-card)] p-3.5 shadow-sm active:cursor-grabbing"
            >
              <p className="text-sm font-bold leading-relaxed text-[var(--text-primary)]">
                {activeItem.label}
              </p>
              <DotsSixVertical
                size={20}
                weight="bold"
                className="shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3.5 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] p-4 text-[var(--verdict-accurate-text)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc93c] text-[#1e2a4a]">
                  <Trophy size={22} weight="fill" />
                </span>
                <div>
                  <p className="text-sm font-bold">أحسنت! عمل رائع في التمهيد</p>
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

        {/* Category Buckets */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {prompt.buckets.map((bucket) => {
            const style = TONE_STYLES[bucket.tone];
            const Icon = style.Icon;
            const sortedHere = prompt.items.filter(
              (i) =>
                i.bucketId === bucket.id && state.sortedItemIds.includes(i.id)
            );
            const isOver = dragOverBucketId === bucket.id;

            return (
              <button
                key={bucket.id}
                type="button"
                disabled={resolved}
                onClick={() => handleSortIntoBucket(bucket.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!resolved) setDragOverBucketId(bucket.id);
                }}
                onDragLeave={() => setDragOverBucketId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleSortIntoBucket(bucket.id);
                }}
                className={`tactile-btn deck-card flex flex-col items-stretch rounded-xl p-3 text-right transition-all ${
                  style.lip
                } ${
                  isOver
                    ? "ring-2 ring-[var(--accent)] bg-[var(--accent-soft)]/50 scale-[1.01]"
                    : "bg-[var(--surface-card)] hover:border-[var(--accent)]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.medallionBg} ${style.medallionInk}`}
                    >
                      <Icon size={17} weight="duotone" />
                    </span>
                    <div>
                      <span className="block text-sm font-bold text-[var(--text-primary)]">
                        {bucket.label}
                      </span>
                      <span className="block text-[11px] text-[var(--text-secondary)]">
                        {bucket.hint}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)] tabular-nums">
                    {sortedHere.length}
                  </span>
                </div>

                {/* Open Bucket Tray */}
                <div className="mt-2.5 flex min-h-[42px] flex-col justify-center gap-1 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-page)]/60 p-2">
                  {sortedHere.length === 0 ? (
                    <span className="text-center text-[11px] font-semibold text-[var(--text-muted)]">
                      + اضغط أو أفلت البطاقة هنا
                    </span>
                  ) : (
                    sortedHere.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--verdict-accurate-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--verdict-accurate-text)]"
                      >
                        <Check size={12} weight="bold" className="shrink-0" />
                        <span className="line-clamp-1">{item.label}</span>
                      </span>
                    ))
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Instant feedback toast for each sorted card */}
        {!resolved && state.lastFeedback && (
          <motion.div
            key={state.lastFeedback.headline + state.sortedItemIds.length}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs leading-relaxed ${
              state.lastFeedback.outcome === "accurate"
                ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
                : "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
            }`}
          >
            <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">{state.lastFeedback.headline}: </span>
              <span>{state.lastFeedback.explanation}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
