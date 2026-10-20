import { isAudienceSetValid, type ContentAudience } from "@safeplace/visibility-policy";

/**
 * Selection mechanics for the multi-select exposure picker (plan §2a). The
 * combination rule itself — public is exclusive, a Family Space never mixes
 * with a non-Family-Space audience — lives ONLY in visibility-policy's
 * `isAudienceSetValid`; nothing here restates it. This file only decides what
 * a tap does and asks the policy whether the result is legal.
 */

const same = (a: ContentAudience, b: ContentAudience): boolean => {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "group":
      return a.groupId === (b as typeof a).groupId;
    case "family_space":
      return a.spaceId === (b as typeof a).spaceId;
    default:
      return true; // public / followers_only are singletons within one author's picker
  }
};

export const hasAudience = (selection: readonly ContentAudience[], a: ContentAudience): boolean =>
  selection.some((s) => same(s, a));

/**
 * What tapping `toggled` does to `current`: untick it if ticked; otherwise add
 * it. Adding "public" replaces everything (public includes everyone); adding
 * anything else first drops "public". If the policy rejects the result (a
 * Family Space against a non-family audience, or the reverse) the tap is not
 * allowed and this returns null.
 */
export function applyAudienceToggle(
  current: readonly ContentAudience[],
  toggled: ContentAudience
): ContentAudience[] | null {
  if (hasAudience(current, toggled)) return current.filter((s) => !same(s, toggled));
  const base = toggled.kind === "public" ? [] : current.filter((s) => s.kind !== "public");
  const next = [...base, toggled];
  return isAudienceSetValid(next) ? next : null;
}

/** A row is disabled when ticking it would produce a combination the policy rejects. */
export const isAudienceTogglable = (current: readonly ContentAudience[], candidate: ContentAudience): boolean =>
  applyAudienceToggle(current, candidate) !== null;

/** Whether the picker's confirm / the composer's Publish may proceed with this selection. */
export const isSelectionValid = (selection: readonly ContentAudience[]): boolean => isAudienceSetValid(selection);
