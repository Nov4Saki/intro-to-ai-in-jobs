"use client";

import { useEffect, useState } from "react";
import { Check, LinkSimple, Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      window.localStorage.setItem(
        "ai_in_jobs_theme",
        nextDark ? "dark" : "light"
      );
    } catch {
      // Ignore storage errors
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      className="tactile-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {mounted && isDark ? (
        <Sun size={20} weight="regular" />
      ) : (
        <Moon size={20} weight="regular" />
      )}
    </button>
  );
}

export function CopyLinkButton({
  relativePath = "",
  label = "نسخ الرابط",
  compact = false,
}: {
  relativePath?: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const origin = window.location.origin;
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const cleanRel = relativePath
        ? `${relativePath.replace(/^\/+|\/+$/g, "")}/`
        : "";
      const fullUrl = relativePath
        ? `${origin}${basePath}/${cleanRel}`
        : window.location.href;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`tactile-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
      }`}
    >
      {copied ? (
        <>
          <Check size={16} weight="bold" className="text-[var(--accent)]" />
          <span>تم النسخ</span>
        </>
      ) : (
        <>
          <LinkSimple size={16} weight="regular" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
