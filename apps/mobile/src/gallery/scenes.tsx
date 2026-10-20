import type { ReactElement } from "react";
import { View } from "react-native";
import {
  BottomTabs,
  CollapsedStrip,
  CommentBox,
  CommentBubble,
  CommentMenuCatalogSheet,
  ComposeActionBar,
  ComposeIdentity,
  ComposeMediaPreview,
  ComposeTextField,
  ComposeTopBar,
  EmptyState,
  ExpandedPanel,
  ExposureChip,
  ExposurePicker,
  FollowRail,
  LocationChip,
  MoreCommentsLink,
  OwnPostMenuSheet,
  PlusMenuSheet,
  PostCard,
  PostMenuSheet,
  PostTopBar,
  QuoteCard,
  ReportSheet,
  ShareSheet,
  Skeleton,
  SkeletonPostCard,
  StatusesRail,
  Toast,
  UploaderNotice,
  WhySheet,
  feedbackCopy,
  StateStrip,
} from "@safeplace/ui";
import type { ContentAudience } from "@safeplace/visibility-policy";
import {
  AppBar,
  FeedColumn,
  LabCard,
  Phone,
  POSTS,
  SRC,
  SceneArt,
  ScrollArea,
  StatusBarMock,
  TopZones,
} from "./fixtures";

/**
 * The 24 lab screens (docs/design/phase-4-feed/feed-lab.html, `?screen=<name>`)
 * rebuilt from the real @safeplace/ui components at 390×844, each tagged
 * `data-testid="lab-<name>"` so scripts/pixel-compare can crop it and diff it
 * against the lab's own render and the reference PNG.
 */

const noop = () => {};
const ME = { name: "אבי מזרחי" };

const GROUPS = [
  { id: "g1", name: "שכונת רמות", color: "#2E3A8C", icon: "home" as const, members: 1204 },
  { id: "g2", name: "גמ״ח ספרים", color: "#5B8C5A", icon: "users" as const, members: 86 },
  { id: "g3", name: "בית הכנסת המרכזי", color: "#A85751", icon: "home" as const, members: 412 },
  { id: "g4", name: "חסדי הקהילה", color: "#4A7C7C", icon: "users" as const, members: 238 },
];
const FAMILY = [{ id: "f1", name: "משפחת מזרחי", members: 9 }];

export const PICKER_VALUE: ContentAudience[] = [
  { kind: "followers_only", authorId: "me" },
  { kind: "group", groupId: "g1" },
  { kind: "group", groupId: "g2" },
];

const FeedShell = ({ name, children, tab = "home" as const, overlay }: { name: string; children: React.ReactNode; tab?: "home" | "search" | "profile"; overlay?: React.ReactNode }) => (
  <Phone name={name} bare>
    <StatusBarMock />
    <AppBar />
    <ScrollArea>{children}</ScrollArea>
    <BottomTabs active={tab} onChange={noop} />
    {overlay}
  </Phone>
);

const ComposeShell = ({ name, children, overlay }: { name: string; children: React.ReactNode; overlay?: React.ReactNode }) => (
  <Phone name={name} bare>
    <StatusBarMock />
    <View style={{ flex: 1, flexDirection: "column", backgroundColor: "#FFFFFF" }}>{children}</View>
    {overlay}
  </Phone>
);

const PostShell = ({ name, children, overlay }: { name: string; children: React.ReactNode; overlay?: React.ReactNode }) => (
  <Phone name={name} bare>
    <StatusBarMock />
    <PostTopBar />
    {children}
    {overlay}
  </Phone>
);

const FullPost = ({ author }: { author?: string }) => (
  <PostCard
    variant="detail"
    post={{ ...POSTS[0]!.data, author: { name: author ?? POSTS[0]!.data.author.name } }}
    mediaSlot={<SceneArt k="street" />}
  />
);

