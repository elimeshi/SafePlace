import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Button, useRiseIn } from "@safeplace/ui";
import { signOut } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/session/SessionProvider";
import { theme } from "@/lib/theme";

/**
 * PLACEHOLDER authenticated home (Phase 2). Confirms the session shell end to
 * end — a signed-in user lands here, a signed-out user can't. The real main
 * feed replaces this in Phase 4 (master spec §5.2). Kept intentionally sparse,
 * but never blank: it greets the user and offers a way back out.
 */
export default function Home() {
  const { user } = useSession();
  const rise = useRiseIn(0);
  const name = (user?.user_metadata?.display_name as string | undefined) ?? "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Animated.View
        style={[
          rise,
          { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.lg, padding: theme.spacing.xl },
        ]}
      >
        <Text style={{ ...theme.typeRole.h1, color: theme.colors.primary, textAlign: "center" }}>
          {name ? `ברוך בואך, ${name}` : "ברוך בואך"}
        </Text>
        <Text style={{ ...theme.typeRole.body, color: theme.colors.textSecondary, textAlign: "center" }}>
          החשבון שלך מוכן. הפיד יגיע בהמשך הפיתוח.
        </Text>
        <Button variant="secondary" onPress={() => void signOut(supabase)}>
          התנתקות
        </Button>
      </Animated.View>
    </SafeAreaView>
  );
}
