/**
 * Staff fixtures (Phase 8 plan §4.1). Staff are auth users with
 * app_metadata.staff = true, so handle_new_user gives them no profile; their
 * role lives in staff.members. Seeded on the owner connection, like seed.ts.
 */
import type { PGlite } from "@electric-sql/pglite";
import type { StaffRole } from "@safeplace/visibility-policy";

const hx = (s: string): string => `00000000-0000-0000-0000-${s.padStart(12, "0")}`;

export const STAFF = {
  reviewer: hx("5a0"),
  reviewer2: hx("5a1"),
  admin: hx("5a2"),
  senior: hx("5a3"),
} as const;

const ROLES: Record<keyof typeof STAFF, StaffRole> = {
  reviewer: "reviewer",
  reviewer2: "reviewer",
  admin: "admin",
  senior: "senior_admin",
};

export async function seedStaff(raw: PGlite): Promise<void> {
  for (const [key, id] of Object.entries(STAFF) as [keyof typeof STAFF, string][]) {
    await raw.query(
      `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"staff":true}')`,
      [id, `${key}@staff.test`]
    );
    await raw.query(
      `insert into staff.members (user_id, display_name, role, active) values ($1, $2, $3, true)`,
      [id, key, ROLES[key]]
    );
  }
}
