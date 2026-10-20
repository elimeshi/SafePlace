import { useEffect } from "react";
import { Platform, View } from "react-native";
import { DirectionProvider, MotionPreferenceProvider } from "@safeplace/ui";
import type { ContentAudience } from "@safeplace/visibility-policy";
import { DirView, SceneArt, StatusBarMock } from "@/gallery/fixtures";
import { ComposeView, type ComposeHandlers } from "./ComposeView";
import { composeReducer, initialComposeState, type ComposeAction, type ComposeState } from "./composeState";
import type { ComposeContext } from "./data";

/**
 * DEV-ONLY (`__DEV__`) fixture scenes: the lab's compose screens fed to the REAL
 * ComposeView so scripts/pixel-compare can diff it against the lab
 * (`?fixtures=compose|exposure|composeGroup|exposureGroups|notice`). Never
 * reachable in a production bundle: the route checks __DEV__ before importing meaning.
 */
export const COMPOSE_FIXTURES = ["compose", "exposure", "composeGroup", "exposureGroups", "notice"] as const;
export type ComposeFixture = (typeof COMPOSE_FIXTURES)[number];

const GROUPS = [
  { id: "g1", name: "שכונת רמות", color: "#2E3A8C", icon: "home" as const, members: 1204 },
  { id: "g2", name: "גמ״ח ספרים", color: "#5B8C5A", icon: "users" as const, members: 86 },
  { id: "g3", name: "בית הכנסת המרכזי", color: "#A85751", icon: "home" as const, members: 412 },
  { id: "g4", name: "חסדי הקהילה", color: "#4A7C7C", icon: "users" as const, members: 238 },
];
const FAMILY = [{ id: "f1", name: "משפחת מזרחי", members: 9 }];
const PICKED: ContentAudience[] = [
  { kind: "followers_only", authorId: "me" },
  { kind: "group", groupId: "g1" },
  { kind: "group", groupId: "g2" },
];

const base = { userId: "me", name: "אבי מזרחי", groups: GROUPS, familySpaces: FAMILY };
const profileCtx: Pick<ComposeContext, "userId" | "name" | "entry" | "locked" | "groups" | "familySpaces"> = {
  ...base,
  entry: { kind: "profile" },
  locked: null,
};

const run = (actions: ComposeAction[], start: ComposeState): ComposeState => actions.reduce(composeReducer, start);
const pub = (): ComposeState => initialComposeState([{ kind: "public" }]);
const noop = () => {};
const handlers: ComposeHandlers = {
  onClose: noop,
  onPublish: noop,
  onText: noop,
  onOpenPicker: noop,
  onClosePicker: noop,
  onAudiences: noop,
  onPickMedia: noop,
  onRemoveMedia: noop,
  onLocationOpen: noop,
  onLocationSet: noop,
  onLocationClear: noop,
  onNoticeConfirm: noop,
  onNoticeBack: noop,
  onNoticeAppeal: noop,
  onDismissToast: noop,
};

export function ComposeFixtureScene({ scene }: { scene: ComposeFixture }) {
  // Web: react-native-web resolves start/end from the document direction and the `dir` prop.
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") document.documentElement.setAttribute("dir", "rtl");
  }, []);
  let ctx = profileCtx;
  let state: ComposeState;
  let art: "hills" | "table" = "hills";
  let step: "root" | "groups" | undefined;
  switch (scene) {
    case "compose":
      state = run(
        [
          { type: "text", text: "בוקר טוב מהטיול המשפחתי 🙏" },
          { type: "mediaPicked", localUri: "fixture", contentType: "image/jpeg" },
          { type: "mediaAttached", mediaId: "m1" },
          { type: "locationSet", name: "נחל שורק" },
        ],
        pub()
      );
      break;
    case "exposure":
    case "exposureGroups":
      state = run([{ type: "audiences", audiences: PICKED }, { type: "picker", open: true }], pub());
      step = scene === "exposureGroups" ? "groups" : undefined;
      break;
    case "composeGroup":
      ctx = { ...profileCtx, entry: { kind: "group", groupId: "g1" }, locked: { name: "שכונת רמות", icon: "users" } };
      state = initialComposeState([{ kind: "group", groupId: "g1" }]);
      break;
    case "notice":
      art = "table";
      state = run(
        [
          { type: "text", text: "שמחת בר המצווה של יוסי 🎉" },
          { type: "mediaPicked", localUri: "fixture", contentType: "image/jpeg" },
          { type: "mediaAttached", mediaId: "m1" },
          { type: "uploaderState", state: "filtered_for_some_viewers" },
        ],
        pub()
      );
      break;
  }
  return (
    <DirectionProvider value="rtl">
      <MotionPreferenceProvider value="reduce">
        <DirView dir="rtl" style={{ width: 390 }}>
          <View testID={`lab-${scene}`} style={{ width: 390, height: 844, overflow: "hidden", position: "relative", backgroundColor: "#FFFFFF" }}>
            <StatusBarMock />
            <ComposeView
              ctx={ctx}
              state={state}
              handlers={handlers}
              pickerInitialStep={step}
              renderPreview={() => <SceneArt k={art} top />}
            />
          </View>
        </DirView>
      </MotionPreferenceProvider>
    </DirectionProvider>
  );
}
