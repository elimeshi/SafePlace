import { useLocalSearchParams } from "expo-router";

/**
 * DEV ONLY, web: `/dev-post?fixtures=<scene>` renders the real single-post
 * screen on the lab's fixture data (no session, no backend) for pixel
 * comparison. Outside the (app) group on purpose, because that group redirects
 * signed-out visitors. Renders nothing in a production build.
 */
export default function DevPost() {
  const { fixtures } = useLocalSearchParams<{ fixtures?: string }>();
  if (!__DEV__) return null;
  // Required lazily so the fixtures and the gallery stay out of production bundles.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PostFixtureHost } = require("@/screens/post/PostFixtureHost") as typeof import("@/screens/post/PostFixtureHost");
  return <PostFixtureHost scene={fixtures ?? "post"} />;
}
