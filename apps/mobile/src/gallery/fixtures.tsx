import type { ComponentType, ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  PostCard,
  type PostCardData,
  SpaceCard,
  SpacesRail,
  StateStrip,
  StatusesRail,
  assistant,
  rubik,
} from "@safeplace/ui";
import { theme } from "@/lib/theme";

/**
 * Gallery fixtures: the lab's abstract photo stand-ins (never stock photos,
 * master spec §6.3.5), its fake status bar / app bar / phone frame, and the
 * sample data the lab screens use. Gallery-only — not part of the app.
 */

const SCENES = {
  street: ["#BFD3EA", "#8FA9CC", "#6E85AC", "#E9D9B8"],
  hills: ["#CFE6EE", "#9CC6B5", "#6FA48F", "#F5E7C8"],
  books: ["#E6E0F2", "#B8AED6", "#7C6A9C", "#F3EBDD"],
  table: ["#F1E4D3", "#D9B996", "#B08968", "#FFF6E8"],
} as const;
export type SceneKey = keyof typeof SCENES;

/**
 * react-native-web resolves `start`/`end` through its locale context, which only a
 * `dir` prop sets (the DOM `dir` attribute is not enough). RN 0.81's View type omits
 * `dir`, so this is View with it added; native ignores it.
 */
export const DirView = View as unknown as ComponentType<ViewProps & { dir?: "ltr" | "rtl" }>;

export function SceneArt({ k }: { k: SceneKey }) {
  const s = SCENES[k];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 230" preserveAspectRatio="xMidYMid slice">
      <Rect width={390} height={230} fill={s[0]} />
      <Circle cx={300} cy={60} r={26} fill={s[3]} opacity={0.9} />
      <Path d="M0 170 Q90 110 180 150 T390 130 V230 H0Z" fill={s[1]} />
      <Path d="M0 200 Q120 150 240 185 T390 175 V230 H0Z" fill={s[2]} />
    </Svg>
  );
}

/** Lab `.statusbar` (always LTR): clock at the left, battery stand-ins at the right. */
export function StatusBarMock({ dark = false }: { dark?: boolean }) {
  const c = dark ? "#FFFFFF" : theme.colors.ink900;
  return (
    <DirView
      dir="ltr"
      style={{
        position: "relative",
        zIndex: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        paddingHorizontal: 26,
        paddingBottom: 6,
      }}
    >
      <Text style={{ ...assistant(13, 600), color: c }}>9:41</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.85 }}>
        <View style={{ width: 16, height: 9, borderRadius: 2, backgroundColor: c, opacity: 0.6 }} />
        <View style={{ width: 22, height: 11, borderWidth: 1.5, borderColor: c, borderRadius: 3, opacity: 0.6 }}>
          <View style={{ position: "absolute", top: 1.5, start: 1.5, bottom: 1.5, width: 11.4, backgroundColor: c, borderRadius: 1 }} />
        </View>
      </View>
    </DirView>
  );
}

export function WordMark() {
  return (
    <Text style={{ ...rubik(25, 700), color: theme.colors.primary, letterSpacing: -0.5, direction: "ltr" }}>
      Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place
    </Text>
  );
}

/** Lab `.appbar`. */
export function AppBar({ title }: { title?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingHorizontal: 18, paddingBottom: 8 }}>
      {title ? <Text style={{ ...rubik(22, 700), color: theme.colors.ink900 }}>{title}</Text> : <WordMark />}
    </View>
  );
}

/** Lab `.phone .screen` in bare mode: 390×844, app ground, RTL. */
export function Phone({ name, children, bare = false }: { name: string; children: ReactNode; bare?: boolean }) {
  return (
    <View
      testID={`lab-${name}`}
      style={{
        width: 390,
        height: 844,
        overflow: "hidden",
        backgroundColor: theme.colors.background,
        flexDirection: "column",
        position: "relative",
        ...(bare ? null : { borderRadius: 36, borderWidth: 1, borderColor: theme.colors.border }),
      }}
    >
      {children}
    </View>
  );
}

