// Foundation
export * from "./theme";
export * from "./motion";
export * from "./foundation/GradientFill";
export * from "./foundation/direction";
export { cssGradientVector, type GradientVector } from "./foundation/gradient";
export { assistant, rubik, lh, tintOnWhite } from "./foundation/style";

// Content
export * from "./content/Icon";
export * from "./content/Avatar";
export * from "./content/SourceLabel";
export * from "./content/InteractionBar";
export * from "./content/FilteredMedia";
export * from "./content/MiniButton";
export * from "./content/StateStrip";
export * from "./content/UploaderNotice";
export * from "./content/QuoteCard";
export { contentCopy, type ContentCopy } from "./content/copy";

// Forms
export * from "./primitives/Button";
export * from "./primitives/ActionButton";
export * from "./forms/TextField";
export * from "./forms/Toggle";
export * from "./forms/GenderChoice";
export * from "./forms/Checkbox";

// Feedback
export * from "./feedback/SystemNotice";
export * from "./feedback/EmptyState";
export * from "./feedback/Skeleton";
export * from "./feedback/Toast";
export { feedbackCopy } from "./feedback/copy";

// Feed
export * from "./feed/StatusesRail";
export * from "./feed/SpaceCard";
export * from "./feed/SpacesRail";
export * from "./feed/CollapsedStrip";
export * from "./feed/CollapsibleZones";
export * from "./feed/FollowRail";
export * from "./feed/BottomTabs";
export * from "./feed/ExpandedPanel";
export { feedCopy, formatCount, type FeedCopy } from "./feed/copy";

// Sheets
export * from "./sheets/BottomSheet";
export * from "./sheets/SheetRow";
export * from "./sheets/PostSheets";
export * from "./sheets/CommentMenuSheet";
export * from "./sheets/ReportSheet";
export { sheetCopy } from "./sheets/copy";

// Exposure (multi-select audience picker)
export * from "./exposure/ExposureChip";
export * from "./exposure/ExposurePicker";
export { exposureSummary, type ExposureSummary } from "./exposure/summary";
export {
  applyAudienceToggle,
  hasAudience,
  isAudienceTogglable,
  isSelectionValid,
} from "./exposure/audience";
export { exposureCopy } from "./exposure/copy";

// Comments
export * from "./comments/CommentBubble";
export * from "./comments/CommentBox";
export { commentCopy } from "./comments/copy";

// Compose / post chrome
export * from "./compose/ComposeParts";
export { composeCopy } from "./compose/copy";

// Surfaces
export * from "./surfaces/PostCard";
