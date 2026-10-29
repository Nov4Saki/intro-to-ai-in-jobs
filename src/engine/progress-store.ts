export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ActivityCompletionRecord {
  readonly slug: string;
  readonly bestMasteryPercent: number;
  readonly completedAtIso: string;
}

export type SessionProgressMap = Readonly<Record<string, ActivityCompletionRecord>>;

const STORAGE_KEY = "ai_in_jobs_session_1_progress_v1";

export function createMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

export function getBrowserStorageAdapter(): StorageAdapter {
  if (typeof window === "undefined") {
    return createMemoryStorageAdapter();
  }
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore quota or private-mode write failures
      }
    },
  };
}

export function loadProgress(adapter: StorageAdapter): SessionProgressMap {
  const raw = adapter.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SessionProgressMap;
  } catch {
    return {};
  }
}

export function recordCompletion(
  adapter: StorageAdapter,
  slug: string,
  masteryPercent: number,
  nowIso: string = new Date().toISOString()
): SessionProgressMap {
  const current = loadProgress(adapter);
  const existing = current[slug];
  const bestMasteryPercent = existing
    ? Math.max(existing.bestMasteryPercent, masteryPercent)
    : masteryPercent;

  const updated: SessionProgressMap = {
    ...current,
    [slug]: {
      slug,
      bestMasteryPercent,
      completedAtIso: nowIso,
    },
  };

  adapter.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
