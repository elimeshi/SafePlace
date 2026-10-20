/**
 * Domain entity types, conceptually mirroring docs/architecture/data-model.md.
 * Keep that doc and this file in sync when either changes.
 *
 * Visibility-specific types (Gender, FilterSettings, MediaClassification,
 * ContentExposure, Viewer) live in @safeplace/visibility-policy — imported
 * here, not redefined.
 */

import type {
  ContentAudience,
  ContentExposure,
  FilterSettings,
  Gender,
  MediaClassification,
} from "@safeplace/visibility-policy";

export type AccountStatus =
  | "active"
  | "suspended"
  | "frozen"
  | "pending_deletion"
  | "deleted";

export interface PrivacySettings {
  defaultPostExposure: ContentAudience["kind"];
  whoCanFollow: "everyone" | "approval_required";
  discoverableInSearch: "everyone" | "followers_only" | "nobody";
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
}

export interface User {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  gender: Gender;
  /** ISO 8601 timestamp of the last gender change, if any. */
  genderChangedAt: string | null;
  /**
   * ISO 8601 timestamp when a pending gender change takes effect.
   * See docs/product/06-settings-spec.md §4.3.2 — 24h delayed activation.
   */
  genderChangeEffectiveAt: string | null;
  filterSettings: FilterSettings;
  privacySettings: PrivacySettings;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  /** Polymorphic parent: exactly one of these is set. `profileId` is the
   * avatar/profile-photo case — avatars are real, classified media, not a
   * bare URL (visibility-model §4, invariant #8). */
  postId: string | null;
  commentId: string | null;
  messageId: string | null;
  profileId: string | null;
  /** Author of the parent surface; denormalized so frozen-media + block
   * visibility checks avoid a parent join. Immutable. */
  uploaderId: string;
  /** Object path in the private media bucket — never a public/guessable URL,
   * and withheld from a filtered viewer (served only via a signed URL). */
  storageUrl: string;
  classification: MediaClassification;
  classifiedAt: string | null;
}

export type PostSourceContext =
  | { kind: "profile" }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

export interface Poll {
  question: string;
  options: Array<{ id: string; text: string; imageMediaItemId: string | null }>;
}

export interface Post {
  id: string;
  authorId: string;
  createdAt: string;
  editedAt: string | null;
  text: string;
  exposure: ContentExposure;
  sourceContext: PostSourceContext;
  mediaItems: MediaItem[];
  poll: Poll | null;
  locationTag: string | null; // place name only, never coordinates
  taggedUserIds: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  /** null = top-level comment; non-null = level-2 reply. No level-3 nesting. */
  parentCommentId: string | null;
  text: string;
  mediaItems: MediaItem[];
  createdAt: string;
  editedAt: string | null;
}

export type GroupVisibility = "public" | "private_visible" | "private_hidden";
export type GroupPostingPolicy = "open" | "approval_required" | "admin_only";

export interface Group {
  id: string;
  name: string;
  description: string;
  color: string; // one of a fixed palette — see packages/design-tokens
  icon: string;
  visibility: GroupVisibility;
  postingPolicy: GroupPostingPolicy;
  adminUserIds: string[];
  memberCount: number;
  createdAt: string;
}

export interface FamilySpace {
  id: string;
  name: string;
  adminUserId: string;
  createdAt: string;
}

export interface Follow {
  followerId: string;
  followedId: string;
  createdAt: string;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface MessageRequest {
  id: string;
  senderId: string;
  recipientId: string;
  text: string; // text-only, per docs/product/09-messages-spec.md §3.4
  createdAt: string;
  status: "pending" | "accepted" | "declined" | "reported";
}

export interface Conversation {
  id: string;
  participantIds: [string, string]; // 1:1 only for MVP
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  mediaItems: MediaItem[];
  createdAt: string;
  editedAt: string | null;
  deletedForEveryone: boolean;
}

export type ReportTargetType = "post" | "comment" | "message" | "user";

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  category: string;
  freeTextExplanation: string | null;
  createdAt: string;
  // Always routed to human review — never auto-resolved. See
  // docs/architecture/moderation-pipeline.md §5.
  status: "pending_review" | "resolved";
}

export type ModerationPenaltyType =
  | "warning"
  | "suspension_24h"
  | "suspension_7d"
  | "permanent_ban"
  | "content_removed";

export interface ModerationAction {
  id: string;
  targetUserId: string;
  decidedByModeratorId: string;
  reason: string;
  ruleViolated: string;
  penaltyType: ModerationPenaltyType;
  penaltyDuration: string | null; // ISO 8601 duration, if applicable
  appealable: true;
  appealStatus: "none" | "pending" | "upheld" | "overturned";
  /** Must differ from decidedByModeratorId — see moderation-pipeline.md §7. */
  appealDecidedByModeratorId: string | null;
  createdAt: string;
}
