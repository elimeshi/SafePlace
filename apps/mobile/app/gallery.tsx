import { type ReactNode, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import {
  Avatar,
  Button,
  Checkbox,
  GenderChoice,
  Icon,
  type IconName,
  InteractionBar,
  PostCard,
  SourceLabel,
  SystemNotice,
  TextField,
  Toggle,
  useRiseIn,
} from "@safeplace/ui";
import { theme } from "@/lib/theme";

/**
 * Throwaway component gallery (Phase 0, Task 10). Renders every @safeplace/ui
 * primitive in its key states so RTL layout and the fade-and-rise / press /
 * halo motion can be eyeballed on a device. Not a product screen — reachable
 * at the /gallery route. Each Section uses the staggered entrance hook.
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
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, alignItems: "center" }}>
      {children}
    </View>
  );
}

const ICON_SAMPLE: IconName[] = [
  "home",
  "search",
  "bell",
  "heart",
  "comment",
  "share",
  "bookmark",
  "eye",
  "lock",
  "shield-check",
  "settings",
  "user",
];

export default function Gallery() {
  const [text, setText] = useState("");
  const [toggleOn, setToggleOn] = useState(true);
  const [checked, setChecked] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const noop = () => {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.backgroundMuted }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Text style={{ ...theme.typeRole.h1, color: theme.colors.primary, marginBottom: theme.spacing.lg }}>
          Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place — גלריית רכיבים
        </Text>

        <Section index={0} title="כפתורים">
          <Row>
            <Button onPress={noop}>ראשי</Button>
            <Button variant="cta" halo onPress={noop}>
              יצירת חשבון
            </Button>
            <Button variant="secondary" onPress={noop}>
              משני
            </Button>
          </Row>
          <Row>
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
            <Button size="sm" onPress={noop}>
              קטן
            </Button>
            <Button size="md" onPress={noop}>
              בינוני
            </Button>
            <Button size="lg" onPress={noop}>
              גדול
            </Button>
          </Row>
        </Section>

        <Section index={1} title="שדות טקסט">
          <TextField value={text} onChangeText={setText} label="שם מלא" />
          <TextField value="ישראל ישראלי" onChangeText={noop} label="שם מלא" valid />
          <TextField value="a" onChangeText={noop} label="אימייל" errorText="כתובת לא תקינה" />
        </Section>

        <Section index={2} title="מתגים">
          <Row>
            <Toggle value={toggleOn} onValueChange={setToggleOn} />
            <Toggle value={false} onValueChange={noop} />
            <Toggle value readOnly />
            <Toggle value disabled />
          </Row>
        </Section>

        <Section index={3} title="בחירת מגדר">
          <GenderChoice value={gender} onChange={setGender} />
        </Section>

        <Section index={4} title="תיבת סימון">
          <Checkbox
            checked={checked}
            onChange={setChecked}
            label={
              <Text style={{ ...theme.typeRole.body, color: theme.colors.textPrimary }}>
                קראתי ואני מסכים לתנאי השימוש
              </Text>
            }
          />
        </Section>

        <Section index={5} title="אייקונים">
          <Row>
            {ICON_SAMPLE.map((n) => (
              <Icon key={n} name={n} size={24} color={theme.colors.ink700} />
            ))}
          </Row>
        </Section>

        <Section index={6} title="אווטרים">
          <Row>
            <Avatar name="שרה לוי" size={56} />
            <Avatar name="שרה לוי" size={56} ring ringColor={theme.colors.accent} />
            <Avatar name="דוד" size={44} />
          </Row>
        </Section>

        <Section index={7} title="תוויות מקור">
          <Row>
            <SourceLabel kind="group" name="שכונת רמות" color={theme.colors.blue600} icon="home" />
            <SourceLabel kind="public" />
            <SourceLabel kind="suggested" />
          </Row>
        </Section>

        <Section index={8} title="שורת אינטראקציה">
          <InteractionBar likes={42} comments={8} liked saved={false} />
        </Section>

        <Section index={9} title="הודעות מערכת">
          <SystemNotice
            tone="info"
            title="זוהו נשים במדיה שהעלית"
            message="עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי."
            confirmLabel="אישור"
            cancelLabel="חזרה"
          />
          <SystemNotice tone="warning" title="אזור מסוכן" message="שינוי זה דורש אישור כפול." />
          <SystemNotice
            tone="danger"
            title="מחיקת חשבון"
            message="פעולה זו בלתי הפיכה."
            confirmLabel="מחק"
            cancelLabel="ביטול"
          />
        </Section>

        <Section index={10} title="כרטיסי פוסט">
          <PostCard
            post={{
              author: { name: "משפחת רוזנברג" },
              time: "לפני שעתיים",
              source: { kind: "group", name: "שכונת רמות", color: theme.colors.blue600, icon: "home" },
              body: "תודה ענקית לכל המתנדבים שהגיעו אתמול לחלוקת החבילות לקראת החג 💙",
              likes: 42,
              comments: 8,
              liked: true,
            }}
          />
          <View style={{ height: theme.spacing.md }} />
          <PostCard
            filtered
            post={{
              author: { name: "גמ״ח הסעות" },
              time: "לפני 6 שעות",
              source: { kind: "suggested" },
              body: "נפתחה קבוצה חדשה לתיאום נסיעות בין הערים.",
              media: "https://example.invalid/placeholder.jpg",
              likes: 15,
              comments: 3,
            }}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
