/**
 * Safe-Place elevation tokens — RN-shaped shadow props derived from the
 * blue-tinted, soft, low shadows in the locked design system
 * (design-reference/tokens/spacing.css). CSS box-shadow does not port to
 * React Native, so these are expressed as RN style fragments: iOS reads the
 * shadow* fields, Android reads `elevation`. Never heavy black drop-shadows.
 */
export const elevation = {
  xs: {
    shadowColor: "#10263C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#10263C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: "#10263C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: "#10263C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 6,
  },
} as const;
