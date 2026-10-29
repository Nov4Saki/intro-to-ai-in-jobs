import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مقدمة في الذكاء الاصطناعي · الأنشطة والألعاب التفاعلية للجلسة الأولى",
  description:
    "أنشطة وألعاب تفاعلية خفيفة ترافق شرائح الجلسة الأولى لفهم الذكاء الاصطناعي ودوره في العمل اليومي.",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('ai_in_jobs_theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Readex+Pro:wght@500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
