import { type ReactNode, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import type { ContentAudience } from "@safeplace/visibility-policy";
import {
  ActionButton,
  Avatar,
  BottomTabs,
  Button,
  Checkbox,
  CollapsedStrip,
  CollapsibleZones,
  CommentBox,
  CommentBubble,
  CommentMenuSheet,
  DirectionProvider,
  EmptyState,
  ExposureChip,
  ExposurePicker,
  FilteredMedia,
  FollowRail,
  GenderChoice,
  ICON_NAMES,
  Icon,
  InteractionBar,
  MotionPreferenceProvider,
  MiniButton,
  OwnPostMenuSheet,
  PlusMenuSheet,
  PostCard,
  PostMenuSheet,
  QuoteCard,
  ReportSheet,
  ShareSheet,
  SheetRow,
  BottomSheet,
  Skeleton,
  SkeletonPostCard,
  SourceLabel,
  SpaceCard,
  StateStrip,
  StatusesRail,
  SystemNotice,
  TextField,
  Toast,
  Toggle,
  UploaderNotice,
  WhySheet,
  exposureSummary,
  feedbackCopy,
  isSelectionValid,
  useRiseIn,
} from "@safeplace/ui";
import { theme } from "@/lib/theme";
import { DirView, GROUP, LabCard, POSTS, SRC, SceneArt, TopZones, AppBar } from "@/gallery/fixtures";
import { SCENES, SCENE_NAMES } from "@/gallery/scenes";

/**
 * Component gallery. Renders every @safeplace/ui piece in its key states so
 * RTL layout and motion can be eyeballed on a device or on Expo web, plus the
 * 24 lab screens (docs/design/phase-4-feed) at 390x844 for pixel comparison
 * (scripts/pixel-compare). Not a product screen — reachable at /gallery.
 *
 *   /gallery                          everything, with RTL and motion toggles
 *   /gallery?screen=feed              one lab screen, bare, top-left (for screenshots)
 *   /gallery?rtl=0&motion=off         initial toggle state
 */

function Section({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  const rise = useRiseIn(index);
  return (
    <Animated.View style={[rise, { gap: theme.spacing.md, marginBottom: theme.spacing.xl }]}>
      <Text style={{ ...theme.typeRole.h3, color: theme.colors.textPrimary }}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, alignItems: "center" }}>{children}</View>;
}

function Label({ children }: { children: string }) {
  return <Text style={{ ...theme.typeRole.meta, color: theme.colors.ink400 }}>{children}</Text>;
}

/** A 390-wide positioned box so absolute sheets/toasts anchor like on a phone. */
function Frame({ height, children, white }: { height: number; children: ReactNode; white?: boolean }) {
  return (
    <View
      style={{
        width: 390,
        maxWidth: "100%",
        height,
        overflow: "hidden",
        position: "relative",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 16,
        backgroundColor: white ? "#FFFFFF" : theme.colors.background,
      }}
    >
      {children}
    </View>
  );
}

function Toggles({ rtl, setRtl, motionOff, setMotionOff }: { rtl: boolean; setRtl: (v: boolean) => void; motionOff: boolean; setMotionOff: (v: boolean) => void }) {
  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? theme.colors.primary : theme.colors.blue100 }}
    >
      <Text style={{ ...theme.typeRole.label, color: on ? "#FFFFFF" : theme.colors.primary }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row>
      {Platform.OS === "web" ? <Chip on={rtl} label={rtl ? "RTL ✓" : "LTR"} onPress={() => setRtl(!rtl)} /> : null}
      <Chip on={motionOff} label={motionOff ? "Motion off ✓" : "Motion on"} onPress={() => setMotionOff(!motionOff)} />
    </Row>
  );
}

const ICON_SAMPLE = ICON_NAMES;

const GROUPS = [
  { id: "g1", name: "שכונת רמות", color: "#2E3A8C", icon: "home" as const, members: 1204 },
  { id: "g2", name: "גמ״ח ספרים", color: "#5B8C5A", icon: "users" as const, members: 86 },
  { id: "g3", name: "בית הכנסת המרכזי", color: "#A85751", icon: "home" as const, members: 412 },
];
const FAMILY = [
  { id: "f1", name: "משפחת מזרחי", members: 9 },
  { id: "f2", name: "משפחת כהן", members: 14 },
];

