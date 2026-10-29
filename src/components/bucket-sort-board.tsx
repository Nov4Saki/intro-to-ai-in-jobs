"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  CheckCircle,
  DotsSixVertical,
  GearSix,
  Info,
  Lightbulb,
  Robot,
  ShieldCheck,
} from "@phosphor-icons/react";
import type {
  BucketCategory,
  BucketSortItem,
  BucketTone,
  Verdict,
} from "@/domain/types";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicCount(n: number): string {
  return ARABIC_DIGITS[n] ?? String(n);
}

const BUCKET_VISUALS: Record<
  BucketTone,
  {
    rimBg: string;
    bodyBg: string;
    Icon: typeof Robot;
    iconTint: string;
  }
> = {
  teal: {
    rimBg: "bg-[#15a39a]",
    bodyBg: "bg-[#0e8a82]",
    Icon: Robot,
    iconTint: "text-[#0b7a72]",
  },
  indigo: {
    rimBg: "bg-[#3b5299]",
    bodyBg: "bg-[#283a70]",
    Icon: GearSix,
    iconTint: "text-[#223162]",
  },
  coral: {
    rimBg: "bg-[#f26d52]",
    bodyBg: "bg-[#e8573a]",
    Icon: ShieldCheck,
    iconTint: "text-[#c44127]",
  },
  gold: {
    rimBg: "bg-[#ffd25a]",
    bodyBg: "bg-[#eab328]",
    Icon: Lightbulb,
    iconTint: "text-[#8a6200]",
  },
};

