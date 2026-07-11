/**
 * Signup parity (invariant #3, defaults-are-not-rules): the handle_new_user
 * trigger must seed filter_settings with EXACTLY the gender-conditioned defaults
 * that resolveDefaultFilterSettings() produces in @safeplace/visibility-policy.
 * A drift between the SQL trigger and the TS defaults fails here.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { resolveDefaultFilterSettings, type Gender } from "@safeplace/visibility-policy";
import { createTestDb, type TestDb } from "../harness";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

const IDS: Record<Gender, string> = {
  male: "00000000-0000-0000-0000-0000000000e1",
  female: "00000000-0000-0000-0000-0000000000e2",
};

async function signup(gender: Gender, name: string): Promise<void> {
  await db.raw.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, $2, jsonb_build_object('gender', $3::text, 'display_name', $4::text))`,
    [IDS[gender], `${gender}@signup.test`, gender, name]
  );
}

for (const gender of ["male", "female"] as const) {
  it(`seeds ${gender} defaults matching resolveDefaultFilterSettings`, async () => {
    await signup(gender, `${gender} member`);

    const { rows } = await db.raw.query<{
      hide_content_with_women: boolean;
      hide_women_accounts: boolean;
      filter_applies_to_avatars: boolean;
      show_suggested_posts: boolean;
      gender_separation_in_messages: boolean;
      gender_separation_in_search: boolean;
    }>(`select * from public.filter_settings where user_id = $1`, [IDS[gender]]);

    expect(rows).toHaveLength(1);
    const s = rows[0]!;
    const expected = resolveDefaultFilterSettings(gender);

    expect(s.hide_content_with_women).toBe(expected.hideContentWithWomen);
    expect(s.hide_women_accounts).toBe(expected.hideWomenAccounts);
    expect(s.filter_applies_to_avatars).toBe(expected.filterAppliesToAvatars);
    expect(s.show_suggested_posts).toBe(expected.showSuggestedPosts);
    expect(s.gender_separation_in_messages).toBe(expected.genderSeparationInMessages);
    expect(s.gender_separation_in_search).toBe(expected.genderSeparationInSearch);
  });
}

it("creates the 1:1 profile with the declared gender + display name", async () => {
  const { rows } = await db.raw.query<{ gender: Gender; display_name: string }>(
    `select gender, display_name from public.profiles where id = $1`,
    [IDS.female]
  );
  expect(rows[0]?.gender).toBe("female");
  expect(rows[0]?.display_name).toBe("female member");
});

it("rejects signup with no declared gender", async () => {
  await expect(
    db.raw.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, '{}'::jsonb)`,
      ["00000000-0000-0000-0000-0000000000e9", "nogender@signup.test"]
    )
  ).rejects.toThrow(/gender/i);
});
