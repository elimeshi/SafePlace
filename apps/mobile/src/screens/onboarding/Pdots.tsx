import { View } from "react-native";
import { theme } from "@/lib/theme";

/**
 * The 3-step progress dots shown across the wizard (design-lab FINAL-SPEC.md —
 * `.pdots`), so the user always sees which step they're on. The active step is
 * an elongated pill; the rest are quiet dots. Laid out in a plain row so RTL
 * mirrors it automatically — in Hebrew step 1 sits at the right.
 *
 * `tone` matches the ground it sits on: "dark" (default) = indigo pill on the
 * light Welcome gradient; "light" = white pill on the dark full-bleed gradient
 * of Sign-up / Defaults.
 */
export function Pdots({
  current,
  total = 3,
  tone = "dark",
}: {
  current: number;
  total?: number;
  tone?: "dark" | "light";
}) {
  const onColor = tone === "light" ? theme.colors.white : theme.colors.primary;
  const offColor = tone === "light" ? "rgba(255,255,255,0.4)" : "rgba(26,33,64,0.22)";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={{ flexDirection: "row", gap: 7, alignItems: "center" }}
    >
      {Array.from({ length: total }, (_, i) => {
        const on = i + 1 === current;
        return (
          <View
            key={i}
            style={{
              width: on ? 22 : 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: on ? onColor : offColor,
            }}
          />
        );
      })}
    </View>
  );
}
