/**
 * Single import surface for design tokens inside the mobile app. Re-exports
 * the RN theme bridge from @safeplace/ui so screens import `theme` from one
 * place (see docs/decisions/0005-ui-component-library.md).
 */
export { theme, type Theme } from "@safeplace/ui";
