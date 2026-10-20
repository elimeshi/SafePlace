import { useRef, useState, type ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { Comment } from "@safeplace/api-client";
import {
  BottomSheet,
  CommentBox,
  CommentBubble,
  CommentMenuCatalogSheet,
  CommentMenuSheet,
  EmptyState,
  Icon,
  MoreCommentsLink,
  OwnPostMenuSheet,
  PostCard,
  PostMenuSheet,
  PostTopBar,
  QuoteCard,
  ReportSheet,
  SheetRow,
  ShareSheet,
  Skeleton,
  SkeletonPostCard,
  StateStrip,
  Toast,
  UploaderNotice,
  contentCopy,
  sheetCopy,
  type PostCardSource,
} from "@safeplace/ui";
import { theme } from "@/lib/theme";
import { postCopy } from "./copy";
import type { PostBackend, PostView, ScreenData } from "./data";
import { formatRelativeTime, mentionFor, ownMediaStrip, presentMedia } from "./model";
import { usePostController, type DevInit } from "./usePostController";

export interface PostScreenProps {
  backend: PostBackend;
  postId: string;
  onBack: () => void;
  onOpenPost: (id: string) => void;
  /** Dev fixtures draw abstract scenes instead of fetching an image. */
  renderMedia?: (uri: string) => ReactNode;
  devInit?: DevInit;
  /** Status-bar inset: padding above the content, while overlays (scrim) still cover the whole screen. */
  topInset?: number;
}

const COMMENT_AVATAR = { 1: 34, 2: 28 } as const;
const GAP = 9;

/** Single post (03 §2–§5): the full post, the interaction bar, two-level comments, a sticky comment box. */
export function PostScreen({ backend, postId, onBack, onOpenPost, renderMedia, devInit, topInset = 0 }: PostScreenProps) {
  const c = usePostController(backend, postId, devInit);
  const scroll = useRef<ScrollView>(null);
  const commentsY = useRef(0);
  const commentsRef = useRef<View>(null);
  const [pixelFix, setPixelFix] = useState(0);

  const top = <PostTopBar onBack={onBack} />;

  if (c.load.status === "loading") {
    return (
      <View style={{ flex: 1, paddingTop: topInset }} accessibilityLabel={postCopy.loadingA11y} testID="post-loading">
        {top}
        <PostSkeleton />
      </View>
    );
  }
  if (c.load.status === "error") {
    return (
      <View style={{ flex: 1, paddingTop: topInset, backgroundColor: theme.colors.background }}>
        {top}
        <EmptyState variant="error" title={postCopy.error.title} message={postCopy.error.message} actionLabel={postCopy.error.action} onAction={c.reload} />
      </View>
    );
  }
  const data: ScreenData = c.load.data;
  const view = data.post;
  if (!view) {
    return (
      <View style={{ flex: 1, paddingTop: topInset, backgroundColor: theme.colors.background }}>
        {top}
        <EmptyState variant="empty" icon="lock" title={postCopy.unavailable.title} message={postCopy.unavailable.message} actionLabel={postCopy.unavailable.action} onAction={onBack} />
      </View>
    );
  }

  const { post } = view;
  const isAuthor = post.authorId === data.viewerId;
  const media = presentMedia(view.media, isAuthor);
  const strip = isAuthor ? ownMediaStrip(view.media, data.viewerGender, c.dismissed) : { kind: "none" as const };
  const hasPublicAudience = post.audiences.some((a) => a.kind === "public");
  const targets = view.shareTargets;

  const cardSource: PostCardSource | undefined = view.source;
  const mediaSlot = media.kind === "image" ? renderMedia?.(media.url ?? "") : media.kind === "filtered" ? <></> : undefined;

  const sheet = c.sheet;
  const commentOf = (id: string): Comment | undefined => c.comments.threads.flatMap((t) => [t.comment, ...t.replies]).find((x) => x.id === id);
  const commentSheet = sheet?.type === "comment" || sheet?.type === "commentCatalog" ? commentOf(sheet.commentId) : undefined;

  const renderComment = (cm: Comment, root: Comment, level: 1 | 2) => {
    const own = cm.authorId === data.viewerId;
    const m = presentMedia(cm.media, own);
    const s = own ? ownMediaStrip(cm.media, data.viewerGender, c.dismissed) : { kind: "none" as const };
    return (
      <View key={cm.id}>
        <CommentBubble
          level={level}
          author={{ name: c.names[cm.authorId] ?? "" }}
          time={formatRelativeTime(cm.createdAt)}
          body={cm.text}
          mention={level === 2 ? mentionFor(cm, root, c.names) : undefined}
          likes={cm.likeCount}
          liked={cm.viewerLiked}
          highlighted={c.replyTo?.commentId === cm.id || devInit?.highlightCommentId === cm.id}
          mediaUri={m.kind === "image" && !renderMedia ? m.url : undefined}
          mediaSlot={m.kind === "image" ? renderMedia?.(m.url ?? "") : undefined}
          mediaFiltered={m.kind === "filtered"}
          filteredLabel={m.processing ? contentCopy.processingStrip : undefined}
          onLike={() => c.toggleCommentLike(cm)}
          onReply={() => c.startReply(cm)}
          onLongPress={() => c.setSheet({ type: "comment", commentId: cm.id })}
        />
        {s.kind !== "none" ? (
          <View style={{ marginTop: 6, marginStart: (level === 2 ? 42 : 0) + COMMENT_AVATAR[level] + GAP, borderRadius: 12, overflow: "hidden" }}>
            {s.kind === "processing" ? <StateStrip kind="processing" /> : null}
            {s.kind === "review" ? <StateStrip kind="review" /> : null}
            {s.kind === "notice" ? (
              <UploaderNotice
                mode="afterPublish"
                onUnderstood={() => c.dismissNotice(s.mediaId)}
                onRemoveMedia={() => void c.removeOwnMedia(s.mediaId, cm.id)}
                onAppeal={() => void c.appeal(s.mediaId)}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const reportingComment = sheet?.type === "report" && sheet.target.type === "comment";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: topInset }}>
        {top}
        <ScrollView
          ref={scroll}
          style={{ flex: 1, backgroundColor: "#FFFFFF" }}
          contentContainerStyle={devInit?.scrollToCommentsAt != null ? { paddingBottom: 700 } : undefined}
          keyboardShouldPersistTaps="handled"
        >
          <PostCard
            variant="detail"
            post={{
              author: { name: view.authorName },
              time: formatRelativeTime(post.publishedAt ?? post.createdAt),
              source: cardSource,
              body: post.text,
              location: post.locationTag ?? undefined,
              media: media.url,
              likes: c.stats.likes,
              comments: c.stats.comments,
              liked: c.stats.liked,
              saved: c.stats.saved,
            }}
            filtered={media.kind === "filtered"}
            filteredLabel={media.processing ? contentCopy.processingStrip : undefined}
            filteredHint={media.processing ? "" : undefined}
            mediaSlot={mediaSlot}
            quote={view.quote ? <Quote quote={view.quote} onOpen={onOpenPost} /> : undefined}
            stateStrip={<OwnStrip strip={strip} onUnderstood={c.dismissNotice} onRemove={(id) => void c.removeOwnMedia(id)} onAppeal={(id) => void c.appeal(id)} />}
            onMore={() => c.setSheet({ type: "post" })}
            onLike={c.toggleLike}
            onComment={() => scroll.current?.scrollTo({ y: Math.max(0, commentsY.current - 8), animated: true })}
            onShare={() => c.setSheet({ type: "share" })}
            onSave={c.toggleSave}
          />
          <View
            ref={commentsRef}
            onLayout={(e) => {
              commentsY.current = e.nativeEvent.layout.y;
              if (devInit?.scrollToCommentsAt != null) {
                // Dev only: land on whole pixels so the text matches the lab bit for bit.
                // onLayout rounds, so read the exact offset from the DOM (web only).
                const el = commentsRef.current as unknown as HTMLElement;
                const exact = el.getBoundingClientRect().top - (el.parentElement as HTMLElement).getBoundingClientRect().top;
                const shift = Math.ceil(exact) - exact;
                if (shift > 1e-3) setPixelFix((f) => f + shift);
                requestAnimationFrame(() => scroll.current?.scrollTo({ y: Math.ceil(exact), animated: false }));
              }
            }}
            style={{ marginTop: pixelFix, paddingTop: devInit?.scrollToCommentsAt ?? 12, paddingHorizontal: 16, paddingBottom: 24, flexDirection: "column", gap: 14, backgroundColor: "#FFFFFF" }}
            testID="comments"
          >
            {c.comments.threads.map((t) => (
              <View key={t.comment.id} style={{ flexDirection: "column", gap: 14 }}>
                {renderComment(t.comment, t.comment, 1)}
                {t.replies.map((r) => renderComment(r, t.comment, 2))}
              </View>
            ))}
            {c.commentsStatus === "idle" && c.comments.threads.length === 0 && !devInit?.hideEmptyNote ? (
              <Text style={{ textAlign: "center", color: theme.colors.ink400, paddingVertical: 12 }}>{postCopy.noComments}</Text>
            ) : null}
            {c.commentsStatus === "error" ? (
              <>
                <Text style={{ textAlign: "center", color: theme.colors.ink400 }}>{postCopy.commentsError}</Text>
                <MoreCommentsLink label={postCopy.commentsRetry} onPress={() => void c.loadMoreComments()} />
              </>
            ) : null}
            {c.commentsStatus === "loading" && c.comments.threads.length === 0 ? <Skeleton height={48} radius={16} /> : null}
            {c.comments.nextCursor && c.commentsStatus !== "error" ? (
              <MoreCommentsLink onPress={() => (c.commentsStatus === "loading" ? undefined : void c.loadMoreComments())} />
            ) : null}
          </View>
        </ScrollView>

        {c.image ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#FFFFFF" }}>
            <Image source={{ uri: c.image.uri }} style={{ width: 56, height: 56, borderRadius: 12 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={postCopy.removeAttachmentA11y} onPress={() => c.setImage(null)}>
              <Icon name="x" size={18} color={theme.colors.ink400} />
            </Pressable>
          </View>
        ) : null}
        <CommentBox
          me={{ name: data.viewerName }}
          value={c.draft}
          onChangeText={c.setDraft}
          onSend={() => void c.send()}
          onAttach={() => void c.pickImage()}
          replyingTo={c.replyTo?.name}
          onCancelReply={() => c.setReplyTo(null)}
        />
      </View>

        {sheet?.type === "post" ? (
          isAuthor ? (
            <OwnPostMenuSheet
              canCopyLink={view.copyLink !== null}
              onDismiss={() => c.setSheet(null)}
              onSave={() => {
                c.setSheet(null);
                c.toggleSave();
              }}
              onCopyLink={() => void c.copyLink(view.copyLink)}
            />
          ) : (
            <PostMenuSheet
              variant="standard"
              authorName={view.authorName}
              canCopyLink={view.copyLink !== null}
              onDismiss={() => c.setSheet(null)}
              onSave={() => {
                c.setSheet(null);
                c.toggleSave();
              }}
              onMuteAuthor={() => void c.mute(post.authorId)}
              onReport={() => c.setSheet({ type: "report", target: { type: "post", id: post.id } })}
              onCopyLink={() => void c.copyLink(view.copyLink)}
            />
          )
        ) : null}
        {sheet?.type === "share" ? (
          <ShareSheet
            canShareToGroup={targets.length > 0}
            groupName={targets.length === 1 && !hasPublicAudience ? targets[0]?.name : undefined}
            canCopyLink={view.copyLink !== null}
            onDismiss={() => c.setSheet(null)}
            onShareToGroup={() => (targets.length === 1 && targets[0] ? void c.shareTo(targets[0].id) : c.setSheet({ type: "shareTargets" }))}
            onCopyLink={() => void c.copyLink(view.copyLink)}
          />
        ) : null}
        {sheet?.type === "shareTargets" ? (
          <BottomSheet title={postCopy.shareTargets.title} onBack={() => c.setSheet({ type: "share" })} onDismiss={() => c.setSheet(null)}>
            {targets.map((g) => (
              <SheetRow
                key={g.id}
                label={g.name}
                tile={{ icon: g.icon ?? "users", background: g.color ?? theme.colors.primary, color: "#FFFFFF" }}
                onPress={() => void c.shareTo(g.id)}
              />
            ))}
          </BottomSheet>
        ) : null}
        {sheet?.type === "comment" && commentSheet ? (
          <CommentMenuSheet
            own={commentSheet.authorId === data.viewerId}
            authorName={c.names[commentSheet.authorId] ?? ""}
            onDismiss={() => c.setSheet(null)}
            onReport={() => c.setSheet({ type: "report", target: { type: "comment", id: commentSheet.id } })}
            onMute={() => void c.mute(commentSheet.authorId)}
          />
        ) : null}
        {sheet?.type === "commentCatalog" && commentSheet ? (
          <CommentMenuCatalogSheet authorName={c.names[commentSheet.authorId] ?? ""} />
        ) : null}
        {sheet?.type === "report" ? (
          <ReportSheet
            value={c.reportChoice}
            onChange={c.setReportChoice}
            details={c.reportDetails}
            onDetailsChange={c.setReportDetails}
            onSubmit={() => void c.submitReport()}
            onDismiss={() => c.setSheet(null)}
            {...(reportingComment ? { title: sheetCopy.commentMenu.report, subtitle: postCopy.reportCommentSubtitle } : null)}
          />
        ) : null}
        {c.toast ? <Toast message={c.toast} durationMs={3000} onHide={() => c.setToast(null)} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function OwnStrip({
  strip,
  onUnderstood,
  onRemove,
  onAppeal,
}: {
  strip: ReturnType<typeof ownMediaStrip>;
  onUnderstood: (mediaId: string) => void;
  onRemove: (mediaId: string) => void;
  onAppeal: (mediaId: string) => void;
}) {
  if (strip.kind === "processing") return <StateStrip kind="processing" />;
  if (strip.kind === "review") return <StateStrip kind="review" />;
  if (strip.kind === "notice") {
    const id = strip.mediaId;
    return <UploaderNotice mode="afterPublish" onUnderstood={() => onUnderstood(id)} onRemoveMedia={() => onRemove(id)} onAppeal={() => onAppeal(id)} />;
  }
  return null;
}

function Quote({ quote, onOpen }: { quote: NonNullable<PostView["quote"]>; onOpen: (id: string) => void }) {
  if (quote.state === "unavailable") return <QuoteCard state="unavailable" />;
  return (
    <QuoteCard
      state="available"
      author={{ name: quote.authorName }}
      time={formatRelativeTime(quote.createdAt)}
      body={quote.text}
      onPress={() => onOpen(quote.id)}
    />
  );
}

/** Loading: composed from the lab's skeleton pieces (the lab draws the feed skeleton only). */
function PostSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <SkeletonPostCard media />
      <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 14 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: GAP }}>
            <Skeleton width={34} height={34} radius={17} />
            <Skeleton flex height={54} radius={16} />
          </View>
        ))}
      </View>
    </View>
  );
}
