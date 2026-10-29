"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowsLeftRight,
  CheckCircle,
  Clock,
  Compass,
  ListNumbers,
  MagnifyingGlass,
  Scales,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import type { Activity, Mechanic } from "@/domain/types";
import {
  getBrowserStorageAdapter,
  loadProgress,
  type SessionProgressMap,
} from "@/engine/progress-store";
import { CopyLinkButton } from "./theme-toggle";

export const MECHANIC_META: Record<
  Mechanic,
  { label: string; Icon: typeof SlidersHorizontal }
> = {
  sequence: { label: "ترتيب تسلسلي", Icon: ListNumbers },
  matching: { label: "توصيل ثنائي", Icon: ArrowsLeftRight },
  triage: { label: "تصنيف ثلاثي", Icon: SlidersHorizontal },
  "draft-review": { label: "فحص مسودات", Icon: MagnifyingGlass },
  "myth-fact": { label: "خرافة أم حقيقة", Icon: Scales },
  choice: { label: "اختيار من متعدد", Icon: Compass },
};

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
    <span className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:inline-flex">
      <CheckCircle
        size={15}
        weight={completedCount > 0 ? "fill" : "regular"}
        className="text-[var(--accent)]"
      />
      <span className="tabular-nums">
        {completedCount} من {total} أجزاء مكتملة
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

        const isPhotoCard = idx === 0 || idx === 7;
        const isNavyCard = idx === 1 || idx === 6;
        const isSubtleTintedCard = idx === 3 || idx === 5;

        let containerClasses =
          "surface-elevated text-[var(--text-primary)] hover:border-[var(--accent)]";
        if (isNavyCard) {
          containerClasses =
            "rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-navy)] text-[var(--text-navy-surface)] shadow-[var(--shadow-tinted)] hover:border-[var(--accent)]";
        } else if (isSubtleTintedCard) {
          containerClasses =
            "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[var(--accent)]";
        }

        const photoSrc =
          idx === 0
            ? "https://picsum.photos/seed/minimalist-study-workspace/960/380"
            : "https://picsum.photos/seed/collaborative-seminar-table/960/360";
        const photoAlt =
          idx === 0
            ? "طاولة تدريب مرتبة تضم دفتر ملاحظات وأدوات عمل"
            : "مساحة عمل جماعي للأنشطة التطبيقية والتمارين الثنائية";

        return (
          <motion.article
            key={activity.slug}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.42,
              delay: (idx % 2) * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl transition-colors ${spanClass} ${containerClasses}`}
          >
            {isPhotoCard && (
              <div className="aspect-[24/9] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <img
                  src={photoSrc}
                  alt={photoAlt}
                  width={960}
                  height={380}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
                      {activity.partBadge}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        isNavyCard
                          ? "text-[var(--text-navy-muted)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {activity.slideRange}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        isNavyCard
                          ? "text-[var(--text-navy-muted)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      <Clock size={14} weight="regular" />
                      <span className="tabular-nums">
                        {activity.estimatedMinutes} دقائق
                      </span>
                    </span>

                    {!hydrated ? (
                      <span
                        aria-hidden="true"
                        className="h-6 w-14 animate-pulse rounded-xl bg-[var(--surface-subtle)] opacity-50"
                      />
                    ) : record ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-[var(--verdict-accurate-border)] bg-[var(--verdict-accurate-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--verdict-accurate-text)] tabular-nums">
                        <CheckCircle size={14} weight="fill" />
                        <span>{record.bestMasteryPercent}%</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <h3 className="text-xl font-bold leading-snug sm:text-2xl">
                  <Link
                    href={`/${activity.slug}/`}
                    className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                  >
                    {activity.title}
                  </Link>
                </h3>

                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    isNavyCard
                      ? "text-[var(--text-navy-muted)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {activity.subtitle}
                </p>

                {/* Mixture of game types inside this section checkpoint */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {activity.mechanicsUsed.map((mech) => {
                    const meta = MECHANIC_META[mech];
                    const Icon = meta.Icon;
                    return (
                      <span
                        key={mech}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                          isNavyCard
                            ? "bg-white/10 text-[var(--text-navy-surface)]"
                            : "border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <Icon size={13} weight="duotone" />
                        <span>{meta.label}</span>
                      </span>
                    );
                  })}
                  <span
                    className={`px-1 text-xs font-medium tabular-nums ${
                      isNavyCard
                        ? "text-[var(--text-navy-muted)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    ({activity.prompts.length} تحديات)
                  </span>
                </div>
              </div>

              <div
                className={`mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 ${
                  isNavyCard
                    ? "border-t border-white/15"
                    : "border-t border-[var(--border-subtle)]"
                }`}
              >
                <Link
                  href={`/${activity.slug}/`}
                  className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span>{record ? "إعادة المحطة" : "ابدأ تحديات الجزء"}</span>
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
