import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { resolveDefaultFilterSettings, type Gender } from "@safeplace/visibility-policy";
import { Button, Toggle } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { GlassCard } from "@/screens/onboarding/GlassCard";
import { Pdots } from "@/screens/onboarding/Pdots";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { theme } from "@/lib/theme";

/**
 * Step 3 — "Your defaults" (master spec §6.2.3), "Full-bleed" composition
 * (design-lab FINAL-SPEC.md). READ-ONLY BY DESIGN, not a loophole
 * (visibility-model.md §5): it fulfils the transparency duty — the user is
 * *told* what was set for them and told they can change it — without
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
    <WizardScreen variant="fullbleed">
      {/* Step 3 of 3 — same progress dots as Welcome, light tone for the dark ground. */}
      <RiseIn index={0} style={{ alignItems: "center", marginBottom: 20.4 }}>
        <Pdots current={3} tone="light" />
      </RiseIn>
      <RiseIn index={1}>
        <GlassCard>
          <Text
            style={{
              fontFamily: theme.fontFamily.display,
              fontSize: 24, // lab .h-title <h2> 1.5em
              lineHeight: 28, // 1.18
              color: theme.colors.white,
              marginTop: 20, // <h2> default 0.83em margins (lab has no reset)
              marginBottom: 20,
            }}
          >
            {c.title}
          </Text>

          <Text
            style={{
              fontFamily: theme.fontFamily.base,
              fontSize: 15, // lab .fb-intro 0.94·fs
              lineHeight: 22.5, // 1.5
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {c.intro}
          </Text>

          {rows.map((row) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 13, // lab .trow gap 1.4u
                paddingTop: 13, // lab divider padding-top 1.4u
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.22)",
              }}
            >
              <Text
                style={{
                  fontFamily: theme.fontFamily.base,
                  fontSize: 15.4, // lab .trow p 0.96·fs
                  lineHeight: 21.8, // 1.42
                  color: theme.colors.white,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {row.label}
              </Text>
              {/* Display-only: informs, never asks (spec §6.2.3). */}
              <View style={{ alignItems: "center", gap: 4 }}>
                <Toggle value={row.value} readOnly onGlass />
                <Text
                  style={{
                    fontFamily: theme.fontFamily.base,
                    fontSize: 9.6, // lab .roflag 0.6·fs
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {c.readonly}
                </Text>
              </View>
            </View>
          ))}

          <Button
            variant="onGlass"
            size="onboarding"
            block
            onPress={() => router.push({ pathname: "/verify", params: { email: email ?? "" } })}
          >
            {c.continue}
          </Button>
        </GlassCard>
      </RiseIn>
    </WizardScreen>
  );
}
