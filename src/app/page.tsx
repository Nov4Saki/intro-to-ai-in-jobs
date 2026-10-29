import Link from "next/link";
import {
  ArrowLeft,
  Article,
  CaretLeft,
  Cpu,
  NotePencil,
  UserCheck,
} from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/content/session-1";
import { CopyLinkButton, ThemeToggle } from "@/components/theme-toggle";
import { WarmupPreview } from "@/components/warmup-preview";
import { HubBentoGrid, HubProgressPill } from "@/components/hub-bento";

const ARABIC_DIGITS = ["١", "٢", "٣", "٤"];

const WORKFLOW_STEPS = [
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

export default function HomePage() {
  const session = getSession();

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* Single-line navigation, capped at 64px */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/92 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
              مقدمة في الذكاء الاصطناعي
            </span>
            <span className="hidden rounded-full border border-[var(--lip-gold)] bg-[var(--medallion-gold)] px-3 py-0.5 text-xs font-bold text-[var(--medallion-gold-ink)] md:inline-block">
              الجلسة {session.number} من {session.totalSessions}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <HubProgressPill total={session.activities.length} />
            <CopyLinkButton label="مشاركة اللوحة" compact />
            <ThemeToggle />
            <Link
              href="/part-1-basics/"
              className="tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <span>ابدأ بالجزء الأول</span>
              <ArrowLeft size={15} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: Asymmetric Split Hero fitting initial viewport */}
        <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 pt-8 pb-12 sm:px-6 md:pt-10 lg:min-h-[680px] lg:px-8">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Hero text stack: strictly 4 elements */}
            <div className="w-full lg:col-span-6">
              <p className="inline-block rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                دورة الذكاء الاصطناعي · المدرب {session.trainerName}
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-[1.2] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-[3.25rem]">
                العب وطبّق أفكار كل جزء بأنشطة تفاعلية سريعة
                <span
                  aria-hidden="true"
                  className="mt-4 block h-1.5 w-16 rounded-full bg-[var(--lip-coral)]"
                />
              </h1>

              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                ثماني محطات ترافق شرائح العرض بالترتيب: اسحب القطع إلى الدِّلاء، وصّل الأمثلة، رتّب الخطوات، وظلّل الهفوات بالقلم الأصفر بلا درجات أو تعقيد.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/part-1-basics/"
                  className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                >
                  <span>ابدأ ألعاب الجزء الأول</span>
                  <ArrowLeft size={18} weight="bold" />
                </Link>

                <a
                  href="#sections"
                  className="tactile-btn inline-flex items-center whitespace-nowrap rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                >
                  تصفّح جميع الأجزاء
                </a>
              </div>
            </div>

            {/* Slide 1 cover illustration + interactive 3-card Bucket Sort demo */}
            <div className="w-full lg:col-span-6">
              <WarmupPreview prompt={session.warmupPrompt} />
            </div>
          </div>
        </section>

        {/* Section 2: 8-Cell Asymmetric Slide-Deck Bento Grid */}
        <section
          id="sections"
          className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              الألعاب التفاعلية حسب أجزاء العرض التقديمي
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              بعد انتهاء كل جزء من الشرائح، افتح محطته واستمتع بمزيج من دِلاء التصنيف وتوصيل الأزواج وترتيب المسارات وكشف الجمل الدخيلة.
            </p>
          </div>

          <HubBentoGrid activities={session.activities} />
        </section>

        {/* Section 3: Slide 25 Horizontal 4-Card Flow with Numbered Badges & Coral Chevrons */}
        <section className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              من المُدخَل إلى القرار البشري
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              الفكرة التي تجمع شرائح الجلسة كلها: الذكاء الاصطناعي يصيغ المسودة الأولى، وأنتم تراجعون وتقرّرون.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            {WORKFLOW_STEPS.map(({ title, body, lip, medallion, Icon }, idx) => (
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

                {idx < WORKFLOW_STEPS.length - 1 && (
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
            {session.title} ({session.hijriDate}) · إعداد وتدريب{" "}
            {session.trainerName}
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
