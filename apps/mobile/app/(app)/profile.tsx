import { ComingSoonScreen } from "@/screens/feed/ComingSoonScreen";
import { feedScreenCopy } from "@/screens/feed/copy";

export default function ProfileTab() {
  return (
    <ComingSoonScreen
      title={feedScreenCopy.profileTitle}
      heading={feedScreenCopy.profileComingSoon.title}
      message={feedScreenCopy.profileComingSoon.message}
    />
  );
}