/** Lab `.scroll`. */
export function ScrollArea({ children, white = false }: { children: ReactNode; white?: boolean }) {
  return <View style={{ flex: 1, overflow: "hidden", position: "relative", ...(white ? { backgroundColor: "#FFFFFF" } : null) }}>{children}</View>;
}

/** Lab `.feed`. */
export function FeedColumn({ children, paddingTop = 4 }: { children: ReactNode; paddingTop?: number }) {
  return <View style={{ flexDirection: "column", gap: 14, paddingTop, paddingHorizontal: 14, paddingBottom: 18 }}>{children}</View>;
}

export const GROUP = {
  ramot: { name: "שכונת רמות", color: "#2E3A8C", icon: "home" as const },
  sfarim: { name: "גמ״ח ספרים", color: "#5B8C5A", icon: "users" as const },
};

export const SRC = {
  ramot: { kind: "group" as const, ...GROUP.ramot },
  public: { kind: "public" as const },
  followers: { kind: "followers" as const },
  suggested: { kind: "suggested" as const },
};

export interface FixturePost {
  data: PostCardData;
  media?: SceneKey;
  filtered?: boolean;
  processing?: boolean;
}

export const POSTS: FixturePost[] = [
  {
    data: {
      author: { name: "משה רוזנברג" },
      time: "לפני שעתיים",
      source: SRC.ramot,
      body: "תודה ענקית לכל המתנדבים שהגיעו אתמול לחלוקת החבילות לקראת החג. הקהילה שלנו פשוט מדהימה 💙",
      likes: 42,
      comments: 8,
      liked: true,
    },
    media: "street",
  },
  {
    data: {
      author: { name: "הרב אליהו כהן" },
      time: "לפני 4 שעות",
      source: SRC.public,
      body: "מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב. שבת שלום לכולם.",
      likes: 128,
      comments: 23,
    },
  },
  {
    data: {
      author: { name: "יעקב פרידמן" },
      time: "לפני 6 שעות",
      source: SRC.suggested,
      body: "נפתח מסלול הליכה חדש בפארק השכונתי — מומלץ לבוא בשעות הבוקר.",
      media: "filtered",
      likes: 15,
      comments: 3,
    },
    filtered: true,
  },
  {
    data: {
      author: { name: "דוד לוינסון" },
      time: "אתמול",
      source: SRC.followers,
      body: "הספרייה הביתית סוף סוף מסודרת. מי שצריך ספר — מוזמן לבקש.",
      likes: 9,
      comments: 2,
      saved: true,
    },
    media: "books",
  },
  {
    data: {
      author: { name: "אבי מזרחי" },
      time: "עכשיו",
      source: SRC.public,
      body: "בוקר טוב מהטיול המשפחתי 🙏",
      location: "נחל שורק",
      likes: 0,
      comments: 0,
    },
    media: "hills",
    processing: true,
  },
];

/** A lab `card(p)`. */
export function LabCard({ post, extra, mediaHeight }: { post: FixturePost; extra?: ReactNode; mediaHeight?: number }) {
  return (
    <PostCard
      post={post.data}
      filtered={post.filtered}
      mediaSlot={post.media ? <SceneArt k={post.media} /> : undefined}
      mediaHeight={mediaHeight}
      stateStrip={post.processing ? <StateStrip kind="processing" /> : extra}
    />
  );
}

/** Lab `topZones()`: statuses rail + "my spaces". */
export function TopZones() {
  return (
    <>
      <StatusesRail />
      <SpacesRail>
        <SpaceCard
          kind="group"
          {...GROUP.ramot}
          media={<SceneArt k="street" />}
          lastAuthor="משה רוזנברג"
          time="לפני שעתיים"
        />
        <SpaceCard
          kind="family_space"
          name="משפחת מזרחי"
          previewText="מזל טוב לסבתא ליום הולדתה! נתראה בשבת אצלנו 🎂"
          lastAuthor="רחל מזרחי"
          time="לפני 3 שעות"
        />
        <SpaceCard
          kind="group"
          {...GROUP.sfarim}
          previewText="הגיעו ספרי קודש חדשים לגמ״ח — אפשר לשאול מיום ראשון."
          lastAuthor="שמואל ב."
          time="אתמול"
        />
      </SpacesRail>
    </>
  );
}
