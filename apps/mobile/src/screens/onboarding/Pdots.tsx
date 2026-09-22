import { View } from "react-native";
import { theme } from "@/lib/theme";

/**
 * The 3-step progress dots on the welcome screen (design-lab FINAL-SPEC.md —
 * `.pdots`). The active step is an elongated indigo pill; the rest are quiet
 * dots. Laid out in a plain row so RTL mirrors it automatically — in Hebrew
 * step 1 sits at the right.
 */
export function Pdots({ current, total = 3 }: { current: number; total?: number }) {
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
              backgroundColor: on ? theme.colors.primary : "rgba(26,33,64,0.22)",
            }}
          />
        );
      })}
    </View>
  );
}
