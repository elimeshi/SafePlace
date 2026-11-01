// services/moderation-pipeline/src/providers/escalating.ts
/**
 * Escalation tier (ADR 0018 §6): what the first model could not settle is
 * asked again of a stronger one, before a human is asked. Only the undecided
 * groups are taken from the second answer; a settled answer is never
 * overturned by escalation — that is what the review queue is for.
 */
import { resolveMediaOutcome, type ClassificationThresholds } from "../classification";
import type { ClassifierInput, ClassifierOutput, ClassifierProvider, ContentGroup } from "../classifier";

export interface EscalatingClassifierOptions {
  primary: ClassifierProvider;
  secondary: ClassifierProvider;
  thresholds: ClassificationThresholds;
  onEscalate?: (event: { mediaItemId: string; groups: ContentGroup[] }) => void;
}

export function createEscalatingClassifier(options: EscalatingClassifierOptions): ClassifierProvider {
  return {
    name: `${options.primary.name}+${options.secondary.name}`,

    async classify(input: ClassifierInput): Promise<ClassifierOutput> {
      const first = await options.primary.classify(input);
      if (first.kind === "refused") return first;

      const { undecided } = resolveMediaOutcome(first, options.thresholds);
      if (undecided.length === 0) return first;

      options.onEscalate?.({ mediaItemId: input.mediaItemId, groups: undecided });
      const second = await options.secondary.classify(input);
      if (second.kind === "refused") return second;

      const groups = { ...first.groups };
      for (const g of undecided) groups[g] = second.groups[g];
      return { kind: "verdicts", groups };
    },
  };
}