export function BucketSortBoard({
  buckets,
  items,
  sortedItemIds,
  lastFeedback,
  resolved,
  compact = false,
  onSortItem,
}: {
  buckets: readonly BucketCategory[];
  items: readonly BucketSortItem[];
  sortedItemIds: readonly string[];
  lastFeedback: Verdict | null;
  resolved: boolean;
  compact?: boolean;
  onSortItem: (itemId: string, bucketId: string) => Verdict;
}) {
  const reduceMotion = useReducedMotion();
  const bucketRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [slippedItemId, setSlippedItemId] = useState<string | null>(null);
  const [pulsedBucketId, setPulsedBucketId] = useState<string | null>(null);

  const unsortedItems = items.filter(
    (item) => !sortedItemIds.includes(item.id)
  );

  // Clear selection if resolved or item got sorted
  useEffect(() => {
    if (resolved) {
      setSelectedItemId(null);
      setDraggingItemId(null);
      setHoveredBucketId(null);
    } else if (selectedItemId && sortedItemIds.includes(selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [resolved, selectedItemId, sortedItemIds]);

  function findHitBucket(clientX: number, clientY: number): string | null {
    const pad = 12;
    for (const [bucketId, el] of bucketRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left - pad &&
        clientX <= rect.right + pad &&
        clientY >= rect.top - pad &&
        clientY <= rect.bottom + pad
      ) {
        return bucketId;
      }
    }
    return null;
  }

  function deliverItemToBucket(itemId: string, bucketId: string) {
    if (resolved) return;
    const verdict = onSortItem(itemId, bucketId);
    if (verdict.outcome === "revisit" && !verdict.promptResolved) {
      setSlippedItemId(itemId);
      setTimeout(() => {
        setSlippedItemId((prev) => (prev === itemId ? null : prev));
      }, 420);
    } else {
      setPulsedBucketId(bucketId);
      setSelectedItemId(null);
      setTimeout(() => {
        setPulsedBucketId((prev) => (prev === bucketId ? null : prev));
      }, 320);
    }
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    itemId: string
  ) {
    if (resolved || e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragNodeRef.current = el;
    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    setDraggingItemId(itemId);
    el.style.transition = "none";
    el.style.transform = reduceMotion
      ? "translate3d(0px, 0px, 0)"
      : "translate3d(0px, 0px, 0) scale(1.03) rotate(-1deg)";
  }

  function handlePointerMove(
    e: React.PointerEvent<HTMLDivElement>,
    itemId: string
  ) {
    if (draggingItemId !== itemId || !dragNodeRef.current) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      movedRef.current = true;
    }
    const scalePart = reduceMotion ? "" : " scale(1.04) rotate(-1.5deg)";
    dragNodeRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)${scalePart}`;

    const hit = findHitBucket(e.clientX, e.clientY);
    setHoveredBucketId((prev) => (prev === hit ? prev : hit));
  }

  function finishPointerGesture(
    e: React.PointerEvent<HTMLDivElement>,
    itemId: string
  ) {
    if (draggingItemId !== itemId) return;
    const el = dragNodeRef.current;
    if (el) {
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }

    const wasDrag = movedRef.current;
    const targetBucketId = wasDrag ? findHitBucket(e.clientX, e.clientY) : null;

    setDraggingItemId(null);
    setHoveredBucketId(null);
    dragNodeRef.current = null;

    if (!wasDrag) {
      if (el) {
        el.style.transition = "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)";
        el.style.transform = "translate3d(0px, 0px, 0)";
      }
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
      return;
    }

    if (targetBucketId) {
      const targetItem = items.find((i) => i.id === itemId);
      const isMatch = targetItem?.bucketId === targetBucketId;
      if (el && !isMatch) {
        el.style.transition = "transform 260ms cubic-bezier(0.23, 1, 0.32, 1)";
        el.style.transform = "translate3d(0px, 0px, 0)";
      }
      deliverItemToBucket(itemId, targetBucketId);
    } else if (el) {
      el.style.transition = "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)";
      el.style.transform = "translate3d(0px, 0px, 0)";
    }
  }

  function handleBucketClick(bucketId: string) {
    if (resolved) return;
    const candidateId = selectedItemId ?? unsortedItems[0]?.id;
    if (!candidateId) return;
    deliverItemToBucket(candidateId, bucketId);
  }

  const bucketGridClass =
    buckets.length === 4
      ? "grid-cols-2 lg:grid-cols-4"
      : buckets.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2";

  const piecesGridClass = compact
    ? "grid-cols-1"
    : items.length >= 5
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="select-none">
      {/* Unsorted Draggable Pieces Tray */}
      {!resolved && unsortedItems.length > 0 && (
        <div
          className={`rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)]/65 ${
            draggingItemId ? "relative z-30" : "relative z-20"
          } ${compact ? "mb-3.5 p-3" : "mb-6 p-4 sm:p-5"}`}
        >
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <span>
              القطع المتبقية للفرز ({toArabicCount(unsortedItems.length)} من{" "}
              {toArabicCount(items.length)})
            </span>
            <span className="text-[var(--accent)]">
              {selectedItemId
                ? "الآن اضغط على الدلو الصحيح لإسقاط القطعة فيه ↓"
                : "اسحب أي قطعة وأفلتها داخل الدلو الصحيح ↓"}
            </span>
          </div>

          <div className={`grid gap-2.5 ${piecesGridClass}`}>
            <AnimatePresence initial={false}>
              {unsortedItems.map((item, idx) => {
                const isDragging = draggingItemId === item.id;
                const isSelected = selectedItemId === item.id;
                const isSlipped = slippedItemId === item.id;
                const lipColors = [
                  "border-r-[#0e8a82]",
                  "border-r-[#e8573a]",
                  "border-r-[#eab328]",
                  "border-r-[#283a70]",
                ];
                const rightLip = lipColors[idx % lipColors.length];

                return (
                  <motion.div
                    key={item.id}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            transform: "scale(0.92)",
                            transition: { duration: 0.16 },
                          }
                    }
                    className={isDragging ? "relative z-50" : "relative z-10"}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedItemId((prev) =>
                            prev === item.id ? null : item.id
                          );
                        }
                      }}
                      onPointerDown={(e) => handlePointerDown(e, item.id)}
                      onPointerMove={(e) => handlePointerMove(e, item.id)}
                      onPointerUp={(e) => finishPointerGesture(e, item.id)}
                      onPointerCancel={(e) => finishPointerGesture(e, item.id)}
                      className={`touch-none flex cursor-grab items-center justify-between gap-2.5 rounded-xl border-2 border-r-[6px] bg-[var(--surface-card)] text-right transition-[border-color,box-shadow,background-color] duration-150 active:cursor-grabbing ${rightLip} ${
                        compact ? "px-3 py-2.5" : "px-3.5 py-3"
                      } ${
                        isDragging
                          ? "border-[var(--accent)] shadow-2xl ring-2 ring-[var(--accent)]"
                          : isSlipped
                          ? "border-[var(--lip-coral)] bg-[var(--verdict-revisit-bg)] shadow-md"
                          : isSelected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md ring-2 ring-[var(--accent)]"
                          : "border-[var(--border-subtle)] shadow-sm hover:border-[var(--accent)]"
                      }`}
                    >
                      <span
                        className={`font-bold leading-snug text-[var(--text-primary)] ${
                          compact ? "text-xs sm:text-sm" : "text-sm"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                      >
                        <DotsSixVertical size={18} weight="bold" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Per-piece instant feedback strip */}
      {!resolved && lastFeedback && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
            lastFeedback.outcome === "accurate"
              ? "border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] text-[var(--verdict-accurate-text)]"
              : "border-[var(--verdict-partial-border)] bg-[var(--verdict-partial-bg)] text-[var(--verdict-partial-text)]"
          }`}
        >
          {lastFeedback.outcome === "accurate" ? (
            <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          ) : (
            <Info size={18} weight="fill" className="mt-0.5 shrink-0" />
          )}
          <div>
            <span className="font-bold">{lastFeedback.headline}: </span>
            <span>{lastFeedback.explanation}</span>
          </div>
        </div>
      )}

      {/* Actual Physical Buckets Row with Category Names Written on the Buckets */}
      <div className={`grid gap-3.5 sm:gap-5 ${bucketGridClass}`}>
        {buckets.map((bucket) => {
          const vis = BUCKET_VISUALS[bucket.tone];
          const BucketIcon = vis.Icon;
          const sortedHere = items.filter(
            (i) => i.bucketId === bucket.id && sortedItemIds.includes(i.id)
          );
          const isDropHovered = hoveredBucketId === bucket.id;
          const isPulsed = pulsedBucketId === bucket.id;
          const isReadyForSelected = Boolean(selectedItemId) && !resolved;

          return (
            <button
              key={bucket.id}
              ref={(el) => {
                if (el) bucketRefs.current.set(bucket.id, el);
                else bucketRefs.current.delete(bucket.id);
              }}
              type="button"
              disabled={resolved}
              onClick={() => handleBucketClick(bucket.id)}
              style={{
                transform:
                  !reduceMotion && (isDropHovered || isPulsed)
                    ? "translate3d(0, -5px, 0) scale(1.03)"
                    : "translate3d(0, 0, 0) scale(1)",
              }}
              className="group relative flex flex-col items-stretch text-right transition-transform duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-default"
            >
              {/* 1. Curved Wire Bucket Handle Arch */}
              <div
                aria-hidden="true"
                className="pointer-events-none flex justify-center"
              >
                <svg
                  width={compact ? "68" : "84"}
                  height={compact ? "14" : "18"}
                  viewBox="0 0 84 18"
                  className="overflow-visible text-[#1e2a4a] dark:text-[#9fb0d9]"
                >
                  <path
                    d="M 10 18 C 10 3, 74 3, 74 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* 2. Wide Open Bucket Mouth / Top Rim */}
              <div
                className={`relative z-10 flex h-8 w-full items-center justify-center rounded-full border-[3px] border-[#1e2a4a] px-3 shadow-sm transition-colors duration-150 ${
                  vis.rimBg
                } ${
                  isDropHovered
                    ? "ring-4 ring-[#ffc93c]"
                    : isReadyForSelected
                    ? "ring-2 ring-[var(--accent)]"
                    : ""
                }`}
              >
                {/* Dark recessed hollow bucket opening */}
                <div
                  className={`h-3.5 w-full rounded-full transition-colors duration-150 ${
                    isDropHovered ? "bg-[#ffc93c]" : "bg-[#11192e]/75"
                  }`}
                />

                {/* Piece Counter Pill on the Bucket Rim */}
                <span className="absolute -top-2.5 left-2.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#1e2a4a] bg-[#ffc93c] px-1.5 text-xs font-extrabold text-[#1e2a4a] shadow-sm">
                  {toArabicCount(sortedHere.length)}
                </span>

                {/* Drop prompt pill when dragging right over this bucket */}
                {isDropHovered && (
                  <span className="absolute -top-3.5 right-3 rounded-full border-2 border-[#1e2a4a] bg-[#faf6ee] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1e2a4a] shadow">
                    أفلت هنا ↓
                  </span>
                )}
              </div>

              {/* 3. Tapered Bucket Body with Bold Nameplate Written on the Front */}
              <div
                className={`relative mx-1.5 -mt-3 flex flex-1 flex-col justify-between rounded-b-[26px] border-x-[3px] border-b-[4px] border-[#1e2a4a] pt-5 pb-3.5 shadow-md transition-shadow duration-150 ${
                  compact ? "px-2.5" : "px-3.5"
                } ${vis.bodyBg} ${isDropHovered ? "shadow-xl" : ""}`}
              >
                {/* Flat-vector side shine highlight matching Slide 18 coffee mug */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-5 right-2 bottom-4 w-2 rounded-full bg-white/15"
                />

                {/* Bold Front Nameplate Sticker on the Bucket */}
                <div className="relative z-10 rounded-xl border-2 border-[#1e2a4a] bg-[#faf6ee] px-2.5 py-2 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <BucketIcon
                      size={compact ? 16 : 19}
                      weight="duotone"
                      className={`shrink-0 ${vis.iconTint}`}
                    />
                    <span
                      className={`font-extrabold leading-tight text-[#1e2a4a] ${
                        compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                      }`}
                    >
                      {bucket.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#46536b]">
                    {bucket.hint}
                  </p>
                </div>

                {/* Pieces Sitting Inside the Bucket */}
                <div className="relative z-10 mt-2.5 flex min-h-[38px] flex-col justify-center gap-1 rounded-xl bg-[#11192e]/20 p-1.5">
                  {sortedHere.length === 0 ? (
                    <span className="text-center text-[11px] font-bold text-white/90">
                      {isDropHovered
                        ? "أفلت القطعة داخل الدلو!"
                        : "اسحب القطعة إلى هنا"}
                    </span>
                  ) : (
                    sortedHere.map((piece) => (
                      <div
                        key={piece.id}
                        className="flex items-start gap-1 rounded-lg border border-[#1e2a4a]/25 bg-[#faf6ee] px-2 py-1 text-[11px] font-bold text-[#095952] shadow-xs"
                      >
                        <Check
                          size={12}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-[#0b7a72]"
                        />
                        <span className="line-clamp-2 leading-tight text-[#1e2a4a]">
                          {piece.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
