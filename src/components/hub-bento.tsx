"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Brain,
  Cards,
  ChatCenteredDots,
  CheckCircle,
  Clock,
  HighlighterCircle,
  Lightbulb,
  ListNumbers,
  Scales,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Stack,
} from "@phosphor-icons/react";
import type { Activity, Mechanic } from "@/domain/types";
import {
  getBrowserStorageAdapter,
  loadProgress,
  type SessionProgressMap,
} from "@/engine/progress-store";
import { CopyLinkButton } from "./theme-toggle";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const MECHANIC_META: Record<
  Mechanic,
  { label: string; Icon: typeof SlidersHorizontal }
> = {
  sequence: { label: "رتّب الشريحة", Icon: ListNumbers },
  matching: { label: "بطاقات الذاكرة", Icon: Cards },
  triage: { label: "فرز البطاقات", Icon: SlidersHorizontal },
  "draft-review": { label: "الملاحظة الصفراء", Icon: HighlighterCircle },
  "myth-fact": { label: "خرافة أم حقيقة", Icon: Scales },
  choice: { label: "تذكّر الفكرة", Icon: Lightbulb },
};

const CARD_THEMES = [
  {
    lip: "deck-lip-teal",
    medallionBg: "bg-[var(--medallion-teal)]",
    medallionInk: "text-[var(--medallion-teal-ink)]",
    CardIcon: Sparkle,
  },
  {
    lip: "deck-lip-coral",
    medallionBg: "bg-[var(--medallion-coral)]",
    medallionInk: "text-[var(--medallion-coral-ink)]",
    CardIcon: Stack,
  },
  {
    lip: "deck-lip-gold",
    medallionBg: "bg-[var(--medallion-gold)]",
    medallionInk: "text-[var(--medallion-gold-ink)]",
    CardIcon: ChatCenteredDots,
  },
  {
    lip: "deck-lip-indigo",
    medallionBg: "bg-[var(--medallion-indigo)]",
    medallionInk: "text-[var(--medallion-indigo-ink)]",
    CardIcon: Brain,
  },
  {
    lip: "deck-lip-teal",
    medallionBg: "bg-[var(--medallion-teal)]",
    medallionInk: "text-[var(--medallion-teal-ink)]",
    CardIcon: ShieldCheck,
  },
  {
    lip: "deck-lip-gold",
    medallionBg: "bg-[var(--medallion-gold)]",
    medallionInk: "text-[var(--medallion-gold-ink)]",
    CardIcon: HighlighterCircle,
  },
  {
    lip: "deck-lip-coral",
    medallionBg: "bg-[var(--medallion-coral)]",
    medallionInk: "text-[var(--medallion-coral-ink)]",
    CardIcon: Scales,
  },
  {
    lip: "deck-lip-indigo",
    medallionBg: "bg-[var(--medallion-indigo)]",
    medallionInk: "text-[var(--medallion-indigo-ink)]",
    CardIcon: Cards,
  },
] as const;

export function HubProgressPill({ total }: { total: number }) {
  const [hydrated, setHydrated] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const progress = loadProgress(getBrowserStorageAdapter());
    setCompletedCount(Object.keys(progress).length);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <span
        aria-hidden="true"
        className="hidden h-8 w-28 animate-pulse rounded-xl bg-[var(--surface-subtle)] sm:inline-block"
      />
    );
  }

  return (
    <span className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] sm:inline-flex">
      <CheckCircle
        size={15}
        weight={completedCount > 0 ? "fill" : "regular"}
        className="text-[var(--accent)]"
      />
      <span className="tabular-nums">
        {completedCount} من {total} محطات مسترجعة
      </span>
    </span>
  );
}

