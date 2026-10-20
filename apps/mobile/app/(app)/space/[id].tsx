import { ComingSoonScreen } from "@/screens/feed/ComingSoonScreen";
import { feedScreenCopy } from "@/screens/feed/copy";

/** Placeholder until the Family Space page ships (Phase 5). */
export default function SpacePlaceholder() {
  return <ComingSoonScreen withBack heading={feedScreenCopy.pageComingSoon.title} message={feedScreenCopy.pageComingSoon.message} />;
}
