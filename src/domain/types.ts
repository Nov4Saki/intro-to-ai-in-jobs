export type Mechanic =
  | "triage"
  | "matching"
  | "myth-fact"
  | "draft-review"
  | "choice";

export type TriageBucket = "ai" | "automation" | "unsure";

export interface TriagePrompt {
  readonly id: string;
  readonly mechanic: "triage";
  readonly contextTag: string;
  readonly scenario: string;
  readonly expectedBucket: TriageBucket;
  readonly explanation: string;
}

export interface MatchingPair {
  readonly id: string;
  readonly concept: string;
  readonly example: string;
}

export interface MatchingPrompt {
  readonly id: string;
  readonly mechanic: "matching";
  readonly title: string;
  readonly instruction: string;
  readonly pairs: readonly MatchingPair[];
  readonly completionNote: string;
}

export interface MythFactPrompt {
  readonly id: string;
  readonly mechanic: "myth-fact";
  readonly claim: string;
  readonly reality: "myth" | "fact";
  readonly correctionTitle: string;
  readonly explanation: string;
}

export interface DraftSegment {
  readonly id: string;
  readonly text: string;
  readonly isFlawed: boolean;
  readonly note: string;
}

export interface DraftReviewPrompt {
  readonly id: string;
  readonly mechanic: "draft-review";
  readonly title: string;
  readonly roleContext: string;
  readonly sourceNotes: readonly string[];
  readonly draftHeader: string;
  readonly segments: readonly DraftSegment[];
  readonly takeaway: string;
}

export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
  readonly rationale: string;
}

export interface ChoicePrompt {
  readonly id: string;
  readonly mechanic: "choice";
  readonly contextTag: string;
  readonly question: string;
  readonly options: readonly ChoiceOption[];
  readonly correctOptionId: string;
}

export type Prompt =
  | TriagePrompt
  | MatchingPrompt
  | MythFactPrompt
  | DraftReviewPrompt
  | ChoicePrompt;

export type AttendeeResponse =
  | { readonly mechanic: "triage"; readonly bucket: TriageBucket }
  | {
      readonly mechanic: "matching";
      readonly conceptPairId: string;
      readonly examplePairId: string;
    }
  | { readonly mechanic: "myth-fact"; readonly judgment: "myth" | "fact" }
  | {
      readonly mechanic: "draft-review";
      readonly flaggedSegmentIds: readonly string[];
    }
  | { readonly mechanic: "choice"; readonly optionId: string };

export type VerdictOutcome = "accurate" | "partial" | "revisit";

export interface VerdictDetail {
  readonly label: string;
  readonly note: string;
  readonly accurate: boolean;
}

export interface Verdict {
  readonly outcome: VerdictOutcome;
  readonly headline: string;
  readonly explanation: string;
  readonly promptResolved: boolean;
  readonly details?: readonly VerdictDetail[];
}

export interface Activity {
  readonly slug: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly subtitle: string;
  readonly mechanic: Mechanic;
  readonly agendaSlot: string;
  readonly estimatedMinutes: number;
  readonly learningGoal: string;
  readonly prompts: readonly Prompt[];
  readonly closingTakeaway: string;
}

export interface Session {
  readonly number: number;
  readonly totalSessions: number;
  readonly title: string;
  readonly subtitle: string;
  readonly trainerName: string;
  readonly hijriDate: string;
  readonly durationMinutes: number;
  readonly warmupPrompt: TriagePrompt;
  readonly activities: readonly Activity[];
}
