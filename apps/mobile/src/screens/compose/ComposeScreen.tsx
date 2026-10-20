import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, Skeleton } from "@safeplace/ui";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/session/SessionProvider";
import { screenCopy } from "./copy";
import { ComposeView } from "./ComposeView";
import { loadComposeContext, type ComposeContext, type ComposeEntry } from "./data";
import { useComposeController } from "./useComposeController";

const WHITE = "#FFFFFF";

function Frame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: WHITE, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

function Loaded({ ctx }: { ctx: ComposeContext }) {
  const { state, handlers } = useComposeController(ctx);
  return <ComposeView ctx={ctx} state={state} handlers={handlers} />;
}

/** The compose route body (profile / group / Family Space contexts, 02 §2). */
export function ComposeScreen({ entry }: { entry: ComposeEntry }) {
  const { user } = useSession();
  const [ctx, setCtx] = useState<ComposeContext | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const key = `${entry.kind}:${"groupId" in entry ? entry.groupId : "spaceId" in entry ? entry.spaceId : ""}`;

  useEffect(() => {
    if (!user) return;
    let live = true;
    setFailed(false);
    loadComposeContext(supabase, user.id, entry)
      .then((c) => live && setCtx(c))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // `key` stands in for the entry object identity.
  }, [user, key, attempt]);

  if (failed) {
    return (
      <Frame>
        <EmptyState
          variant="error"
          title={screenCopy.loadError.title}
          message={screenCopy.loadError.message}
          actionLabel={screenCopy.loadError.action}
          onAction={() => setAttempt((n) => n + 1)}
        />
      </Frame>
    );
  }
  if (!ctx) {
    return (
      <Frame>
        <View style={{ padding: 18, gap: 14 }} testID="compose-loading">
          <Skeleton height={44} radius={22} width={200} />
          <Skeleton height={120} />
          <Skeleton height={190} radius={18} />
        </View>
      </Frame>
    );
  }
  return (
    <Frame>
      <Loaded ctx={ctx} />
    </Frame>
  );
}
