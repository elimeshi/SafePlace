import { describe, expect, it } from "vitest";
import type { ContentAudience } from "@safeplace/visibility-policy";
import {
  composeReducer,
  deriveView,
  initialComposeState,
  mayPublishNow,
  seedAudiences,
  type ComposeAction,
  type ComposeState,
} from "../composeState";

const run = (actions: ComposeAction[], from = initialComposeState([{ kind: "public" }])): ComposeState =>
  actions.reduce(composeReducer, from);

const attached: ComposeAction[] = [
  { type: "mediaPicked", localUri: "file://a.jpg", contentType: "image/jpeg" },
  { type: "mediaAttached", mediaId: "m1" },
];

describe("deriveView", () => {
  it("dims Publish with no content", () => {
    expect(deriveView(run([])).canPublish).toBe(false);
    expect(deriveView(run([{ type: "text", text: "   " }])).canPublish).toBe(false);
  });

  it("enables Publish for text, and for media alone", () => {
    expect(deriveView(run([{ type: "text", text: "שלום" }])).canPublish).toBe(true);
    expect(deriveView(run(attached)).canPublish).toBe(true);
  });

  it("never waits on classification: checking still allows Publish", () => {
    const s = run([{ type: "text", text: "x" }, ...attached]);
    const v = deriveView(s);
    expect(v.checking).toBe(true);
    expect(v.canPublish).toBe(true);
    expect(mayPublishNow(s)).toBe(true);
  });

  it("waits on the upload itself (nothing to attach yet)", () => {
    const s = run([
      { type: "text", text: "x" },
      { type: "mediaPicked", localUri: "u", contentType: "image/jpeg" },
    ]);
    expect(deriveView(s).canPublish).toBe(false);
  });

  it("rejects an invalid audience set", () => {
    const bad: ContentAudience[] = [{ kind: "family_space", spaceId: "f" }, { kind: "public" }];
    expect(deriveView(run([{ type: "text", text: "x" }, { type: "audiences", audiences: bad }])).canPublish).toBe(false);
  });

  it("clears the checking chip once resolved", () => {
    const s = run([...attached, { type: "uploaderState", state: "published", foundGroups: [] }]);
    expect(deriveView(s).checking).toBe(false);
  });

  it("shows the review strip for under_review, never a block", () => {
    const s = run([...attached, { type: "uploaderState", state: "under_review", foundGroups: [] }]);
    const v = deriveView(s);
    expect(v.showReview).toBe(true);
    expect(v.canPublish).toBe(true);
  });
});

describe("content notice", () => {
  const flagged = run([{ type: "text", text: "x" }, ...attached, { type: "uploaderState", state: "filtered_for_some_viewers", foundGroups: ["sex"] }]);

  it("shows before publish, and Publish while unanswered is allowed (treated as Confirm)", () => {
    expect(deriveView(flagged).showNotice).toBe(true);
    expect(deriveView(flagged).noticeGroups).toEqual(["sex"]);
    expect(mayPublishNow(flagged)).toBe(true);
    expect(flagged.media?.noticeResolved).toBe(false);
  });

  it("Confirm (or appeal) hides it and lets Publish through", () => {
    const confirmed = composeReducer(flagged, { type: "noticeResolved", appealed: false });
    expect(deriveView(confirmed).showNotice).toBe(false);
    expect(mayPublishNow(confirmed)).toBe(true);
    expect(composeReducer(flagged, { type: "noticeResolved", appealed: true }).appealSent).toBe(true);
  });

  it("Back (media removed) clears it", () => {
    const back = composeReducer(flagged, { type: "mediaRemoved" });
    expect(deriveView(back).showNotice).toBe(false);
    expect(back.media).toBeNull();
  });
});

describe("reducer", () => {
  it("stores a place NAME only, trimmed; empty clears", () => {
    expect(run([{ type: "locationSet", name: "  נחל שורק " }]).locationTag).toBe("נחל שורק");
    expect(run([{ type: "locationSet", name: "x" }, { type: "locationSet", name: " " }]).locationTag).toBeNull();
  });

  it("a failed upload drops the media and reports it", () => {
    const s = run([{ type: "mediaPicked", localUri: "u", contentType: "image/jpeg" }, { type: "mediaFailed" }]);
    expect(s.media).toBeNull();
    expect(s.error).toBe("upload");
  });

  it("ignores poll results with no media (removed meanwhile)", () => {
    expect(run([{ type: "uploaderState", state: "published", foundGroups: [] }]).media).toBeNull();
  });

  it("a failed publish is recoverable", () => {
    const s = run([{ type: "publishStart" }, { type: "publishFailed" }]);
    expect(s.publishing).toBe(false);
    expect(s.error).toBe("publish");
  });
});

describe("seedAudiences", () => {
  it("seeds from the account default", () => {
    expect(seedAudiences("followers_only", "u1")).toEqual([{ kind: "followers_only", authorId: "u1" }]);
    expect(seedAudiences("public", "u1")).toEqual([{ kind: "public" }]);
    expect(seedAudiences("group", "u1")).toEqual([{ kind: "public" }]);
  });
});
