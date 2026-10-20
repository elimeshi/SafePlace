import { Redirect, useLocalSearchParams } from "expo-router";
import { ComposeFixtureScene, COMPOSE_FIXTURES, type ComposeFixture } from "@/screens/compose/fixtures";

/**
 * DEV-ONLY: `/compose-fixtures?fixtures=<scene>` renders the real compose view
 * with the lab's data, outside the authenticated group, for scripts/pixel-compare.
 */
export default function ComposeFixtures() {
  const { fixtures } = useLocalSearchParams<{ fixtures?: string }>();
  if (!__DEV__ || !COMPOSE_FIXTURES.includes(fixtures as ComposeFixture)) return <Redirect href="/" />;
  return <ComposeFixtureScene scene={fixtures as ComposeFixture} />;
}
