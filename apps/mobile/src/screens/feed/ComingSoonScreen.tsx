import { View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@safeplace/ui";
import { theme } from "@/lib/theme";
import { AppBar } from "./AppBar";
import { feedScreenCopy } from "./copy";
import { StatusBand } from "./shell";

/**
 * "Coming soon" placeholder: the Search / Profile tabs (lab `comingSoon`) and,
 * until Phase 5, the group / space / author pages the feed links to.
 */
export function ComingSoonScreen({
  title,
  heading,
  message,
  withBack = false,
}: {
  /** App-bar title (tabs); omitted → the wordmark. */
  title?: string;
  heading?: string;
  message?: string;
  /** Pages reached from a tap (not a tab) get a way back. */
  withBack?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBand />
      <AppBar title={title} />
      <EmptyState
        variant="comingSoon"
        title={heading}
        message={message}
        actionLabel={withBack ? feedScreenCopy.pageComingSoon.back : undefined}
        onAction={withBack ? () => router.back() : undefined}
      />
    </View>
  );
}
