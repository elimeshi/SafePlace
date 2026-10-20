import { ComingSoonScreen } from "@/screens/feed/ComingSoonScreen";
import { feedScreenCopy } from "@/screens/feed/copy";

/** Placeholder until profile pages ship (Phase 5). */
export default function AuthorPlaceholder() {
  return <ComingSoonScreen withBack heading={feedScreenCopy.pageComingSoon.title} message={feedScreenCopy.pageComingSoon.message} />;
}
