import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--surface-page)] px-4 text-center">
      <div className="surface-elevated max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          هذه الصفحة غير موجودة
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          تأكّد من صحة رابط النشاط أو ارجع إلى لوحة الجلسة الأولى لاختيار النشاط المطلوب.
        </p>
        <Link
          href="/"
          className="tactile-btn mt-6 inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
        >
          العودة إلى لوحة الجلسة
        </Link>
      </div>
    </div>
  );
}
