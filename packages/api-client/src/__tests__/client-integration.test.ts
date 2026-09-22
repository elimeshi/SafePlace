/**
 * Canonical ADR 0006 client-transport test: exercises the api-client helpers
 * end-to-end through a live `supabase start` stack — GoTrue signup, PostgREST
 * + RLS, and Storage signed URLs — the path a real client actually takes.
 *
 * Hermetic-by-default: self-skips unless SUPABASE_TEST_URL / _ANON_KEY /
 * _SERVICE_KEY are set (the PGlite parity suite is the always-on RLS check).
 * Run against a local stack with:
 *   SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_KEY=... \
 *     pnpm --filter @safeplace/api-client test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveDefaultFilterSettings, type Gender } from "@safeplace/visibility-policy";
import {
  buildViewerContext,
  createPost,
  getSignedMediaUrl,
  setContentFilterEnabled,
  signIn,
  signUpWithGender,
  uploadMedia,
} from "../index";

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE = process.env.SUPABASE_TEST_SERVICE_KEY;
const enabled = Boolean(URL && ANON && SERVICE);

const anonClient = () =>
  createClient(URL!, ANON!, { auth: { persistSession: false, autoRefreshToken: false } });

async function createConfirmedUser(
  service: SupabaseClient,
  gender: Gender,
  stamp: number
): Promise<{ id: string; email: string; password: string }> {
  const email = `${gender}-${stamp}@safeplace.test`;
  const password = "test-password-123";
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { gender, display_name: `${gender} tester` },
  });
  if (error || !data.user) throw new Error(`createConfirmedUser: ${error?.message}`);
  return { id: data.user.id, email, password };
}

describe.skipIf(!enabled)("api-client against a live Supabase stack", () => {
  let service: SupabaseClient;
  const stamp = Date.now();

  beforeAll(() => {
    service = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
  });
  afterAll(async () => {
    await service?.auth.signOut();
  });

  it("signup trigger seeds gender-conditioned defaults (male & female)", async () => {
    for (const gender of ["male", "female"] as const) {
      const user = await createConfirmedUser(service, gender, stamp + (gender === "male" ? 1 : 2));
      const { data } = await service
        .from("filter_settings")
        .select("hide_content_with_women, filter_applies_to_avatars")
        .eq("user_id", user.id)
        .single();
      const expected = resolveDefaultFilterSettings(gender);
      expect(data?.hide_content_with_women).toBe(expected.hideContentWithWomen);
      expect(data?.filter_applies_to_avatars).toBe(expected.filterAppliesToAvatars);
    }
  });

  it("signUpWithGender (GoTrue) creates a profile with the declared gender", async () => {
    const client = anonClient();
    const email = `signup-${stamp}@safeplace.test`;
    const { error } = await signUpWithGender(client, {
      email,
      password: "test-password-123",
      gender: "female",
      displayName: "Signup Flow",
    });
    expect(error).toBeNull();
    // Verify via service (independent of whether a session was returned).
    const { data: users } = await service.auth.admin.listUsers();
    const created = users.users.find((u) => u.email === email);
    expect(created).toBeTruthy();
    const { data: profile } = await service
      .from("profiles")
      .select("gender, display_name")
      .eq("id", created!.id)
      .single();
    expect(profile?.gender).toBe("female");
    expect(profile?.display_name).toBe("Signup Flow");
  });

  it("classification end-to-end: owner always sees own; a filtered non-owner is withheld until toggled", async () => {
    const uploader = await createConfirmedUser(service, "male", stamp + 10);
    const maleViewer = await createConfirmedUser(service, "male", stamp + 12);
    const female = await createConfirmedUser(service, "female", stamp + 11);

    const uploaderClient = anonClient();
    await signIn(uploaderClient, uploader.email, uploader.password);

    // The uploader is themselves a filtered user (male default).
    const ctx = await buildViewerContext(uploaderClient, uploader.id);
    expect(ctx.gender).toBe("male");
    expect(ctx.filterSettings.hideContentWithWomen).toBe(true);

    // Upload media + publish a public post as the uploader.
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { storagePath } = await uploadMedia(uploaderClient, {
      uploaderId: uploader.id,
      data: bytes,
      contentType: "image/png",
    });
    const { postId } = await createPost(uploaderClient, {
      authorId: uploader.id,
      exposure: { kind: "public" },
      text: "hello",
      media: [{ storagePath, contentType: "image/png" }],
    });

    // Pipeline (service_role) classifies it as containing women.
    const { data: mediaRow } = await service
      .from("media_items")
      .select("id")
      .eq("post_id", postId)
      .single();
    const mediaId = (mediaRow as { id: string }).id;
    await service
      .from("media_items")
      .update({ classification: "contains_women", classified_at: new Date().toISOString() })
      .eq("id", mediaId);

    // The UPLOADER always sees their own content, despite their filter being on.
    const own = await getSignedMediaUrl(uploaderClient, mediaId);
    expect(own.filtered).toBe(false);
    expect(own.url).toContain("/storage/");

    // A different filtered viewer (male default) → withheld: row present, no URL.
    const viewerClient = anonClient();
    await signIn(viewerClient, maleViewer.email, maleViewer.password);
    const withheld = await getSignedMediaUrl(viewerClient, mediaId);
    expect(withheld.filtered).toBe(true);
    expect(withheld.url).toBeNull();

    // ...until that viewer toggles their own filter off.
    await setContentFilterEnabled(viewerClient, maleViewer.id, false);
    const revealed = await getSignedMediaUrl(viewerClient, mediaId);
    expect(revealed.filtered).toBe(false);
    expect(revealed.url).toContain("/storage/");

    // An unfiltered viewer (female default) sees the content.
    const femaleClient = anonClient();
    await signIn(femaleClient, female.email, female.password);
    const femaleView = await getSignedMediaUrl(femaleClient, mediaId);
    expect(femaleView.filtered).toBe(false);
    expect(femaleView.url).toBeTruthy();
  });
});
