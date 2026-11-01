import { describe, expect, it } from "vitest";
import {
  attachMedia,
  createDraft,
  deleteDraft,
  pollUploaderMedia,
  publishDraft,
  removeMedia,
  setAudiences,
  shareToGroup,
  updateDraft,
} from "../compose";
import { mockClient, opsOf } from "./mock-client";

describe("compose", () => {
  it("createDraft writes a draft with its source and quote", async () => {
    const { client, calls } = mockClient(() => ({ data: { id: "d1" } }));
    expect(
      await createDraft(client, { authorId: "u", text: "t", source: { kind: "group", groupId: "g" }, quotedPostId: "q" })
    ).toEqual({ postId: "d1" });
    expect(opsOf(calls[0], "insert")[0][0]).toMatchObject({
      author_id: "u", status: "draft", source_kind: "group", source_group_id: "g", source_space_id: null, quoted_post_id: "q",
    });
    const plain = mockClient(() => ({ data: { id: "d" } }));
    await createDraft(plain.client, { authorId: "u" });
    expect(opsOf(plain.calls[0], "insert")[0][0]).toMatchObject({ source_kind: "profile", source_group_id: null });
  });

  it("createDraft surfaces errors", async () => {
    const { client } = mockClient(() => ({ error: { message: "rls" } }));
    await expect(createDraft(client, { authorId: "u" })).rejects.toThrow("createDraft: rls");
  });

  it("setAudiences replaces rows and rejects an invalid set before any write", async () => {
    const { client, calls } = mockClient();
    await setAudiences(client, "d", [{ kind: "group", groupId: "g1" }, { kind: "group", groupId: "g2" }]);
    expect(calls.map((c) => c.ops[0][0])).toEqual(["delete", "insert"]);
    expect(opsOf(calls[1], "insert")[0][0]).toHaveLength(2);
    const none = mockClient();
    await expect(setAudiences(none.client, "d", [{ kind: "public" }, { kind: "group", groupId: "g" }])).rejects.toThrow("invalid audience");
    await expect(
      setAudiences(none.client, "d", [{ kind: "family_space", spaceId: "f" }, { kind: "group", groupId: "g" }])
    ).rejects.toThrow("invalid audience");
    expect(none.calls).toHaveLength(0);
  });

  it("updateDraft patches only what was given", async () => {
    const { client, calls } = mockClient();
    await updateDraft(client, "d", { text: "x" });
    expect(opsOf(calls[0], "update")[0][0]).toEqual({ text: "x" });
  });

  it("attachMedia inserts unclassified rows (no classification field)", async () => {
    const { client, calls } = mockClient(() => ({ data: [{ id: "m1" }, { id: "m2" }] }));
    const out = await attachMedia(client, {
      postId: "d",
      uploaderId: "u",
      media: [{ storagePath: "u/a", contentType: "image/png" }, { storagePath: "u/b", contentType: "video/mp4" }],
    });
    expect(out.mediaIds).toEqual(["m1", "m2"]);
    const rows = opsOf(calls[0], "insert")[0][0] as Array<Record<string, unknown>>;
    expect(rows.every((r) => !("classification" in r))).toBe(true);
    expect(rows[0]).toMatchObject({ post_id: "d", uploader_id: "u", content_type: "image/png" });
  });

  it("pollUploaderMedia presents through the policy and reports settled", async () => {
    const pending = mockClient(() => ({ data: [{ id: "m", classification: "unclassified" }] }));
    const a = await pollUploaderMedia(pending.client, "d", "male");
    expect(a.settled).toBe(false);
    expect(a.views[0]!.state).toBeDefined();
    const lv = (sex: number) => ({ sex_level: sex, violence_level: 0, religion_level: 0, addictions_level: 0 });
    const done = mockClient(() => ({ data: [{ id: "m", classification: "contains_women", ...lv(1) }, { id: "n", classification: "general", ...lv(0) }] }));
    const b = await pollUploaderMedia(done.client, "d", "male");
    expect(b.settled).toBe(true);
    expect(b.views.map((v) => v.id)).toEqual(["m", "n"]);
    expect(b.views.map((v) => v.foundGroups)).toEqual([["sex"], []]);
    expect((await pollUploaderMedia(done.client, "d", "female")).views[0]!.foundGroups).toEqual([]);
    expect((await pollUploaderMedia(mockClient(() => ({ data: [] })).client, "d", "female")).settled).toBe(true);
  });

  it("publishDraft / removeMedia / deleteDraft hit the right rows", async () => {
    const { client, calls } = mockClient();
    await publishDraft(client, "d");
    await removeMedia(client, "m");
    await deleteDraft(client, "d");
    expect(opsOf(calls[0], "update")[0][0]).toEqual({ status: "published" });
    expect(calls[1].target).toBe("from:media_items");
    expect(opsOf(calls[2], "eq")).toEqual([["id", "d"], ["status", "draft"]]);
    const bad = mockClient(() => ({ error: { message: "cannot publish: x" } }));
    await expect(publishDraft(bad.client, "d")).rejects.toThrow("cannot publish");
    await expect(removeMedia(bad.client, "m")).rejects.toThrow();
    await expect(deleteDraft(bad.client, "d")).rejects.toThrow();
  });

  it("shareToGroup runs draft -> audience -> publish, and discards the draft on failure", async () => {
    const ok = mockClient((c) => (c.target === "from:posts" && c.ops[0][0] === "insert" ? { data: { id: "d" } } : {}));
    expect(await shareToGroup(ok.client, { authorId: "u", quotedPostId: "q", groupId: "g" })).toEqual({ postId: "d" });
    expect(ok.calls.map((c) => `${c.target}:${c.ops[0][0]}`)).toEqual([
      "from:posts:insert", "from:post_audiences:delete", "from:post_audiences:insert", "from:posts:update",
    ]);
    const fail = mockClient((c) => {
      if (c.target === "from:posts" && c.ops[0][0] === "insert") return { data: { id: "d" } };
      if (c.target === "from:posts" && c.ops[0][0] === "update") return { error: { message: "cannot publish: quote" } };
      return {};
    });
    await expect(shareToGroup(fail.client, { authorId: "u", quotedPostId: "q", groupId: "g" })).rejects.toThrow("quote");
    expect(fail.calls.at(-1)?.ops.map(([n]) => n)).toContain("delete");
  });
});
