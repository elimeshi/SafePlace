/**
 * Staff identity (Phase 8 plan §4.1, ADR 0020): staff are auth users with no
 * profile, their role is honoured only at aal2 and while active, and no client
 * role can read the staff schema. Mirrors staffAllowed in visibility-policy.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { staffAllowed, type StaffRole } from "@safeplace/visibility-policy";
import { createTestDb, type TestDb } from "../harness";
import { USER, seedFixtures } from "../seed";
import { STAFF, seedStaff } from "../staff-seed";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await seedFixtures(db.raw);
  await seedStaff(db.raw);
  // A deactivated admin.
  await db.raw.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'gone@staff.test', '{"staff":true}')`,
    [GONE]
  );
  await db.raw.query(
    `insert into staff.members (user_id, display_name, role, active, deactivated_at) values ($1, 'gone', 'admin', false, now())`,
    [GONE]
  );
});
afterAll(async () => {
  await db.close();
});

const GONE = "00000000-0000-0000-0000-0000000005af";

const roleOf = (id: string, aal: "aal1" | "aal2" = "aal2") =>
  db.asStaff(id, (q) => q.query<{ r: string | null }>(`select staff.current_role() as r`), { aal }).then((r) => r.rows[0]!.r);

describe("staff.current_role()", () => {
  it("is null for a normal app user", async () => {
    const { rows } = await db.asUser(USER.author.id, (q) => q.query<{ r: string | null }>(`select staff.current_role() as r`));
    expect(rows[0]!.r).toBeNull();
  });
  it("is null for staff at aal1", async () => {
    expect(await roleOf(STAFF.admin, "aal1")).toBeNull();
  });
  it("is null for a deactivated member", async () => {
    expect(await roleOf(GONE)).toBeNull();
  });
  it("returns the role at aal2", async () => {
    expect(await roleOf(STAFF.reviewer)).toBe("reviewer");
    expect(await roleOf(STAFF.admin)).toBe("admin");
    expect(await roleOf(STAFF.senior)).toBe("senior_admin");
  });
});

describe("staff.require() agrees with staffAllowed", () => {
  const actors: [string, StaffRole, boolean, "aal1" | "aal2"][] = [
    [STAFF.reviewer, "reviewer", true, "aal2"],
    [STAFF.admin, "admin", true, "aal2"],
    [STAFF.senior, "senior_admin", true, "aal2"],
    [STAFF.admin, "admin", true, "aal1"],
    [GONE, "admin", false, "aal2"],
  ];
  for (const [id, role, active, aal] of actors) {
    for (const min of ["reviewer", "admin", "senior_admin"] as const) {
      const allowed = staffAllowed({ userId: id, role, active, aal, reviewEntryAcknowledged: false }, min);
      it(`${role}${active ? "" : " (deactivated)"} at ${aal}, require('${min}') ${allowed ? "passes" : "raises"}`, async () => {
        const call = db.asStaff(id, (q) => q.query(`select staff.require($1::staff.staff_role)`, [min]), { aal });
        if (allowed) await expect(call).resolves.toBeDefined();
        else await expect(call).rejects.toThrow(/staff access denied/);
      });
    }
  }

  it("raises with errcode 42501", async () => {
    const err = await db
      .asStaff(STAFF.reviewer, (q) => q.query(`select staff.require('admin')`))
      .catch((e: { code?: string }) => e);
    expect((err as { code?: string }).code).toBe("42501");
  });
});

describe("visibility.is_staff()", () => {
  it("is true for staff (active or not) and false for an app user", async () => {
    const isStaff = (run: TestDb["asUser"], id: string) =>
      run(id, (q) => q.query<{ s: boolean }>(`select visibility.is_staff() as s`)).then((r) => r.rows[0]!.s);
    expect(await isStaff(db.asStaff, STAFF.reviewer)).toBe(true);
    expect(await isStaff(db.asStaff, GONE)).toBe(true);
    expect(await isStaff(db.asUser, USER.author.id)).toBe(false);
  });
});

it("a staff auth user gets no profile and no filter settings", async () => {
  const { rows } = await db.raw.query<{ p: number; f: number }>(
    `select (select count(*)::int from public.profiles where id = $1) as p,
            (select count(*)::int from public.filter_settings where user_id = $1) as f`,
    [STAFF.reviewer]
  );
  expect(rows[0]).toEqual({ p: 0, f: 0 });
});

it("no client role can read staff.members", async () => {
  await expect(db.asUser(USER.author.id, (q) => q.query(`select * from staff.members`))).rejects.toThrow(/permission denied/);
  await expect(db.asStaff(STAFF.senior, (q) => q.query(`select * from staff.members`))).rejects.toThrow(/permission denied/);
  await expect(db.asAnon((q) => q.query(`select * from staff.members`))).rejects.toThrow(/permission denied/);
});

it("moderation_actions accepts a staff decider, and the same decider on the appeal", async () => {
  await db.raw.query(
    `insert into public.moderation_actions
       (target_user_id, decided_by_moderator_id, reason, rule_violated, penalty_type, appeal_status, appeal_decided_by_moderator_id)
     values ($1, $2, 'r', 'rule', 'warning', 'upheld', $2)`,
    [USER.author.id, STAFF.admin]
  );
  const { rows } = await db.raw.query<{ n: number }>(
    `select count(*)::int as n from public.moderation_actions where decided_by_moderator_id = $1`,
    [STAFF.admin]
  );
  expect(rows[0]!.n).toBe(1);
});