export function HubBentoGrid({
  activities,
}: {
  activities: readonly Activity[];
}) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState<SessionProgressMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress(getBrowserStorageAdapter()));
    setHydrated(true);
  }, []);

  if (activities.length === 0) {
    return (
      <div className="surface-elevated rounded-2xl p-8 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">
          لا توجد محطات تفاعلية منشورة في هذه الجلسة بعد.
        </p>
      </div>
    );
  }

  // Exact 8-cell asymmetric bento: (7 + 5), (5 + 7), (7 + 5), (4 + 8)
  const spanClasses = [
    "md:col-span-7",
    "md:col-span-5",
    "md:col-span-5",
    "md:col-span-7",
    "md:col-span-7",
    "md:col-span-5",
    "md:col-span-4",
    "md:col-span-8",
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
      {activities.map((activity, idx) => {
        const record = hydrated ? progress[activity.slug] : undefined;
        const spanClass = spanClasses[idx] ?? "md:col-span-6";
        const theme = CARD_THEMES[idx % CARD_THEMES.length];
        const CardIcon = theme.CardIcon;

        // Slide-deck surface variation across the 8 bento cells
        const isCoffeeCard = idx === 2; // Part 3 right before the 10-min break (Slide 18)
        const isStickyNoteCard = idx === 5; // Part 6 yellow sticky note (Slide 26)
        const isSubtleSandCard = idx === 1 || idx === 6;
        const isMintFinaleCard = idx === 7;
        const hasPolicyShield = idx === 4; // Part 5 institutional shield (Slide 24)

        let surfaceCls = `deck-card ${theme.lip} bg-[var(--surface-card)]`;
        if (isStickyNoteCard) {
          surfaceCls = "deck-sticky-note border-t-[5px] border-t-[var(--lip-gold)]";
        } else if (isSubtleSandCard) {
          surfaceCls = `deck-card ${theme.lip} bg-[var(--surface-subtle)]`;
        } else if (isMintFinaleCard) {
          surfaceCls = `deck-card ${theme.lip} bg-[var(--accent-soft)]/55`;
        }

        return (
          <motion.article
            key={activity.slug}
            initial={hydrated && !reduceMotion ? { opacity: 0, y: 14 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{
              duration: 0.28,
              delay: (idx % 2) * 0.04,
              ease: [0.23, 1, 0.32, 1],
            }}
            className={`deck-hover-lift group relative flex flex-col justify-between overflow-hidden rounded-2xl hover:border-[var(--accent)] ${spanClass} ${surfaceCls}`}
          >
            {isCoffeeCard && (
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[#0e8a82] px-5 py-3 text-white">
                <div>
                  <p className="text-xs font-bold opacity-90">محطة ما قبل الاستراحة</p>
                  <p className="text-xs opacity-80">ترافق الشرائح 15 إلى 18</p>
                </div>
                <img
                  src={`${BASE_PATH}/deck-art/coffee-break.png`}
                  alt="رسم كوب القهوة من شريحة الاستراحة في العرض التقديمي"
                  width={160}
                  height={96}
                  className="h-14 w-auto object-contain"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${theme.medallionBg} ${theme.medallionInk}`}
                    >
                      <CardIcon size={22} weight="duotone" />
                    </span>
                    <div>
                      <span className="inline-block rounded-xl bg-[var(--surface-card)]/90 px-2.5 py-0.5 text-xs font-bold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]">
                        {activity.partBadge}
                      </span>
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">
                        {activity.slideRange}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                      <Clock size={14} weight="regular" />
                      <span className="tabular-nums">
                        {activity.estimatedMinutes} دقائق
                      </span>
                    </span>

                    {!hydrated ? (
                      <span
                        aria-hidden="true"
                        className="h-6 w-16 animate-pulse rounded-xl bg-[var(--surface-subtle)] opacity-60"
                      />
                    ) : record ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--verdict-accurate-text)]">
                        <CheckCircle size={14} weight="fill" />
                        <span>مكتمل</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold leading-snug text-[var(--text-primary)] sm:text-2xl">
                      <Link
                        href={`/${activity.slug}/`}
                        className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                      >
                        {activity.title}
                      </Link>
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {activity.subtitle}
                    </p>
                  </div>

                  {hasPolicyShield && (
                    <img
                      src={`${BASE_PATH}/deck-art/policy-shield.png`}
                      alt="درع التحقق من قواعد المؤسسة من الشريحة 24"
                      width={96}
                      height={108}
                      className="hidden h-20 w-auto shrink-0 rounded-xl object-contain sm:block"
                    />
                  )}
                </div>

                {/* Friendly game-card tags inside this section */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {activity.mechanicsUsed.map((mech) => {
                    const meta = MECHANIC_META[mech];
                    const Icon = meta.Icon;
                    return (
                      <span
                        key={mech}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]/90 px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                      >
                        <Icon
                          size={14}
                          weight="duotone"
                          className="text-[var(--accent)]"
                        />
                        <span>{meta.label}</span>
                      </span>
                    );
                  })}
                  <span className="px-1 text-xs font-semibold text-[var(--text-muted)] tabular-nums">
                    ({activity.prompts.length} بطاقات)
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)]/80 pt-4">
                <Link
                  href={`/${activity.slug}/`}
                  className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span>
                    {record ? "أعد تنشيط الذاكرة" : "العب بطاقات الجزء"}
                  </span>
                  <ArrowLeft size={16} weight="bold" />
                </Link>

                <CopyLinkButton
                  relativePath={activity.slug}
                  label="نسخ الرابط"
                  compact
                />
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
