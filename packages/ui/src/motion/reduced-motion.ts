// Re-export reanimated's reduced-motion hook so components have one stable
// import path within this package. It reads the OS "reduce motion" setting
// and updates on change (invariant: all custom motion gates on this).
export { useReducedMotion } from "react-native-reanimated";
