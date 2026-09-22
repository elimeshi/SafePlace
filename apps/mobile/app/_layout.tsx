import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Rubik_600SemiBold, Rubik_700Bold } from "@expo-google-fonts/rubik";
import {
  Assistant_400Regular,
  Assistant_500Medium,
  Assistant_600SemiBold,
  Assistant_700Bold,
} from "@expo-google-fonts/assistant";
import { bootstrapRTL } from "@/lib/rtl";
import { SessionProvider } from "@/session/SessionProvider";
import { Splash } from "@/session/Splash";

// Must run before the first render — see src/lib/rtl.ts.
bootstrapRTL();

export default function RootLayout() {
  // "Indigo Nights" type: Rubik (display) + Assistant (body). Family names here
  // must match the identifiers used in @safeplace/design-tokens typeRole.
  const [fontsLoaded] = useFonts({
    Rubik_600SemiBold,
    Rubik_700Bold,
    Assistant_400Regular,
    Assistant_500Medium,
    Assistant_600SemiBold,
    Assistant_700Bold,
  });

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        {fontsLoaded ? (
          <Stack screenOptions={{ headerShown: false }} />
        ) : (
          <Splash />
        )}
      </SessionProvider>
    </SafeAreaProvider>
  );
}
