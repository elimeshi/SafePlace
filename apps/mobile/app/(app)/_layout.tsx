import { Redirect, Stack } from "expo-router";
import { useSession } from "@/session/SessionProvider";
import { Splash } from "@/session/Splash";

/**
 * The authenticated area. Everything under here requires a live session; an
 * unauthenticated visitor is sent to the onboarding wizard. This is the app's
 * UI-tier gate — it is defense-in-depth on top of RLS (invariant #2), never
 * the only line of defense.
 */
export default function AppLayout() {
  const { session, initializing } = useSession();

  if (initializing) return <Splash />;
  if (!session) return <Redirect href="/welcome" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
