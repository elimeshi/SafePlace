import { BottomSheet, SheetDivider, SheetGroupLabel } from "./BottomSheet";
import { SheetRow } from "./SheetRow";
import { sheetCopy } from "./copy";

export interface CommentMenuSheetProps {
  /** Your own comment: edit / delete are deferred (backlog §G), greyed "בקרוב". */
  own: boolean;
  authorName: string;
  onReport?: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
  copy?: Partial<typeof sheetCopy.commentMenu>;
}

/**
 * Comment menus (03 §3.3). Someone else's: report, mute the commenter (silent,
 * not a block — hides their posts and comments from you). Yours: greyed edit /
 * delete. The lab draws both groups in one catalog sheet; a real sheet shows one.
 */
export function CommentMenuSheet({ own, authorName, onReport, onMute, onDismiss, copy }: CommentMenuSheetProps) {
  const c = { ...sheetCopy.commentMenu, ...copy };
  return (
    <BottomSheet onDismiss={onDismiss} testID="comment-menu">
      {own ? (
        <>
          <SheetGroupLabel>{c.yours}</SheetGroupLabel>
          <SheetRow icon="comment" label={c.edit} hint={c.soon} disabled />
          <SheetRow icon="trash" label={c.delete} hint={c.soon} disabled />
        </>
      ) : (
        <>
          <SheetGroupLabel>{c.theirs(authorName)}</SheetGroupLabel>
          <SheetRow icon="flag" label={c.report} onPress={onReport} />
          <SheetRow icon="mute" label={c.mute(authorName)} hint={c.muteHint} onPress={onMute} />
        </>
      )}
    </BottomSheet>
  );
}

/** The lab's combined catalog (someone else's group, divider, your group). Gallery / reference only. */
export function CommentMenuCatalogSheet({ authorName }: { authorName: string }) {
  const c = sheetCopy.commentMenu;
  return (
    <BottomSheet testID="comment-menu-catalog">
      <SheetGroupLabel>{c.theirs(authorName)}</SheetGroupLabel>
      <SheetRow icon="flag" label={c.report} />
      <SheetRow icon="mute" label={c.mute(authorName)} hint={c.muteHint} />
      <SheetDivider />
      <SheetGroupLabel>{c.yours}</SheetGroupLabel>
      <SheetRow icon="comment" label={c.edit} hint={c.soon} disabled />
      <SheetRow icon="trash" label={c.delete} hint={c.soon} disabled />
    </BottomSheet>
  );
}
