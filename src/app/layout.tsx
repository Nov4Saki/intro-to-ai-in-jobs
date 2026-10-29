import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Readex_Pro,
} from "next/font/google";
import "./globals.css";

const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مقدمة في الذكاء الاصطناعي - الأنشطة التفاعلية للجلسة الأولى",
  description:
    "أنشطة صفية تفاعلية لفهم الذكاء الاصطناعي ودوره في العمل اليومي: تصنيف السيناريوهات، توصيل المهام، المراجعة البشرية، وفحص المفاهيم.",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('ai_in_jobs_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
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
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${readexPro.variable} ${ibmPlexArabic.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
