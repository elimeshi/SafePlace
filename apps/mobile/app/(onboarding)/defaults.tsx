import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { resolveDefaultFilterSettings, type Gender } from "@safeplace/visibility-policy";
import { Button, Toggle } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { theme } from "@/lib/theme";

/**
 * Step 3 — "Your defaults" (master spec §6.2.3). READ-ONLY BY DESIGN, not a
 * loophole (visibility-model.md §5): it fulfils the transparency duty — the
 * user is *told* what was set for them and told they can change it — without
 * overwhelming a brand-new user with settings. Editing lives in the personal
 * area (Phase 6).
 *
 * The displayed values come straight from resolveDefaultFilterSettings in
 * @safeplace/visibility-policy (invariant #2 — never re-derive visibility
 * state locally), keyed by the gender chosen in Step 2. Presented neutrally
 * and symmetrically: identical labels and mechanism for both genders, only the
 * toggle state differs (invariants #3, #4).
 */
export default function Defaults() {
  const router = useRouter();
  const c = onboardingCopy.defaults;
  const { gender: genderParam, email } = useLocalSearchParams<{ gender: string; email: string }>();

  // Only reachable from Step 2 with a valid gender; guard a stray deep link.
  if (genderParam !== "male" && genderParam !== "female") {
    return <Redirect href="/welcome" />;
  }
  const gender: Gender = genderParam;
  const settings = resolveDefaultFilterSettings(gender);

  const rows = [
    { key: "hideContentWithWomen", label: c.hideContentWithWomen, value: settings.hideContentWithWomen },
    // TODO(open-question): hideWomenAccounts is displayed per master spec
    // §6.2.3, but its enforcement semantics are still undefined (see
    // open-questions-backlog.md §J and invariant #1). The value shown here is
    // the genuinely-seeded stored preference; revisit the copy if/when the
    // flag's meaning is defined.
    { key: "hideWomenAccounts", label: c.hideWomenAccounts, value: settings.hideWomenAccounts },
  ];

  return (
    <WizardScreen step={3}>
      <RiseIn index={0}>
        <Text style={{ ...theme.typeRole.h2, color: theme.colors.textPrimary }}>{c.title}</Text>
      </RiseIn>

      <RiseIn index={1}>
        <Text style={{ ...theme.typeRole.body, color: theme.colors.textSecondary }}>{c.intro}</Text>
      </RiseIn>

      <View style={{ gap: theme.spacing.md }}>
        {rows.map((row, i) => (
          <RiseIn key={row.key} index={2 + i}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.backgroundMuted,
              }}
            >
              <Text style={{ ...theme.typeRole.body, color: theme.colors.textPrimary, flex: 1 }}>
                {row.label}
              </Text>
              {/* Display-only: informs, never asks (spec §6.2.3). */}
              <Toggle value={row.value} readOnly />
            </View>
          </RiseIn>
        ))}
      </View>

      <RiseIn index={2 + rows.length}>
        <Button
          variant="cta"
          halo
          block
          onPress={() => router.push({ pathname: "/verify", params: { email: email ?? "" } })}
        >
          {c.continue}
        </Button>
      </RiseIn>
    </WizardScreen>
  );
}
