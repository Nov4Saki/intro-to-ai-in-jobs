import type { Activity, Session } from "../domain/types.ts";
import { SESSION_1, getActivity as getActivity1, listActivities as listActivities1 } from "./session-1.ts";
import { SESSION_2, getActivitySession2 as getActivity2, listActivitiesSession2 as listActivities2 } from "./session-2.ts";
import { SESSION_3, getActivitySession3 as getActivity3, listActivitiesSession3 as listActivities3 } from "./session-3.ts";

export const ALL_SESSIONS: readonly Session[] = [SESSION_1, SESSION_2, SESSION_3];

export function getAllSessions(): readonly Session[] {
  return ALL_SESSIONS;
}

export function getSession(sessionNumber: number): Session | undefined {
  return ALL_SESSIONS.find((s) => s.number === sessionNumber);
}

export function listAllActivities(): readonly Activity[] {
  return [...listActivities1(), ...listActivities2(), ...listActivities3()];
}

export function findActivity(slug: string): Activity | undefined {
  return getActivity1(slug) ?? getActivity2(slug) ?? getActivity3(slug);
}

export { SESSION_1, SESSION_2, SESSION_3 };
