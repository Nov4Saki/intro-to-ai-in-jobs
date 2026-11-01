"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Article,
  CaretLeft,
  ChatCenteredDots,
  CheckCircle,
  Cpu,
  NotePencil,
  ShieldCheck,
  Sparkle,
  UserCheck,
} from "@phosphor-icons/react";
import type { Session } from "@/domain/types";
import { CopyLinkButton, ThemeToggle } from "@/components/theme-toggle";
import { WarmupPreview } from "@/components/warmup-preview";
import { HubBentoGrid, HubProgressPill } from "@/components/hub-bento";

const ARABIC_DIGITS = ["١", "٢", "٣", "٤"];

const WORKFLOW_STEPS_SESSION_1 = [
  {
    title: "المُدخَل",
    body: "تقدّمون الملاحظات أو البيانات المسموح بها وفق قواعد مؤسستكم.",
    lip: "deck-lip-indigo",
    medallion: "bg-[var(--medallion-indigo)] text-[var(--medallion-indigo-ink)]",
    Icon: NotePencil,
  },
  {
    title: "المعالجة",
    body: "يبحث النظام عن الأنماط المشتركة استناداً إلى آلاف الأمثلة السابقة.",
    lip: "deck-lip-teal",
    medallion: "bg-[var(--medallion-teal)] text-[var(--medallion-teal-ink)]",
    Icon: Cpu,
  },
  {
    title: "المُخرَج",
    body: "يقترح مسودة أولى أو تصنيفاً أو توقعاً محتملاً قابلاً للخطأ.",
    lip: "deck-lip-gold",
    medallion: "bg-[var(--medallion-gold)] text-[var(--medallion-gold-ink)]",
    Icon: Article,
  },
  {
    title: "المراجعة البشرية",
    body: "تقرأون النص وتتحقّقون من الحقائق وتصحّحونه قبل اتخاذ القرار.",
    lip: "deck-lip-coral",
    medallion: "bg-[var(--medallion-coral)] text-[var(--medallion-coral-ink)]",
    Icon: UserCheck,
  },
] as const;

const WORKFLOW_STEPS_SESSION_2 = [
  {
    title: "تحديد الدور",
    body: "تعيين هوية الخبير وخلفيته لضبط نبرة الاستجابة ومستوى الدقة المطلوب.",
    lip: "deck-lip-indigo",
    medallion: "bg-[var(--medallion-indigo)] text-[var(--medallion-indigo-ink)]",
    Icon: UserCheck,
  },
  {
    title: "السياق والبيانات",
    body: "تزويد النموذج بالحقائق والقيود النظامية لمنع الافتراض والارتجال العشوائي.",
    lip: "deck-lip-teal",
    medallion: "bg-[var(--medallion-teal)] text-[var(--medallion-teal-ink)]",
    Icon: Article,
  },
  {
    title: "صياغة المهمة والشروط",
    body: "تحديد الفعل المطلوب وشكل المخرجات بوضوح مع وضع قيود الطول والصيغة.",
    lip: "deck-lip-gold",
    medallion: "bg-[var(--medallion-gold)] text-[var(--medallion-gold-ink)]",
    Icon: NotePencil,
  },
  {
    title: "فحص الهلوسة بالقلم الأصفر",
    body: "تدقيق كل رقم وتاريخ ومصدر واستبعاد أي ادعاء لا يدعمه مستند رسمي موثوق.",
    lip: "deck-lip-coral",
    medallion: "bg-[var(--medallion-coral)] text-[var(--medallion-coral-ink)]",
    Icon: ShieldCheck,
  },
] as const;

