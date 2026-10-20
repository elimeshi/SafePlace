import type { ContentAudience } from "@safeplace/visibility-policy";
import type { IconName } from "../content/Icon.glyphs";
import { exposureCopy, type ExposureCopy } from "./copy";

export interface SpaceOption {
  id: string;
  name: string;
  /** Group colour from the palette (groups); Family Spaces ignore it. */
  color?: string;
  icon?: IconName;
  /** A number only — never a list (invariant #5). */
  members: number;
}

export interface ExposureSummary {
  label: string;
  icon: IconName;
}

/**
 * The exposure chip's text and glyph for a selection: "ציבורי" / "עוקבים + 2
 * קבוצות". One group or one Family Space is named; several are counted.
 */
export function exposureSummary(
  selection: readonly ContentAudience[],
  names: { groups: readonly SpaceOption[]; familySpaces: readonly SpaceOption[] },
  copy: Pick<ExposureCopy, "chipPublic" | "chipFollowers" | "chipGroups" | "chipFamilySpaces" | "chipNone"> = exposureCopy
): ExposureSummary {
  if (selection.length === 0) return { label: copy.chipNone, icon: "users" };
  if (selection.some((a) => a.kind === "public")) return { label: copy.chipPublic, icon: "globe" };

  const groups = selection.filter((a): a is Extract<ContentAudience, { kind: "group" }> => a.kind === "group");
  const family = selection.filter((a): a is Extract<ContentAudience, { kind: "family_space" }> => a.kind === "family_space");
  const followers = selection.some((a) => a.kind === "followers_only");

  const parts: string[] = [];
  if (followers) parts.push(copy.chipFollowers);
  if (groups.length === 1) parts.push(names.groups.find((g) => g.id === groups[0]!.groupId)?.name ?? copy.chipGroups);
  else if (groups.length > 1) parts.push(`${groups.length} ${copy.chipGroups}`);
  if (family.length === 1) parts.push(names.familySpaces.find((g) => g.id === family[0]!.spaceId)?.name ?? copy.chipFamilySpaces);
  else if (family.length > 1) parts.push(`${family.length} ${copy.chipFamilySpaces}`);

  const icon: IconName = family.length ? "family" : groups.length ? "users" : "user";
  return { label: parts.join(" + "), icon };
}
