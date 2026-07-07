import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { bootstrapRTL } from "@/lib/rtl";

// Must run before the first render — see src/lib/rtl.ts.
bootstrapRTL();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
