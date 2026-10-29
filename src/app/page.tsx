import Link from "next/link";
import {
  ArrowLeft,
  Article,
  Cpu,
  NotePencil,
  UserCheck,
} from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/content/session-1";
import { CopyLinkButton, ThemeToggle } from "@/components/theme-toggle";
import { WarmupPreview } from "@/components/warmup-preview";
import { HubBentoGrid, HubProgressPill } from "@/components/hub-bento";

const WORKFLOW_STEPS = [
  {
    title: "المُدخَل",
    body: "تقدّمون الملاحظات أو البيانات المسموح بها وفق قواعد مؤسستكم.",
    Icon: NotePencil,
  },
  {
    title: "المعالجة",
    body: "يبحث النظام عن الأنماط المشتركة استناداً إلى آلاف الأمثلة السابقة.",
    Icon: Cpu,
  },
  {
    title: "المُخرَج",
    body: "يقترح مسودة أولى أو تصنيفاً أو توقعاً محتملاً قابلاً للخطأ.",
    Icon: Article,
  },
  {
    title: "المراجعة البشرية",
    body: "تقرأون النص وتتحقّقون من الحقائق وتصحّحونه قبل اتخاذ القرار.",
    Icon: UserCheck,
  },
] as const;

export default function HomePage() {
  const session = getSession();

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* Single-line navigation, capped at 64px */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
              الذكاء الاصطناعي في العمل
            </span>
            <span className="hidden rounded-xl bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] md:inline-block">
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
        <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 pt-10 pb-14 sm:px-6 md:pt-14 lg:px-8">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Hero text stack: strictly 4 elements */}
            <div className="w-full lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                الجلسة الأولى - المدرب {session.trainerName}
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-[1.18] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-[3.35rem]">
                افهم الذكاء الاصطناعي وجرّب مهارات كل جزء عملياً
              </h1>

              <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                ثماني محطات تفاعلية تتبع أجزاء العرض التقديمي بالترتيب، وتجمع في كل جزء بين الترتيب والتوصيل وفحص المسودات والاختبار.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/part-1-basics/"
                  className="tactile-btn inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                >
                  <span>ابدأ بالجزء الأول</span>
                  <ArrowLeft size={18} weight="bold" />
                </Link>

                <a
                  href="#sections"
                  className="tactile-btn inline-flex items-center whitespace-nowrap rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-base"
                >
                  تصفّح أجزاء الجلسة
                </a>
              </div>
            </div>

            {/* Live interactive warm-up prompt + real studio visual */}
            <div className="w-full lg:col-span-6">
              <WarmupPreview prompt={session.warmupPrompt} />
            </div>
          </div>
        </section>

        {/* Section 2: 8-Cell Asymmetric Bento Grid following every presentation section */}
        <section
          id="sections"
          className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              محطات الجلسة حسب أجزاء العرض التقديمي
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              بعد انتهاء كل جزء من الشرائح، افتح محطته الخاصة لخوض مزيج من التحديات المصممة لقياس مهارات ذلك الجزء تحديداً.
            </p>
          </div>

          <HubBentoGrid activities={session.activities} />
        </section>

        {/* Section 3: Open border-grouped workflow recap */}
        <section className="mx-auto max-w-7xl border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10 max-w-[62ch]">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              من المُدخَل إلى القرار البشري
            </h2>
            <p className="mt-2.5 text-base leading-relaxed text-[var(--text-secondary)]">
              القاعدة المحورية عبر جميع أجزاء الجلسة: الذكاء الاصطناعي يسرّع المسودة الأولى والفرز، وتبقى المسؤولية على البشر.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] md:grid-cols-4 md:divide-x md:divide-y-0 md:divide-x-reverse">
            {WORKFLOW_STEPS.map(({ title, body, Icon }) => (
              <div
                key={title}
                className="py-6 md:px-6 md:py-8 first:md:pr-0 last:md:pl-0"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon size={22} weight="duotone" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            {session.title} ({session.hijriDate}) - إعداد وتدريب{" "}
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