export function SessionHubView({
  sessions,
}: {
  sessions: readonly Session[];
}) {
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const session = sessions[selectedSessionIndex] ?? sessions[0];
  const firstActivity = session.activities[0];

  const workflowSteps =
    session.number === 2 ? WORKFLOW_STEPS_SESSION_2 : WORKFLOW_STEPS_SESSION_1;

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* Navigation bar, capped at 64px */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/92 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
              الذكاء الاصطناعي في العمل
            </span>
            <div className="hidden items-center gap-1.5 md:flex">
              {sessions.map((s, idx) => {
                const isActive = idx === selectedSessionIndex;
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => setSelectedSessionIndex(idx)}
                    className={`tactile-btn rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                        : "border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    الجلسة {s.number}: {s.number === 1 ? "الأساسيات" : "تعلّم الآلة والتوليد"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <HubProgressPill total={session.activities.length} />
            <CopyLinkButton label="مشاركة اللوحة" compact />
            <ThemeToggle />
            {firstActivity && (
              <Link
                href={`/${firstActivity.slug}/`}
                className="tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span>ابدأ بالجزء الأول</span>
                <ArrowLeft size={15} weight="bold" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile session switcher bar */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto">
          {sessions.map((s, idx) => {
            const isActive = idx === selectedSessionIndex;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setSelectedSessionIndex(idx)}
                className={`tactile-btn flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-secondary)]"
                }`}
              >
                الجلسة {s.number}: {s.number === 1 ? "الأساسيات" : "تعلّم الآلة والتوليد"}
              </button>
            );
          })}
        </div>
      </div>

      <main>
        {/* Section 1: Asymmetric Split Hero fitting initial viewport */}
        <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 pt-8 pb-12 sm:px-6 md:pt-10 lg:min-h-[680px] lg:px-8">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Hero text stack */}
            <div className="w-full lg:col-span-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-block rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                  دورة الذكاء الاصطناعي · المدرب {session.trainerName}
                </p>
                <span className="rounded-full border border-[var(--lip-gold)] bg-[var(--medallion-gold)] px-3 py-0.5 text-xs font-bold text-[var(--medallion-gold-ink)]">
                  الجلسة {session.number} من {session.totalSessions}
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-bold leading-[1.2] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-[3.25rem]">
                {session.title}
                <span
                  aria-hidden="true"
                  className="mt-4 block h-1.5 w-16 rounded-full bg-[var(--lip-coral)]"
                />
              </h1>

              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                {session.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                {firstActivity && (
                  <Link
                    href={`/${firstActivity.slug}/`}
                    className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                  >
                    <span>ابدأ ألعاب الجزء الأول</span>
                    <ArrowLeft size={18} weight="bold" />
                  </Link>
                )}

                <a
                  href="#sections"
                  className="tactile-btn inline-flex items-center whitespace-nowrap rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                >
                  تصفّح محطات الجلسة ({session.activities.length})
                </a>
              </div>
            </div>

            {/* Interactive Warmup Demo */}
            <div className="w-full lg:col-span-6">
              <WarmupPreview prompt={session.warmupPrompt} />
            </div>
          </div>
        </section>

        {/* Section 2: Slide-Deck Bento Grid */}
        <section
          id="sections"
          className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              المحطات التفاعلية للجلسة {session.number}
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              بعد انتهاء كل محور من شرائح العرض، افتح محطته واستمتع بمزيج من دِلاء التصنيف وتوصيل الأزواج وترتيب المسارات وكشف الجمل الدخيلة.
            </p>
          </div>

          <HubBentoGrid activities={session.activities} />
        </section>

        {/* Section 3: Horizontal 4-Card Flow with Numbered Badges & Coral Chevrons */}
        <section className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {session.number === 1
                ? "من المُدخَل إلى القرار البشري"
                : "أركان المطالبة الاحترافية والتدقيق البشري"}
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              {session.number === 1
                ? "الفكرة التي تجمع شرائح الجلسة كلها: الذكاء الاصطناعي يصيغ المسودة الأولى، وأنتم تراجعون وتقرّرون."
                : "الذكاء التوليدي مرآة لما تعطيه: كلما كانت معطياتك دقيقة وخالية من التناقض، كانت مسودته المبدئية رصينة ومفيدة."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            {workflowSteps.map(({ title, body, lip, medallion, Icon }, idx) => (
              <div key={title} className="relative flex items-stretch">
                <div
                  className={`deck-card relative flex w-full flex-col items-center rounded-2xl p-6 text-center ${lip}`}
                >
                  <span className="absolute -top-3.5 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-navy)] text-xs font-bold text-[var(--text-navy-surface)]">
                    {ARABIC_DIGITS[idx]}
                  </span>

                  <div
                    className={`mb-4 mt-1 inline-flex h-14 w-14 items-center justify-center rounded-full ${medallion}`}
                  >
                    <Icon size={26} weight="duotone" />
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {body}
                  </p>
                </div>

                {idx < workflowSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -left-4 z-10 hidden -translate-y-1/2 text-[var(--lip-coral)] md:inline-flex"
                  >
                    <CaretLeft size={24} weight="bold" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            {session.title} ({session.hijriDate}) · إعداد وتدريب {session.trainerName}
          </p>
          <nav
            aria-label="روابط سريعة لأجزاء الجلسة"
            className="flex flex-wrap gap-3.5"
          >
            {session.activities.map((act) => (
              <Link
                key={act.slug}
                href={`/${act.slug}/`}
                className="font-medium hover:text-[var(--accent)]"
              >
                {act.partBadge}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
