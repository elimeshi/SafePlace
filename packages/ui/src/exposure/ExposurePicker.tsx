import { useState } from "react";
import type { ContentAudience } from "@safeplace/visibility-policy";
import { ActionButton } from "../primitives/ActionButton";
import { formatCount } from "../feed/copy";
import { BottomSheet, SheetGroupLabel } from "../sheets/BottomSheet";
import { SheetRow } from "../sheets/SheetRow";
import { applyAudienceToggle, hasAudience, isAudienceTogglable, isSelectionValid } from "./audience";
import { exposureCopy } from "./copy";
import type { SpaceOption } from "./summary";

export type { SpaceOption } from "./summary";

export interface ExposurePickerProps {
  /** The current selection (seeded by `profiles.default_post_exposure`). */
  value: readonly ContentAudience[];
  onChange: (next: ContentAudience[]) => void;
  /** The author's id — the "followers" audience is addressed to their followers. */
  authorId: string;
  /** Only spaces the author belongs to (the server re-checks membership). */
  groups: readonly SpaceOption[];
  familySpaces: readonly SpaceOption[];
  onConfirm?: () => void;
  onDismiss?: () => void;
  /** Overrides (ADR 0007). */
  copy?: Partial<Omit<typeof exposureCopy, "confirmCount">> & { confirmCount?: (n: number) => string };
  /** Start on a sub-list (gallery / tests). */
  initialStep?: "root" | "groups" | "family";
}

/**
 * The multi-select exposure picker (plan §2a, lab `exposure` /
 * `exposureGroups`): public, my followers, groups (second step), Family
 * Spaces (second step). Every tap goes through `applyAudienceToggle`, which
 * defers the combination rule to visibility-policy `isAudienceSetValid`;
 * rows the policy would reject render greyed and inert.
 */
export function ExposurePicker({
  value,
  onChange,
  authorId,
  groups,
  familySpaces,
  onConfirm,
  onDismiss,
  copy,
  initialStep = "root",
}: ExposurePickerProps) {
  const c = { ...exposureCopy, ...copy };
  const [step, setStep] = useState<"root" | "groups" | "family">(initialStep);

  const toggle = (a: ContentAudience) => {
    const next = applyAudienceToggle(value, a);
    if (next) onChange(next);
  };

  const publicA: ContentAudience = { kind: "public" };
  const followersA: ContentAudience = { kind: "followers_only", authorId };
  const groupA = (id: string): ContentAudience => ({ kind: "group", groupId: id });
  const familyA = (id: string): ContentAudience => ({ kind: "family_space", spaceId: id });

  if (step !== "root") {
    const isFamily = step === "family";
    const options = isFamily ? familySpaces : groups;
    const audienceOf = isFamily ? familyA : groupA;
    const chosen = options.filter((o) => hasAudience(value, audienceOf(o.id))).length;
    return (
      <BottomSheet
        title={isFamily ? c.familyStepTitle : c.groupsStepTitle}
        onBack={() => setStep("root")}
        onDismiss={onDismiss}
        testID="exposure-step"
      >
        <SheetGroupLabel>{isFamily ? c.familyStepSection : c.groupsStepSection}</SheetGroupLabel>
        {options.map((o) => {
          const checked = hasAudience(value, audienceOf(o.id));
          return (
            <SheetRow
              key={o.id}
              control={{ type: "checkbox", checked }}
              tile={{
                icon: isFamily ? "family" : (o.icon ?? "users"),
                background: isFamily ? "#2E3A8C" : (o.color ?? "#2E3A8C"),
                color: "#FFFFFF",
              }}
              label={o.name}
              hint={`${formatCount(o.members)} ${c.membersSuffix}`}
              selected={checked}
              disabled={!checked && !isAudienceTogglable(value, audienceOf(o.id))}
              onPress={() => toggle(audienceOf(o.id))}
              testID={`exposure-space-${o.id}`}
            />
          );
        })}
        <ActionButton label={c.confirmCount(chosen)} onPress={() => setStep("root")} style={{ marginTop: 4, marginHorizontal: 20 }} />
      </BottomSheet>
    );
  }

  const names = (opts: readonly SpaceOption[], mk: (id: string) => ContentAudience) =>
    opts.filter((o) => hasAudience(value, mk(o.id))).map((o) => o.name).join(", ");
  const groupNames = names(groups, groupA);
  const familyNames = names(familySpaces, familyA);
  const anyGroup = groupNames.length > 0;
  const anyFamily = familyNames.length > 0;
  // Probes: could the picker add a group / a Family Space right now? Asked of the policy, never inlined.
  const groupsOpen = anyGroup || groups.some((g) => isAudienceTogglable(value, groupA(g.id)));
  const familyOpen = anyFamily || familySpaces.some((f) => isAudienceTogglable(value, familyA(f.id)));

  return (
    <BottomSheet title={c.title} subtitle={c.subtitle} onDismiss={onDismiss} testID="exposure-picker">
      <SheetRow
        control={{ type: "checkbox", checked: hasAudience(value, publicA) }}
        icon="globe"
        label={c.public}
        hint={c.publicHint}
        selected={hasAudience(value, publicA)}
        onPress={() => toggle(publicA)}
        testID="exposure-public"
      />
      <SheetRow
        control={{ type: "checkbox", checked: hasAudience(value, followersA) }}
        icon="user"
        label={c.followers}
        hint={c.followersHint}
        selected={hasAudience(value, followersA)}
        disabled={!hasAudience(value, followersA) && !isAudienceTogglable(value, followersA)}
        onPress={() => toggle(followersA)}
        testID="exposure-followers"
      />
      <SheetRow
        control={{ type: "checkbox", checked: anyGroup }}
        icon="users"
        label={c.groups}
        hint={groupNames || undefined}
        selected={anyGroup}
        disabled={!groupsOpen}
        trailing="forward"
        onPress={() => setStep("groups")}
        testID="exposure-groups"
      />
      <SheetRow
        control={{ type: "checkbox", checked: anyFamily }}
        icon="family"
        label={c.family}
        hint={familyOpen ? familyNames || undefined : c.familyBlockedHint}
        selected={anyFamily}
        disabled={!familyOpen}
        trailing="forward"
        onPress={() => setStep("family")}
        testID="exposure-family"
      />
      <ActionButton
        label={c.confirm}
        disabled={!isSelectionValid(value)}
        onPress={onConfirm}
        style={{ marginTop: 4, marginHorizontal: 20 }}
        testID="exposure-confirm"
      />
    </BottomSheet>
  );
}
