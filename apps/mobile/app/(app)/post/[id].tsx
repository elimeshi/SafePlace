import { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";
import { useSession } from "@/session/SessionProvider";
import { createSupabaseBackend } from "@/screens/post/data";
import { PostScreen } from "@/screens/post/PostScreen";

/** Single post (spec 03). Reached from the feed, a group, a profile or a copied link. */
export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const userId = user?.id ?? "";
  const backend = useMemo(() => createSupabaseBackend(supabase, userId), [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <PostScreen
        backend={backend}
        postId={String(id)}
        topInset={insets.top}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        onOpenPost={(postId) => router.push({ pathname: "/post/[id]", params: { id: postId } })}
      />
    </View>
  );
}
