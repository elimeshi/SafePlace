import { useState, type ReactNode } from "react";
import { Image, View } from "react-native";
import {
  ComposeActionBar,
  ComposeIdentity,
  ComposeMediaPreview,
  ComposeTextField,
  ComposeTopBar,
  ExposureChip,
  ExposurePicker,
  LocationChip,
  MiniButton,
  StateStrip,
  TextField,
  Toast,
  UploaderNotice,
  composeCopy,
  exposureCopy,
  exposureSummary,
  type SpaceOption,
} from "@safeplace/ui";
import type { ContentAudience } from "@safeplace/visibility-policy";
import { screenCopy } from "./copy";
import { deriveView, type ComposeState } from "./composeState";
import type { ComposeContext } from "./data";

export interface ComposeHandlers {
  onClose: () => void;
  onPublish: () => void;
  onText: (t: string) => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onAudiences: (a: ContentAudience[]) => void;
  onPickMedia: () => void;
  onRemoveMedia: () => void;
  onLocationOpen: () => void;
  onLocationSet: (name: string) => void;
  onLocationClear: () => void;
  onNoticeConfirm: () => void;
  onNoticeBack: () => void;
  onNoticeAppeal: () => void;
  onDismissToast: () => void;
}

export interface ComposeViewProps {
  ctx: Pick<
    ComposeContext,
    "userId" | "name" | "entry" | "locked" | "groups" | "familySpaces"
  >;
  state: ComposeState;
  handlers: ComposeHandlers;
  /** Lab fixtures only: draw something other than the picked file. */
  renderPreview?: () => ReactNode;
  pickerInitialStep?: "root" | "groups" | "family";
}

/** Presentational compose screen: lab `compose` / `exposure` / `composeGroup` / `notice`. No data access here. */
export function ComposeView({
  ctx,
  state,
  handlers: h,
  renderPreview,
  pickerInitialStep,
}: ComposeViewProps) {
  const view = deriveView(state);
  const [placeName, setPlaceName] = useState("");
  const locked = ctx.locked;
  const summary = exposureSummary(state.audiences, {
    groups: ctx.groups,
    familySpaces: ctx.familySpaces,
  });
  const isFamily = ctx.entry.kind === "family_space";
  const placeholder = isFamily
    ? screenCopy.familyPlaceholder
    : locked
      ? composeCopy.groupPlaceholder
      : composeCopy.placeholder;
  const toast =
    state.error === "upload"
      ? screenCopy.uploadError
      : state.error === "publish"
        ? screenCopy.publishError
        : state.error === "action"
          ? screenCopy.actionError
          : state.appealSent
            ? screenCopy.appealSent
            : null;

  return (
    <>
      <View
        style={{ flex: 1, flexDirection: "column", backgroundColor: "#FFFFFF" }}
        testID="compose-screen"
      >
        <ComposeTopBar
          title={
            locked && !isFamily ? composeCopy.groupPost : composeCopy.newPost
          }
          canPublish={view.canPublish}
          onClose={h.onClose}
          onPublish={h.onPublish}
        />
        <ComposeIdentity name={ctx.name}>
          {locked ? (
            <ExposureChip
              locked
              label={locked.name}
              icon={locked.icon}
              help={
                isFamily ? screenCopy.familyLockedHelp : exposureCopy.lockedHelp
              }
            />
          ) : (
            <ExposureChip
              label={summary.label}
              icon={summary.icon}
              onPress={h.onOpenPicker}
            />
          )}
        </ComposeIdentity>
        <ComposeTextField
          value={state.text}
          onChangeText={h.onText}
          placeholder={placeholder}
        />
        {state.media ? (
          <ComposeMediaPreview
            height={view.showNotice ? 150 : undefined}
            checking={view.checking}
            onRemove={h.onRemoveMedia}
          >
            {renderPreview ? (
              renderPreview()
            ) : (
              <Image
                source={{ uri: state.media.localUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            )}
          </ComposeMediaPreview>
        ) : null}
        {view.showNotice ? (
          <UploaderNotice
            mode="beforePublish"
            onConfirm={h.onNoticeConfirm}
            onBack={h.onNoticeBack}
            onAppeal={h.onNoticeAppeal}
          />
        ) : null}
        {view.showReview ? <StateStrip kind="review" /> : null}
        {state.locationTag ? (
          <LocationChip name={state.locationTag} onRemove={h.onLocationClear} />
        ) : null}
        {state.locationEditing ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginHorizontal: 18,
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <TextField
                value={placeName}
                onChangeText={setPlaceName}
                label={screenCopy.locationLabel}
                placeholder={screenCopy.locationPlaceholder}
              />
            </View>
            <MiniButton
              label={screenCopy.locationAdd}
              onPress={() => {
                h.onLocationSet(placeName);
                setPlaceName("");
              }}
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <ComposeActionBar
          onMedia={h.onPickMedia}
          onLocation={h.onLocationOpen}
        />
      </View>
      {/* Siblings of the content so the scrim covers the whole screen, status area included (lab). */}
      {state.pickerOpen && !locked ? (
        <ExposurePicker
          value={state.audiences}
          onChange={h.onAudiences}
          authorId={ctx.userId}
          groups={ctx.groups as SpaceOption[]}
          familySpaces={ctx.familySpaces as SpaceOption[]}
          onConfirm={h.onClosePicker}
          onDismiss={h.onClosePicker}
          initialStep={pickerInitialStep}
        />
      ) : null}
      {toast ? (
        <Toast
          message={toast}
          icon={state.error ? "info" : "check"}
          bottom={72}
          durationMs={4000}
          onHide={h.onDismissToast}
        />
      ) : null}
    </>
  );
}
