import { useLocalSearchParams } from "expo-router";
import { ComposeScreen } from "@/screens/compose/ComposeScreen";
import { parseEntry } from "@/screens/compose/data";

/**
 * Compose route. Profile context by default; `?group=<id>` / `?space=<id>` open
 * the group / Family Space context with the audience locked (02 §4.3). Only the
 * feed "+" is wired in Phase 4; group pages link here in Phase 5.
 */
export default function Compose() {
  const params = useLocalSearchParams<{ group?: string; space?: string }>();
  return <ComposeScreen entry={parseEntry(params)} />;
}
