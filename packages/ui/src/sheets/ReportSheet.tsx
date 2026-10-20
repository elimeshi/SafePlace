import { TextInput } from "react-native";
import { ActionButton } from "../primitives/ActionButton";
import { theme } from "../theme";
import { assistant, lh } from "../foundation/style";
import { BottomSheet } from "./BottomSheet";
import { SheetRow } from "./SheetRow";
import { sheetCopy } from "./copy";

export interface ReportSheetProps {
  /** Selected category index (0-based, in `categories` order); null = none yet. */
  value: number | null;
  onChange?: (index: number) => void;
  details?: string;
  onDetailsChange?: (text: string) => void;
  onSubmit?: () => void;
  onDismiss?: () => void;
  /** Verbatim 07-moderation §3.2 defaults; the order is the category's wire index. */
  title?: string;
  subtitle?: string;
  categories?: readonly string[];
  detailsPlaceholder?: string;
  submitLabel?: string;
}

/**
 * Report sheet (07-moderation §3.2–3.3): a reason from the six categories,
 * optional free text, send. Always goes to a human; never removes anything.
 */
export function ReportSheet({
  value,
  onChange,
  details,
  onDetailsChange,
  onSubmit,
  onDismiss,
  title = sheetCopy.report.title,
  subtitle = sheetCopy.report.subtitle,
  categories = sheetCopy.report.categories,
  detailsPlaceholder = sheetCopy.report.details,
  submitLabel = sheetCopy.report.submit,
}: ReportSheetProps) {
  return (
    <BottomSheet title={title} subtitle={subtitle} onDismiss={onDismiss} testID="report-sheet">
      {categories.map((c, i) => (
        <SheetRow key={c} dense label={c} control={{ type: "radio", checked: value === i }} onPress={() => onChange?.(i)} />
      ))}
      <TextInput
        multiline
        value={details}
        onChangeText={onDetailsChange}
        placeholder={detailsPlaceholder}
        placeholderTextColor={theme.colors.ink400}
        style={{
          ...assistant(15),
          lineHeight: lh(15, 1.5),
          color: theme.colors.ink900,
          marginTop: 6,
          marginHorizontal: 20,
          marginBottom: 12,
          minHeight: 70,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingVertical: 12,
          paddingHorizontal: 14,
          textAlignVertical: "top",
        }}
        testID="report-details"
      />
      <ActionButton label={submitLabel} onPress={onSubmit} disabled={value == null} style={{ marginTop: 4, marginHorizontal: 20 }} testID="report-submit" />
    </BottomSheet>
  );
}
