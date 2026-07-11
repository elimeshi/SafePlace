import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { bootstrapRTL } from "@/lib/rtl";
import { SessionProvider } from "@/session/SessionProvider";

// Must run before the first render — see src/lib/rtl.ts.
bootstrapRTL();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
