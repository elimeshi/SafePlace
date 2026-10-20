import { feedbackCopy } from "@safeplace/ui";
import { ComingSoonScreen } from "@/screens/feed/ComingSoonScreen";
import { feedScreenCopy } from "@/screens/feed/copy";

export default function SearchTab() {
  return (
    <ComingSoonScreen
      title={feedScreenCopy.searchTitle}
      heading={feedbackCopy.searchComingSoon.title}
      message={feedbackCopy.searchComingSoon.message}
    />
  );
}
