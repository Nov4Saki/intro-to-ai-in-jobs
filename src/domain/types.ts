export type Mechanic =
  | "bucket-sort"
  | "matching"
  | "sequence"
  | "draft-review"
  | "myth-fact"
  | "odd-one-out"
  | "choice";

export type BucketTone = "teal" | "coral" | "gold" | "indigo";

export interface BucketCategory {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly tone: BucketTone;
}

export interface BucketSortItem {
  readonly id: string;
  readonly label: string;
  readonly bucketId: string;
  readonly explanation: string;
}

export interface BucketSortPrompt {
  readonly id: string;
  readonly mechanic: "bucket-sort";
  readonly contextTag: string;
  readonly title: string;
  readonly instruction: string;
  readonly buckets: readonly BucketCategory[];
  readonly items: readonly BucketSortItem[];
  readonly completionNote: string;
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

export interface OddOneOutItem {
  readonly id: string;
  readonly label: string;
  readonly isOdd: boolean;
  readonly note: string;
}

export interface OddOneOutPrompt {
  readonly id: string;
  readonly mechanic: "odd-one-out";
  readonly contextTag: string;
  readonly title: string;
  readonly groupRule: string;
  readonly items: readonly OddOneOutItem[];
  readonly explanation: string;
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

export interface SequenceStep {
  readonly id: string;
  readonly label: string;
}

export interface SequencePrompt {
  readonly id: string;
  readonly mechanic: "sequence";
  readonly contextTag: string;
  readonly title: string;
  readonly instruction: string;
  readonly stepsInOrder: readonly SequenceStep[];
  readonly explanation: string;
}

export type Prompt =
  | BucketSortPrompt
  | MatchingPrompt
  | MythFactPrompt
  | DraftReviewPrompt
  | OddOneOutPrompt
  | ChoicePrompt
  | SequencePrompt;

export type AttendeeResponse =
  | {
      readonly mechanic: "bucket-sort";
      readonly itemId: string;
      readonly bucketId: string;
    }
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
  | { readonly mechanic: "odd-one-out"; readonly itemId: string }
  | { readonly mechanic: "choice"; readonly optionId: string }
  | {
      readonly mechanic: "sequence";
      readonly orderedStepIds: readonly string[];
    };

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
  readonly partBadge: string;
  readonly slideRange: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly subtitle: string;
  readonly mechanicsUsed: readonly Mechanic[];
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
  readonly warmupPrompt: BucketSortPrompt;
  readonly activities: readonly Activity[];
}