const CommentsList = ({ children }: { children: React.ReactNode }) => (
  <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 90, flexDirection: "column", gap: 14, backgroundColor: "#FFFFFF" }}>{children}</View>
);

const SARA = { name: "שרה גולדברג" };
const MOSHE = { name: "משה רוזנברג" };
const YOSSI = { name: "יוסי ברק" };

export const SCENES: Record<string, () => ReactElement> = {
  feed: () => (
    <FeedShell name="feed">
      <TopZones />
      <FeedColumn>
        <LabCard post={POSTS[0]!} />
        <LabCard post={POSTS[1]!} />
      </FeedColumn>
    </FeedShell>
  ),

  scrolled: () => (
    <Phone name="scrolled" bare>
      <StatusBarMock />
      <CollapsedStrip avatars={[{ name: "+" }]} />
      <ScrollArea>
        <FeedColumn>
          <LabCard post={POSTS[2]!} />
          <LabCard post={POSTS[3]!} />
        </FeedColumn>
        <FollowRail
          style={{ position: "absolute", start: 0, end: 0, bottom: 0 }}
          items={[
            { userId: "1", name: "ישראל אברהמי", bio: "שיעורים יומיים בדף היומי", followers: 2431 },
            { userId: "2", name: "לוח קהילתי רמות", bio: "מודעות ועדכונים מהשכונה", followers: 890 },
            { userId: "3", name: "נתן שפירא", followers: 312 },
          ]}
        />
      </ScrollArea>
      <BottomTabs active="home" />
    </Phone>
  ),

  menu: () => (
    <FeedShell name="menu" overlay={<PostMenuSheet variant="suggested" authorName="יעקב פרידמן" />}>
      <FeedColumn>
        <LabCard post={POSTS[2]!} />
      </FeedColumn>
    </FeedShell>
  ),

  why: () => (
    <FeedShell name="why" overlay={<WhySheet authorName="יעקב פרידמן" followedOnly={false} />}>
      <FeedColumn>
        <LabCard post={POSTS[2]!} />
      </FeedColumn>
    </FeedShell>
  ),

  compose: () => (
    <ComposeShell name="compose">
      <ComposeTopBar canPublish />
      <ComposeIdentity name={ME.name}>
        <ExposureChip label="ציבורי" icon="globe" onPress={noop} />
      </ComposeIdentity>
      <ComposeTextField value="בוקר טוב מהטיול המשפחתי 🙏" onChangeText={noop} />
      <ComposeMediaPreview checking>
        <SceneArt k="hills" top />
      </ComposeMediaPreview>
      <LocationChip name="נחל שורק" />
      <View style={{ flex: 1 }} />
      <ComposeActionBar />
    </ComposeShell>
  ),

  exposure: () => (
    <ComposeShell
      name="exposure"
      overlay={<ExposurePicker value={PICKER_VALUE} onChange={noop} authorId="me" groups={GROUPS} familySpaces={FAMILY} />}
    >
      <ComposeTopBar canPublish={false} />
      <ComposeIdentity name={ME.name}>
        <ExposureChip label="עוקבים + 2 קבוצות" icon="users" onPress={noop} />
      </ComposeIdentity>
      <ComposeTextField value="" onChangeText={noop} />
    </ComposeShell>
  ),

  composeGroup: () => (
    <ComposeShell name="composeGroup">
      <ComposeTopBar title="פוסט בקבוצה" canPublish={false} />
      <ComposeIdentity name={ME.name}>
        <ExposureChip locked label="שכונת רמות" icon="users" help="פוסט שנכתב בקבוצה נשאר בקבוצה." />
      </ComposeIdentity>
      <ComposeTextField value="" onChangeText={noop} placeholder="כתוב לקבוצה…" />
      <View style={{ flex: 1 }} />
      <ComposeActionBar />
    </ComposeShell>
  ),

  notice: () => (
    <ComposeShell name="notice">
      <ComposeTopBar canPublish />
      <ComposeIdentity name={ME.name}>
        <ExposureChip label="ציבורי" icon="globe" onPress={noop} />
      </ComposeIdentity>
      <ComposeTextField value="שמחת בר המצווה של יוסי 🎉" onChangeText={noop} />
      <ComposeMediaPreview height={150}>
        <SceneArt k="table" top />
      </ComposeMediaPreview>
      <UploaderNotice mode="beforePublish" />
      <View style={{ flex: 1 }} />
      <ComposeActionBar />
    </ComposeShell>
  ),

  post: () => (
    <PostShell
      name="post"
      overlay={
        <View style={{ position: "absolute", start: 0, end: 0, bottom: 0, zIndex: 5 }}>
          <CommentBox me={ME} value="" onChangeText={noop} />
        </View>
      }
    >
      <ScrollArea white>
        <FullPost />
        <CommentsList>
          <CommentBubble author={SARA} time="לפני שעה" body="איזה יופי! תודה על הארגון המושלם 👏" likes={6} liked />
          <CommentBubble level={2} author={MOSHE} time="לפני 40 דק׳" mention="שרה גולדברג" body="תודה רבה, בזכותכם!" />
          <CommentBubble author={YOSSI} time="לפני 30 דק׳" body="הנה תמונה מהחלוקה בבוקר:" mediaFiltered likes={2} />
          <MoreCommentsLink />
        </CommentsList>
      </ScrollArea>
    </PostShell>
  ),

  share: () => (
    <PostShell name="share" overlay={<ShareSheet canShareToGroup groupName="שכונת רמות" canCopyLink={false} />}>
      <ScrollArea white>
        <FullPost />
      </ScrollArea>
    </PostShell>
  ),

  own: () => (
    <FeedShell name="own">
      <FeedColumn>
        <PostCard
          post={{ author: ME, time: "לפני 10 דק׳", source: SRC.public, body: "ערב שבת בבית 🕯️", likes: 0, comments: 0 }}
          mediaSlot={<SceneArt k="table" />}
          mediaHeight={150}
          stateStrip={<StateStrip kind="review" />}
        />
        <PostCard
          post={{ author: ME, time: "לפני שעה", source: SRC.public, body: "שמחת בר המצווה של יוסי 🎉", likes: 3, comments: 1 }}
          mediaSlot={<SceneArt k="table" />}
          mediaHeight={150}
          stateStrip={<UploaderNotice mode="afterPublish" />}
        />
      </FeedColumn>
    </FeedShell>
  ),

  empty: () => (
    <FeedShell name="empty">
      <StatusesRail emptyHint={null} />
      <EmptyState variant="empty" />
    </FeedShell>
  ),

  error: () => (
    <FeedShell name="error">
      <EmptyState variant="error" />
    </FeedShell>
  ),

  plusMenu: () => (
    <FeedShell name="plusMenu" overlay={<PlusMenuSheet />}>
      <TopZones />
    </FeedShell>
  ),

  report: () => (
    <FeedShell name="report" overlay={<ReportSheet value={1} />}>
      <FeedColumn>
        <LabCard post={POSTS[1]!} />
      </FeedColumn>
    </FeedShell>
  ),

  reportSent: () => (
    <FeedShell name="reportSent" overlay={<Toast message={feedbackCopy.reportSent} />}>
      <FeedColumn>
        <LabCard post={POSTS[1]!} />
        <LabCard post={POSTS[3]!} />
      </FeedColumn>
    </FeedShell>
  ),

  quote: () => (
    <FeedShell name="quote">
      <FeedColumn>
        {[false, true].map((gone) => (
          <PostCard
            key={String(gone)}
            post={{ author: ME, time: "לפני 20 דק׳", source: SRC.ramot, body: gone ? "שווה לקרוא 👇" : "מילים כל כך נכונות, שווה לקרוא 👇", likes: 4, comments: 0 }}
            quote={
              gone ? (
                <QuoteCard state="unavailable" />
              ) : (
                <QuoteCard
                  state="available"
                  author={{ name: "הרב אליהו כהן" }}
                  time="אתמול"
                  body="מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב. שבת שלום לכולם."
                />
              )
            }
          />
        ))}
      </FeedColumn>
    </FeedShell>
  ),

  exposureGroups: () => (
    <ComposeShell
      name="exposureGroups"
      overlay={<ExposurePicker initialStep="groups" value={PICKER_VALUE} onChange={noop} authorId="me" groups={GROUPS} familySpaces={FAMILY} />}
    >
      <ComposeTopBar canPublish={false} />
      <ComposeIdentity name={ME.name}>
        <ExposureChip label="עוקבים + 2 קבוצות" icon="users" onPress={noop} />
      </ComposeIdentity>
      <ComposeTextField value="" onChangeText={noop} />
    </ComposeShell>
  ),

  reply: () => (
    <PostShell
      name="reply"
      overlay={
        <View style={{ position: "absolute", start: 0, end: 0, bottom: 0, zIndex: 5 }}>
          <CommentBox me={ME} value="" onChangeText={noop} replyingTo="שרה גולדברג" />
        </View>
      }
    >
      <ScrollArea white>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 90, flexDirection: "column", gap: 14, backgroundColor: "#FFFFFF" }}>
          <CommentBubble author={SARA} time="לפני שעה" body="איזה יופי! תודה על הארגון המושלם 👏" likes={6} liked highlighted />
          <CommentBubble level={2} author={MOSHE} time="לפני 40 דק׳" mention="שרה גולדברג" body="תודה רבה, בזכותכם!" />
          <CommentBubble author={YOSSI} time="לפני 30 דק׳" body="מתי החלוקה הבאה?" likes={2} />
        </View>
      </ScrollArea>
    </PostShell>
  ),

  ownMenu: () => (
    <PostShell name="ownMenu" overlay={<OwnPostMenuSheet />}>
      <ScrollArea white>
        <FullPost author="אבי מזרחי" />
      </ScrollArea>
    </PostShell>
  ),

  commentMenu: () => (
    <PostShell name="commentMenu" overlay={<CommentMenuCatalogSheet authorName="יוסי ברק" />}>
      <ScrollArea white>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 90, flexDirection: "column", gap: 14, backgroundColor: "#FFFFFF" }}>
          <CommentBubble author={YOSSI} time="לפני 30 דק׳" body="מתי החלוקה הבאה?" likes={2} highlighted />
        </View>
      </ScrollArea>
    </PostShell>
  ),

  comingSoon: () => (
    <Phone name="comingSoon" bare>
      <StatusBarMock />
      <AppBar title="חיפוש" />
      <ScrollArea>
        <EmptyState variant="comingSoon" />
      </ScrollArea>
      <BottomTabs active="search" />
    </Phone>
  ),

  skeleton: () => (
    <FeedShell name="skeleton">
      <StatusesRail emptyHint={null} />
      <View style={{ paddingTop: 4, paddingHorizontal: 18, paddingBottom: 8 }}>
        <Skeleton width={90} height={14} />
      </View>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={156} height={150} radius={18} />
        ))}
      </View>
      <FeedColumn paddingTop={4}>
        <SkeletonPostCard media />
        <SkeletonPostCard />
      </FeedColumn>
    </FeedShell>
  ),

  expanded: () => (
    <Phone name="expanded" bare>
      <StatusBarMock />
      <ScrollArea>
        <FeedColumn paddingTop={330}>
          <LabCard post={POSTS[2]!} />
        </FeedColumn>
      </ScrollArea>
      <BottomTabs active="home" />
      <ExpandedPanel>
        <TopZones />
      </ExpandedPanel>
    </Phone>
  ),
};

export const SCENE_NAMES = Object.keys(SCENES);
