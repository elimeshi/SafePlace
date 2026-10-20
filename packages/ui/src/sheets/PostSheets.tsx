import { Toggle } from "../forms/Toggle";
import { theme } from "../theme";
import { BottomSheet, SheetDivider, SheetGroupLabel } from "./BottomSheet";
import { SheetRow } from "./SheetRow";
import { sheetCopy } from "./copy";

interface SheetBase {
  onDismiss?: () => void;
}

/** The "+" menu (feed §2.1.1): Post is live; Status is greyed "בקרוב" until its own spec ships. */
export function PlusMenuSheet({
  onDismiss,
  onPost,
  copy = sheetCopy.plusMenu,
}: SheetBase & { onPost?: () => void; copy?: Partial<typeof sheetCopy.plusMenu> }) {
  const c = { ...sheetCopy.plusMenu, ...copy };
  return (
    <BottomSheet title={c.title} onDismiss={onDismiss} testID="plus-menu">
      <SheetRow
        tile={{ icon: "image", background: theme.colors.blue100, color: theme.colors.primary }}
        label={c.post}
        hint={c.postHint}
        trailing="forward-primary"
        onPress={onPost}
        testID="plus-menu-post"
      />
      <SheetRow
        tile={{ icon: "clock", background: theme.colors.background, color: theme.colors.ink400 }}
        label={c.status}
        hint={c.soon}
        disabled
      />
    </BottomSheet>
  );
}

export interface PostMenuSheetProps extends SheetBase {
  /** "suggested" adds the three feedback rows (feed §2.3.6). */
  variant: "suggested" | "standard";
  authorName: string;
  /** From visibility-policy `canCopyExternalLink` — the row is omitted when false. */
  canCopyLink?: boolean;
  onLessLikeThis?: () => void;
  onDontSuggest?: () => void;
  onWhy?: () => void;
  onSave?: () => void;
  onMuteAuthor?: () => void;
  onReport?: () => void;
  onCopyLink?: () => void;
  /** Copy overrides (ADR 0007). */
  copy?: Partial<typeof sheetCopy.postMenu>;
}

/**
 * The "…" menu on someone else's post. Suggested posts: less like this, don't
 * suggest the author, why, then save / report / copy link. Other posts: save,
 * mute author, report, copy link (lab `menu` caption). The standard variant
 * assembles lab strings and is not drawn in the lab.
 */
export function PostMenuSheet({
  variant,
  authorName,
  canCopyLink = true,
  onDismiss,
  onLessLikeThis,
  onDontSuggest,
  onWhy,
  onSave,
  onMuteAuthor,
  onReport,
  onCopyLink,
  copy,
}: PostMenuSheetProps) {
  const c = { ...sheetCopy.postMenu, ...copy };
  return (
    <BottomSheet onDismiss={onDismiss} testID="post-menu">
      {variant === "suggested" ? (
        <>
          <SheetRow icon="thumbs-down" label={c.lessLikeThis} onPress={onLessLikeThis} />
          <SheetRow icon="user-x" label={c.dontSuggest(authorName)} onPress={onDontSuggest} />
          <SheetRow icon="help" label={c.why} onPress={onWhy} />
          <SheetDivider />
        </>
      ) : null}
      <SheetRow icon="bookmark" label={c.save} onPress={onSave} />
      {variant === "standard" ? (
        <SheetRow icon="mute" label={c.mute(authorName)} hint={c.muteHint} onPress={onMuteAuthor} />
      ) : null}
      <SheetRow icon="flag" label={c.report} onPress={onReport} />
      {canCopyLink ? <SheetRow icon="link" label={c.copyLink} onPress={onCopyLink} /> : null}
    </BottomSheet>
  );
}

export interface OwnPostMenuSheetProps extends SheetBase {
  canCopyLink?: boolean;
  onSave?: () => void;
  onCopyLink?: () => void;
  copy?: Partial<typeof sheetCopy.ownPostMenu>;
}

/** Own-post menu (03 §2.1): save and copy link (public only); edit is deferred, greyed "בקרוב". No report/mute on your own post. */
export function OwnPostMenuSheet({ canCopyLink = true, onDismiss, onSave, onCopyLink, copy }: OwnPostMenuSheetProps) {
  const c = { ...sheetCopy.ownPostMenu, ...copy };
  return (
    <BottomSheet onDismiss={onDismiss} testID="own-post-menu">
      <SheetRow icon="bookmark" label={c.save} onPress={onSave} />
      {canCopyLink ? <SheetRow icon="link" label={c.copyLink} onPress={onCopyLink} /> : null}
      <SheetRow icon="comment" label={c.edit} hint={c.soon} disabled />
    </BottomSheet>
  );
}

export interface WhySheetProps extends SheetBase {
  authorName: string;
  /** `showSuggestedPosts` is on → the "followed only" switch is off. */
  followedOnly: boolean;
  onFollowedOnlyChange?: (v: boolean) => void;
  copy?: Partial<typeof sheetCopy.why>;
}

/** "Why am I seeing this?" (03 §3.4) with the suggestions off-switch (plan §2). */
export function WhySheet({ authorName, followedOnly, onFollowedOnlyChange, onDismiss, copy }: WhySheetProps) {
  const c = { ...sheetCopy.why, ...copy };
  return (
    <BottomSheet title={c.title} subtitle={c.suggested(authorName)} onDismiss={onDismiss} testID="why-sheet">
      <SheetDivider />
      <SheetRow
        label={c.followedOnly}
        hint={c.followedOnlyHint}
        trailing={<Toggle sheet value={followedOnly} onValueChange={onFollowedOnlyChange} />}
      />
    </BottomSheet>
  );
}

export interface ShareSheetProps extends SheetBase {
  /** From visibility-policy `canSharePostInternally` for the target group. */
  canShareToGroup: boolean;
  /** Where it would go, e.g. the group name for the hint. */
  groupName?: string;
  /** From visibility-policy `canCopyExternalLink`. */
  canCopyLink: boolean;
  onShareToGroup?: () => void;
  onCopyLink?: () => void;
  copy?: Partial<typeof sheetCopy.share>;
}

/** Share sheet (03 §5): share-to-group quote post; copy link (public only). Status / message rows are greyed until those ship. */
export function ShareSheet({ canShareToGroup, groupName, canCopyLink, onShareToGroup, onCopyLink, onDismiss, copy }: ShareSheetProps) {
  const c = { ...sheetCopy.share, ...copy };
  return (
    <BottomSheet title={c.title} onDismiss={onDismiss} testID="share-sheet">
      <SheetGroupLabel>{c.inApp}</SheetGroupLabel>
      <SheetRow
        icon="users"
        label={c.toGroup}
        hint={groupName ? c.toGroupHint(groupName) : undefined}
        disabled={!canShareToGroup}
        onPress={onShareToGroup}
      />
      <SheetRow icon="plus" label={c.toStatus} hint={c.soon} disabled />
      <SheetRow icon="send" label={c.toMessage} hint={c.soon} disabled />
      <SheetDivider />
      <SheetGroupLabel>{c.outside}</SheetGroupLabel>
      <SheetRow
        icon="link"
        label={c.copyLink}
        hint={canCopyLink ? undefined : c.copyLinkPublicOnly}
        disabled={!canCopyLink}
        onPress={onCopyLink}
      />
    </BottomSheet>
  );
}
