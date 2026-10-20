import { Text, View } from "react-native";
import { feedGradients } from "@safeplace/design-tokens";
import { GradientFill } from "../foundation/GradientFill";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { contentCopy } from "./copy";
import { FILTERED_DEFAULT_HEIGHT, resolveFilteredStyle } from "./FilteredMedia.styles";

export interface FilteredMediaProps {
  height?: number;
  /** Hebrew defaults, prop-overridable per ADR 0007. Pass `hint={null}` to drop it (comment media). */
  label?: string;
  hint?: string | null;
}

/**
 * The placeholder for filtered media. UI defense-in-depth only: the caller
 * passes `filtered` after consulting visibility-policy / RLS, and a filtered
 * item never carries a media path in the first place (invariant #2).
 */
export function FilteredMedia({
  height = FILTERED_DEFAULT_HEIGHT,
  label = contentCopy.filteredLabel,
  hint = contentCopy.filteredHint,
}: FilteredMediaProps) {
  const s = resolveFilteredStyle(height);
  return (
    <GradientFill gradient={feedGradients.filteredPanel} style={s.container}>
      <View style={s.eye}>
        <Icon name="eye" size={s.eyeIconSize} color={theme.colors.primary} />
      </View>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </GradientFill>
  );
}
