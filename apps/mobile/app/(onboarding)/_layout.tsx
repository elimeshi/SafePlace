import { Redirect, Stack } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { useSession } from "@/session/SessionProvider";
import { Splash } from "@/session/Splash";

/**
 * The onboarding wizard group. An already-authenticated user has no business
 * here — bounce them into the app. Step-to-step transitions slide the next
 * step in from the left, so forward progress moves in the same direction as
 * the step dots advance (step 1 → 2 → 3, left to right); under reduced motion
 * this drops to a plain cross-fade (§6.3.4). The per-element staggered rise-in
 * is applied inside each step, not here.
 */
export default function OnboardingLayout() {
  const { session, initializing } = useSession();
  const reducedMotion = useReducedMotion();

  if (initializing) return <Splash />;
  if (session) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? "fade" : "slide_from_left",
      }}
    />
  );
}
