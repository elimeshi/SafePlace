import type { ComponentType } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useDirection } from "./direction";

type WithDir = TextInputProps & { dir?: "ltr" | "rtl" | "auto" };

// react-native-web reads `dir` (default "auto" = from the content, which for an empty
// field means LTR); RN's types omit it and native ignores it.
const DirTextInput = TextInput as unknown as ComponentType<WithDir>;

/**
 * TextInput that follows the reading direction while empty (so the placeholder sits
 * on the right in Hebrew) and the content's own direction once something is typed
 * (so English text is still LTR). RTL-first, ADR 0007.
 */
export function FlowTextInput(props: TextInputProps) {
  const direction = useDirection();
  const filled = typeof props.value === "string" ? props.value.length > 0 : false;
  return <DirTextInput {...props} dir={filled ? "auto" : direction} />;
}