export default function Gallery() {
  const params = useLocalSearchParams<{ screen?: string; rtl?: string; motion?: string }>();
  const [rtl, setRtl] = useState(params.rtl !== "0");
  const [motionOff, setMotionOff] = useState(params.motion === "off");
  const [text, setText] = useState("");
  const [toggleOn, setToggleOn] = useState(true);
  const [checked, setChecked] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [audience, setAudience] = useState<ContentAudience[]>([{ kind: "public" }]);
  const [report, setReport] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>("שרה גולדברג");
  const [followedOnly, setFollowedOnly] = useState(false);
  const noop = () => {};

  // Web: direction is a document attribute; native needs a reload (I18nManager), so no toggle there.
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", rtl ? "rtl" : "ltr");
    }
  }, [rtl]);

  const direction = rtl ? "rtl" : "ltr";

  // Bare single-screen mode for pixel comparison.
  if (params.screen && SCENES[params.screen]) {
    const Scene = SCENES[params.screen]!;
    return (
      <DirectionProvider value={direction}>
        <MotionPreferenceProvider value={motionOff ? "reduce" : "system"}>
          <DirView dir={direction} style={{ width: 390, backgroundColor: "#FFFFFF" }}>
            <Scene />
          </DirView>
        </MotionPreferenceProvider>
      </DirectionProvider>
    );
  }

  const summary = exposureSummary(audience, { groups: GROUPS, familySpaces: FAMILY });

  return (
    <DirectionProvider value={direction}>
      <MotionPreferenceProvider value={motionOff ? "reduce" : "system"}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.backgroundMuted }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <DirView dir={direction}>
          <Text style={{ ...theme.typeRole.h1, color: theme.colors.primary, marginBottom: theme.spacing.lg }}>
            Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place — גלריית רכיבים
          </Text>
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Toggles rtl={rtl} setRtl={setRtl} motionOff={motionOff} setMotionOff={setMotionOff} />
          </View>

          <Section index={0} title="כפתורים">
            <Row>
              <Button onPress={noop}>ראשי</Button>
              <Button variant="cta" halo onPress={noop}>
                יצירת חשבון
              </Button>
              <Button variant="secondary" onPress={noop}>
                משני
              </Button>
              <Button variant="ghost" onPress={noop}>
                שקוף
              </Button>
              <Button variant="danger" onPress={noop}>
                מחיקה
              </Button>
              <Button disabled onPress={noop}>
                מושבת
              </Button>
            </Row>
            <Row>
              <ActionButton label="יצירת פוסט" onPress={noop} />
              <ActionButton label="נסה שוב" variant="secondary" onPress={noop} />
              <MiniButton label="אישור" onPress={noop} />
              <MiniButton label="חזרה" variant="secondary" onPress={noop} />
              <MiniButton label="ערער" variant="ghost" onPress={noop} />
            </Row>
          </Section>

          <Section index={1} title="שדות, מתגים ובחירות">
            <TextField value={text} onChangeText={setText} label="שם מלא" />
            <TextField value="a" onChangeText={noop} label="אימייל" errorText="כתובת לא תקינה" />
            <Row>
              <Toggle value={toggleOn} onValueChange={setToggleOn} />
              <Toggle value={false} onValueChange={noop} />
              <Toggle sheet value={false} onValueChange={noop} />
              <Toggle sheet value onValueChange={noop} />
              <Toggle value disabled />
            </Row>
            <GenderChoice value={gender} onChange={setGender} />
            <Checkbox
              checked={checked}
              onChange={setChecked}
              label={<Text style={{ ...theme.typeRole.body, color: theme.colors.textPrimary }}>קראתי ואני מסכים לתנאי השימוש</Text>}
            />
          </Section>

          <Section index={2} title="אייקונים">
            <Row>
              {ICON_SAMPLE.map((n) => (
                <Icon key={n} name={n} size={24} color={theme.colors.ink700} />
              ))}
            </Row>
          </Section>

          <Section index={3} title="אווטרים ותוויות מקור">
            <Row>
              <Avatar name="שרה לוי" size={56} />
              <Avatar name="שרה לוי" size={56} ring />
              <Avatar name="דוד" size={42} />
              <Avatar name="דוד" size={26} />
            </Row>
            <Row>
              <SourceLabel kind="group" name="שכונת רמות" color={GROUP.ramot.color} icon="home" />
              <SourceLabel kind="group" name="גמ״ח ספרים" color={GROUP.sfarim.color} icon="users" />
              <SourceLabel kind="family_space" name="משפחת מזרחי" />
              <SourceLabel kind="public" />
              <SourceLabel kind="followers" />
              <SourceLabel kind="suggested" />
            </Row>
          </Section>

          <Section index={4} title="שורת אינטראקציה (מספר בלבד, לא רשימה)">
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, overflow: "hidden" }}>
              <InteractionBar likes={42} comments={8} liked saved />
              <InteractionBar likes={0} comments={0} />
              <InteractionBar variant="post" likes={42} comments={8} liked />
            </View>
          </Section>

          <Section index={5} title="הודעות מערכת ומצבי פוסט">
            <SystemNotice tone="info" title="זוהו נשים במדיה שהעלית" message="עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי." confirmLabel="אישור" cancelLabel="חזרה" />
            <View style={{ borderRadius: 18, overflow: "hidden" }}>
              <StateStrip kind="processing" />
              <StateStrip kind="review" />
              <UploaderNotice mode="afterPublish" />
            </View>
            <UploaderNotice mode="beforePublish" style={{ marginHorizontal: 0 }} />
            <View style={{ borderRadius: 18, overflow: "hidden" }}>
              <FilteredMedia />
            </View>
            <View style={{ borderRadius: 12, overflow: "hidden" }}>
              <FilteredMedia height={120} hint={null} />
            </View>
          </Section>

          <Section index={6} title="כרטיסי פוסט">
            <LabCard post={POSTS[0]!} />
            <LabCard post={POSTS[2]!} />
            <LabCard post={POSTS[4]!} />
            <PostCard
              post={{ author: { name: "אבי מזרחי" }, time: "לפני 20 דק׳", source: SRC.ramot, body: "מילים כל כך נכונות, שווה לקרוא 👇", likes: 4, comments: 0 }}
              quote={<QuoteCard state="available" author={{ name: "הרב אליהו כהן" }} time="אתמול" body="מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב." />}
            />
            <PostCard post={{ author: { name: "אבי מזרחי" }, time: "לפני 20 דק׳", source: SRC.ramot, body: "שווה לקרוא 👇", likes: 4, comments: 0 }} quote={<QuoteCard state="unavailable" />} />
            <PostCard
              post={{ author: { name: "אבי מזרחי" }, time: "לפני שעה", source: SRC.public, body: "שמחת בר המצווה של יוסי 🎉", likes: 3, comments: 1 }}
              mediaSlot={<SceneArt k="table" />}
              mediaHeight={150}
              stateStrip={<UploaderNotice mode="afterPublish" />}
            />
          </Section>

          <Section index={7} title="סרגלים: סטטוסים, מרחבים, פס מכווץ, הצעות מעקב, ניווט">
            <Frame height={290}>
              <TopZones />
            </Frame>
            <Row>
              <SpaceCard kind="group" {...GROUP.ramot} filtered lastAuthor="משה רוזנברג" time="לפני שעתיים" />
              <StatusesRail emptyHint={null} />
            </Row>
            <View style={{ width: 390, maxWidth: "100%" }}>
              <CollapsedStrip avatars={[{ name: "+" }, { name: "ש" }, { name: "מ" }]} />
              <CollapsedStrip expanded />
            </View>
            <Frame height={250}>
              <FollowRail
                style={{ position: "absolute", start: 0, end: 0, bottom: 0 }}
                items={[
                  { userId: "1", name: "ישראל אברהמי", bio: "שיעורים יומיים בדף היומי", followers: 2431 },
                  { userId: "2", name: "לוח קהילתי רמות", bio: "מודעות ועדכונים מהשכונה", followers: 890 },
                  { userId: "3", name: "נתן שפירא", followers: 312 },
                ]}
              />
            </Frame>
            <View style={{ width: 390, maxWidth: "100%" }}>
              <BottomTabs active="home" />
              <BottomTabs active="search" />
              <BottomTabs active="profile" />
            </View>
          </Section>

          <Section index={8} title="התכווצות בגלילה (תנועה חיה)">
            <Row>
              <Button size="sm" onPress={() => setCollapsed((c) => !c)}>
                {collapsed ? "הרחב" : "כווץ"}
              </Button>
              <Label>{motionOff ? "תנועה כבויה: שקיפות בלבד" : "גובה 260ms + שקיפות; פס נכנס מ־8px- ב־200ms"}</Label>
            </Row>
            <Frame height={420}>
              <CollapsibleZones collapsed={collapsed} strip={<CollapsedStrip onPress={() => setCollapsed(false)} />}>
                <AppBar />
                <TopZones />
              </CollapsibleZones>
              <View style={{ padding: 14 }}>
                <LabCard post={POSTS[1]!} />
              </View>
            </Frame>
          </Section>

          <Section index={9} title="גיליונות תחתונים ושורות">
            <Frame height={420}>
              <BottomSheet title="כותרת" subtitle="תת־כותרת קצרה" testID="gallery-sheet-rows">
                <SheetRow icon="bookmark" label="שורה רגילה" />
                <SheetRow icon="link" label="עם רמז" hint="רמז קטן" />
                <SheetRow icon="comment" label="מושבתת" hint="בקרוב" disabled />
                <SheetRow control={{ type: "checkbox", checked: true }} icon="users" label="נבחרה" selected />
                <SheetRow control={{ type: "radio", checked: true }} label="רדיו" dense />
              </BottomSheet>
            </Frame>
            <Frame height={260}>
              <PlusMenuSheet />
            </Frame>
            <Frame height={400}>
              <PostMenuSheet variant="suggested" authorName="יעקב פרידמן" />
            </Frame>
            <Frame height={300}>
              <PostMenuSheet variant="standard" authorName="יעקב פרידמן" />
            </Frame>
            <Frame height={240}>
              <OwnPostMenuSheet />
            </Frame>
            <Frame height={400}>
              <ShareSheet canShareToGroup groupName="שכונת רמות" canCopyLink={false} />
            </Frame>
            <Frame height={400}>
              <ShareSheet canShareToGroup canCopyLink groupName="שכונת רמות" />
            </Frame>
            <Frame height={300}>
              <WhySheet authorName="יעקב פרידמן" followedOnly={followedOnly} onFollowedOnlyChange={setFollowedOnly} />
            </Frame>
            <Frame height={240}>
              <CommentMenuSheet own={false} authorName="יוסי ברק" />
            </Frame>
            <Frame height={240}>
              <CommentMenuSheet own authorName="יוסי ברק" />
            </Frame>
          </Section>

          <Section index={10} title="דיווח והודעת אישור">
            <Frame height={560}>
              <ReportSheet value={report} onChange={setReport} />
            </Frame>
            <Frame height={160}>
              <Toast message={feedbackCopy.reportSent} bottom={24} />
            </Frame>
          </Section>

          <Section index={11} title="בחירת קהל (רב־בחירה, הכלל מ־visibility-policy)">
            <ExposureChip label={summary.label} icon={summary.icon} onPress={noop} />
            <ExposureChip locked label="שכונת רמות" icon="users" help="פוסט שנכתב בקבוצה נשאר בקבוצה." />
            <Label>{isSelectionValid(audience) ? "בחירה תקינה" : "בחירה לא תקינה — הפרסום מושבת"}</Label>
            <Frame height={470}>
              <ExposurePicker value={audience} onChange={setAudience} authorId="me" groups={GROUPS} familySpaces={FAMILY} />
            </Frame>
          </Section>

          <Section index={12} title="תגובות">
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, gap: 14 }}>
              <CommentBubble author={{ name: "שרה גולדברג" }} time="לפני שעה" body="איזה יופי! תודה על הארגון המושלם 👏" likes={6} liked onReply={() => setReplyTo("שרה גולדברג")} />
              <CommentBubble level={2} author={{ name: "משה רוזנברג" }} time="לפני 40 דק׳" mention="שרה גולדברג" body="תודה רבה, בזכותכם!" />
              <CommentBubble author={{ name: "יוסי ברק" }} time="לפני 30 דק׳" body="הנה תמונה מהחלוקה בבוקר:" mediaFiltered likes={2} />
              <CommentBubble author={{ name: "יוסי ברק" }} time="לפני 30 דק׳" body="מתי החלוקה הבאה?" highlighted />
            </View>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
              <CommentBox me={{ name: "אבי מזרחי" }} value={comment} onChangeText={setComment} replyingTo={replyTo} onCancelReply={() => setReplyTo(undefined)} />
              <CommentBox me={{ name: "אבי מזרחי" }} value="" onChangeText={noop} />
            </View>
          </Section>

          <Section index={13} title="מצבי ריק, שגיאה, טעינה">
            <Frame height={400}>
              <EmptyState variant="empty" />
            </Frame>
            <Frame height={420}>
              <EmptyState variant="error" />
            </Frame>
            <Frame height={420}>
              <EmptyState variant="comingSoon" />
            </Frame>
            <Row>
              <Skeleton width={120} height={14} />
              <Skeleton width={42} height={42} radius={21} />
            </Row>
            <SkeletonPostCard media />
          </Section>

          <Section index={14} title={`מסכי המעבדה (${SCENE_NAMES.length}) — 390×844`}>
            <Label>לצילום בודד: /gallery?screen=שם</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {SCENE_NAMES.map((n) => {
                const Scene = SCENES[n]!;
                return (
                  <View key={n} style={{ gap: 6 }}>
                    <Label>{n}</Label>
                    <Scene />
                  </View>
                );
              })}
            </ScrollView>
          </Section>
          </DirView>
        </ScrollView>
      </SafeAreaView>
      </MotionPreferenceProvider>
    </DirectionProvider>
  );
}
