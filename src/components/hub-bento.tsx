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

const MECHANIC_META: Record<
  Mechanic,
  { label: string; Icon: typeof SlidersHorizontal }
> = {
  triage: { label: "تصنيف ثلاثي", Icon: SlidersHorizontal },
  "draft-review": { label: "فحص مسودات", Icon: MagnifyingGlass },
  matching: { label: "ربط ثنائي", Icon: ArrowsLeftRight },
  "myth-fact": { label: "حكم سريع", Icon: Scales },
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
        {completedCount} من {total} مكتمل
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
          لا توجد أنشطة منشورة في هذه الجلسة بعد.
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          أضف نشاطاً جديداً في ملف بيانات الجلسة ليظهر هنا للمشاركين.
        </p>
      </div>
    );
  }

  // Exact 5-cell layout: Row 1 (7 + 5), Row 2 (5 + 7), Row 3 (12)
  const spanClasses = [
    "md:col-span-7",
    "md:col-span-5",
    "md:col-span-5",
    "md:col-span-7",
    "md:col-span-12",
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
      {activities.map((activity, idx) => {
        const meta = MECHANIC_META[activity.mechanic];
        const Icon = meta.Icon;
        const record = hydrated ? progress[activity.slug] : undefined;
        const spanClass = spanClasses[idx] ?? "md:col-span-6";

        const isFeaturedPhotoCard = idx === 0;
        const isNavySurfaceCard = idx === 1;
        const isSoftTintedCard = idx === 3;
        const isHorizontalBanner = idx === 4;

        let containerClasses =
          "surface-elevated text-[var(--text-primary)] hover:border-[var(--accent)]";
        if (isNavySurfaceCard) {
          containerClasses =
            "rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-navy)] text-[var(--text-navy-surface)] shadow-[var(--shadow-tinted)] hover:border-[var(--accent)]";
        } else if (isSoftTintedCard) {
          containerClasses =
            "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:border-[var(--accent)]";
        }

        return (
          <motion.article
            key={activity.slug}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.45,
              delay: idx * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl transition-colors ${spanClass} ${containerClasses}`}
          >
            {isFeaturedPhotoCard && (
              <div className="aspect-[21/9] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <img
                  src="https://picsum.photos/seed/minimalist-study-workspace/960/420"
                  alt="دفتر ملاحظات وبطاقات عمل مرتبة على طاولة تدريب"
                  width={960}
                  height={420}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            )}

            <div
              className={`flex flex-1 flex-col justify-between p-6 sm:p-7 ${
                isHorizontalBanner
                  ? "md:flex-row md:items-center md:justify-between md:gap-8"
                  : ""
              }`}
            >
              <div className={isHorizontalBanner ? "max-w-2xl" : ""}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    <Icon size={16} weight="duotone" />
                    <span>{meta.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        isNavySurfaceCard
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
                        className="h-6 w-16 animate-pulse rounded-xl bg-[var(--surface-subtle)] opacity-50"
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
                  className={`mt-2.5 text-sm leading-relaxed sm:text-base ${
                    isNavySurfaceCard
                      ? "text-[var(--text-navy-muted)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {activity.subtitle}
                </p>

                <p
                  className={`mt-3 text-xs font-medium ${
                    isNavySurfaceCard
                      ? "text-[var(--text-navy-muted)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {activity.agendaSlot} ({activity.prompts.length}{" "}
                  {activity.prompts.length <= 2 ? "مجموعات" : "مواقف"})
                </p>
              </div>

              <div
                className={`mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 ${
                  isHorizontalBanner
                    ? "md:mt-0 md:shrink-0 md:flex-col md:items-end md:border-t-0 md:pt-0"
                    : isNavySurfaceCard
                    ? "border-t border-white/15"
                    : "border-t border-[var(--border-subtle)]"
                }`}
              >
                <Link
                  href={`/${activity.slug}/`}
                  className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span>{record ? "إعادة النشاط" : "افتح النشاط"}</span>
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
