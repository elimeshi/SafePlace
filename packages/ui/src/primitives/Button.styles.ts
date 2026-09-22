import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for Button — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/forms/Button.jsx. The bright cyan accent backs
 * the `cta` variant; `primary` leads with deep indigo; `onGlass` is the white
 * pill used on the full-bleed onboarding cards (indigo label on white).
 */

export type ButtonVariant =
  | "primary"
  | "cta"
  | "secondary"
  | "ghost"
  | "danger"
  | "onGlass";
export type ButtonSize = "sm" | "md" | "lg" | "onboarding";
export type ButtonState = "rest" | "pressed";

interface VariantColors {
  bg: string;
  bgPressed: string;
  text: string;
  border: string;
}

const VARIANTS: Record<ButtonVariant, VariantColors> = {
  primary: {
    bg: theme.colors.primary,
    bgPressed: theme.colors.primaryDark,
    text: theme.colors.textOnPrimary,
    border: "transparent",
  },
  cta: {
    bg: theme.colors.accent,
    bgPressed: theme.colors.cyan700,
    text: theme.colors.white,
    border: "transparent",
  },
  secondary: {
    bg: "transparent",
    bgPressed: theme.colors.blue050,
    text: theme.colors.primary,
    border: theme.colors.borderStrong,
  },
  // Full-bleed onboarding card CTA: solid white pill, indigo label.
  onGlass: {
    bg: theme.colors.white,
    bgPressed: theme.colors.blue050,
    text: theme.colors.primary,
    border: "transparent",
  },
  ghost: {
    bg: "transparent",
    bgPressed: theme.colors.blue050,
    text: theme.colors.primary,
    border: "transparent",
  },
  danger: {
    bg: theme.colors.white,
    bgPressed: theme.colors.dangerSoft,
    text: theme.colors.danger,
    border: theme.colors.danger,
  },
};

interface SizeSpec {
  minHeight: number;
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  borderRadius: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: theme.fontSize.sm,
    borderRadius: theme.radius.md,
  },
  md: {
    minHeight: 44, // iOS/Android minimum comfortable touch target
    paddingVertical: 11,
    paddingHorizontal: 22,
    fontSize: theme.fontSize.base,
    borderRadius: theme.radius.md,
  },
  lg: {
    minHeight: 52,
    paddingVertical: 15,
    paddingHorizontal: 28,
    fontSize: theme.fontSize.lg,
    borderRadius: theme.radius.lg,
  },
  // Onboarding CTA — exact lab metrics (design-lab .cta): padding 2u≈18.6,
  // font 1.02·fs≈16.3, radius = --radius (18).
  onboarding: {
    minHeight: 54,
    paddingVertical: 18.6,
    paddingHorizontal: 18.6,
    fontSize: 16.3,
    borderRadius: theme.radius.lg,
  },
};

export interface ResolveButtonStyleArgs {
  variant: ButtonVariant;
  size: ButtonSize;
  state: ButtonState;
  disabled: boolean;
}

export function resolveButtonStyle({
  variant,
  size,
  state,
  disabled,
}: ResolveButtonStyleArgs): { container: ViewStyle; label: TextStyle } {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return {
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      minHeight: s.minHeight,
      paddingVertical: s.paddingVertical,
      paddingHorizontal: s.paddingHorizontal,
      borderRadius: s.borderRadius,
      borderWidth: 1,
      borderColor: v.border,
      backgroundColor: state === "pressed" ? v.bgPressed : v.bg,
      opacity: disabled ? 0.5 : 1,
    },
    label: {
      color: v.text,
      fontFamily: theme.fontFamily.semibold,
      fontSize: s.fontSize,
      letterSpacing: theme.tracking.label,
    },
  };
}
