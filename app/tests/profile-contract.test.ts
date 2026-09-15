import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { profileTrustSchema } from "@/features/profile/schema";
const db = new PGlite({ extensions: { btree_gist } });
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = uid(1),
  manager = uid(2),
  staff = uid(3),
  outsider = uid(4);
const workers = [uid(10), uid(11), uid(12), uid(13)];
const range = {
  starts_at: "2099-06-20T08:00:00Z",
  ends_at: "2099-06-20T16:00:00Z",
};
let businessId: string, venueId: string;
let commandSecurity: unknown;
async function user(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function command(action: string, data: object = {}) {
  return (
    await db.query<{
      result: { id: string; ok?: boolean; unchanged?: boolean };
    }>("select public.cp_command($1,$2::jsonb) result", [
      action,
      JSON.stringify(data),
    ])
  ).rows[0].result;
}
async function publish(slots = 3) {
  await user(owner);
  return (
    await command("publish", {
      ...range,
      business_id: businessId,
      venue_id: venueId,
      title: "Curro QA",
      specialty: "Camarero/a",
      slots,
      pay_cents: 8000,
    })
  ).id;
}
async function apply(worker: string, jobId: string) {
  await user(worker);
  return (await command("apply", { job_id: jobId })).id;
}
// Failed PostgreSQL statements abort transactions: savepoints let assertions inspect state afterwards.
async function rejected(operation: () => Promise<unknown>, code?: string) {
  await db.exec("savepoint expected_failure");
  if (code) await expect(operation()).rejects.toMatchObject({ code });
  else await expect(operation()).rejects.toThrow();
  await db.exec("rollback to savepoint expected_failure");
}
beforeAll(async () => {
  await db.exec(`create schema auth; create schema extensions;
    create role anon; create role authenticated;
    -- Inert historical grant target, never an execution identity or credential.
    create role service_role;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select '{"is_anonymous":false}'::jsonb$$;
    grant usage on schema auth to authenticated,anon;
    set search_path=public,extensions;`);
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (file.includes("professional_profile_trust_foundation")) {
      commandSecurity = (
        await db.query(
          "select proname,prosecdef,proconfig,proacl::text from pg_proc where oid in ('cp_private.command(text,jsonb)'::regprocedure,'public.cp_command(text,jsonb)'::regprocedure) order by proname",
        )
      ).rows;
      await db.query("insert into auth.users values($1,now(),null)", [uid(50)]);
      await user(uid(50));
      await db.exec(
        "select public.cp_onboard('worker','Existing worker','Bartender',true,true)",
      );
      await db.exec("reset role");
    }
    await db.exec(readFileSync(new URL(file, directory), "utf8"));
  }
  for (const id of [owner, manager, staff, outsider, ...workers]) {
    await db.exec("reset role");
    await db.query("insert into auth.users values($1,now(),null)", [id]);
    await user(id);
    await db.query(
      "select public.cp_onboard($1,'Local QA','Camarero/a',true,true)",
      [workers.includes(id) ? "worker" : "business"],
    );
    if (workers.includes(id)) {
      await command("profile", { name: "Worker QA", available: true });
      await command("availability", range);
    }
  }
  await user(owner);
  businessId = (await command("create_business", { legal_name: "Business QA" }))
    .id;
  venueId = (
    await command("create_venue", {
      business_id: businessId,
      name: "Venue QA",
      address: "Calle QA 1",
    })
  ).id;
  // Local-only membership fixtures: this phase adds no membership administration UI/RPC.
  await db.exec("reset role");
  for (const [id, role] of [
    [manager, "manager"],
    [staff, "staff"],
  ])
    await db.query(
      "insert into public.cp_business_members(business_id,user_id,member_role) values($1,$2,$3)",
      [businessId, id, role],
    );
}, 60000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db.close();
});

async function profile(application_id?: string) {
  const value = (
    await db.query<{ result: unknown }>(
      "select public.cp_command('worker_profile',$1::jsonb) result",
      [JSON.stringify(application_id ? { application_id } : {})],
    )
  ).rows[0].result;
  return profileTrustSchema.parse(value);
}
const settings = {
  specialties: ["Camarero/a", "Bartender"],
  primary_specialty: "Bartender",
  skills: ["Sala", "TPV"],
};
const experience = {
  employer_name: "Restaurante QA",
  role_label: "Camarero/a",
  start_date: "2020-01-01",
  end_date: null,
  description: "Servicio de sala",
};
async function addExperience() {
  await command("worker_experience_save", experience);
  return (await profile()).experience[0].id!;
}
it("initializes a primary for onboarded workers and preserves legacy matching after multiple specialties", async () => {
  await user(workers[0]);
  expect((await profile()).specialties).toEqual([
    { specialty: "Camarero/a", is_primary: true },
  ]);
  await command("worker_profile_save", settings);
  const p = await profile();
  expect(p.specialties).toHaveLength(2);
  expect(p.specialties.filter((s) => s.is_primary)).toEqual([
    { specialty: "Bartender", is_primary: true },
  ]);
  expect(p.legacy_specialty).toBe("Camarero/a");
  await db.exec("set constraints all immediate");
  expect(p.skills).toEqual(["Sala", "TPV"]);
  const job = await publish();
  expect(await apply(workers[0], job)).toBeTruthy();
});
it.each([
  { ...settings, primary_specialty: "Cocinero/a" },
  { ...settings, specialties: [] },
  {
    ...settings,
    specialties: ["Camarero/a", "Camarero/a"],
    primary_specialty: "Camarero/a",
  },
  { ...settings, skills: ["Sala", "Sala"] },
  { ...settings, skills: ["Unknown"] },
  { ...settings, worker_id: workers[1] },
  { ...settings, specialties: [2] },
])("rejects malformed specialty/skill list atomically: %j", async (data) => {
  await user(workers[0]);
  await rejected(() => command("worker_profile_save", data));
  expect((await profile()).specialties).toHaveLength(1);
});
it("CRUD own declared experience without verification or identity leakage", async () => {
  await user(workers[0]);
  const id = await addExperience();
  expect((await profile()).experience[0].verification_status).toBe("declared");
  await command("worker_experience_save", {
    ...experience,
    id,
    role_label: "Sala y barra",
  });
  expect((await profile()).experience[0].role_label).toBe("Sala y barra");
  await command("worker_experience_delete", { id });
  expect((await profile()).experience).toEqual([]);
});
it.each([
  { ...experience, verification_status: "verified" },
  { ...experience, worker_id: workers[1] },
  { ...experience, start_date: "2020-02-30" },
  { ...experience, start_date: "" },
  { ...experience, start_date: "2099-01-01" },
  { ...experience, end_date: "2019-01-01" },
  { ...experience, end_date: "2099-01-01" },
  { ...experience, employer_name: "x" },
  { ...experience, role_label: "x" },
  { ...experience, description: "x".repeat(601) },
])("rejects invalid experience: %j", async (data) => {
  await user(workers[0]);
  await rejected(() => command("worker_experience_save", data));
  expect((await profile()).experience).toEqual([]);
});
it("forbids changes to another worker's experience or reading arbitrary workers", async () => {
  await user(workers[0]);
  const id = await addExperience();
  await user(workers[1]);
  await rejected(
    () => command("worker_experience_save", { ...experience, id }),
    "42501",
  );
  await rejected(() => command("worker_experience_delete", { id }), "42501");
  await rejected(
    () => command("worker_profile", { worker_id: workers[0] }),
    "42501",
  );
});
it("worker cannot edit/delete a backend-managed verified record", async () => {
  await user(workers[0]);
  const id = await addExperience();
  await db.exec("reset role");
  await db.query(
    "update public.cp_worker_experience set verification_status='verified' where id=$1",
    [id],
  );
  await user(workers[0]);
  await rejected(
    () => command("worker_experience_save", { ...experience, id }),
    "42501",
  );
  await rejected(() => command("worker_experience_delete", { id }), "42501");
});
it.each([owner, manager, staff, outsider])(
  "business cannot mutate worker profile %s",
  async (actor) => {
    await user(actor);
    await rejected(() => command("worker_profile_save", settings), "42501");
    await rejected(
      () => command("worker_experience_save", experience),
      "42501",
    );
    await rejected(
      () => command("worker_experience_delete", { id: uid(99) }),
      "42501",
    );
  },
);
it.each([owner, manager, staff])(
  "genuine applicant visible to authorized member %s without auth/contact identifiers",
  async (actor) => {
    const job = await publish();
    const app = await apply(workers[0], job);
    await addExperience();
    await user(actor);
    const p = await profile(app);
    expect(p.display_name).toBe("Worker QA");
    expect(p.experience[0].id).toBeNull();
    expect(p.is_new).toBe(true);
    const json = JSON.stringify(p);
    for (const forbidden of [workers[0], "worker_id", "email", "phone", "auth"])
      expect(json).not.toContain(forbidden);
  },
);
it("unrelated or inactive member cannot inspect an applicant", async () => {
  const job = await publish();
  const app = await apply(workers[0], job);
  await user(outsider);
  await rejected(() => profile(app), "42501");
  await db.exec("reset role");
  await db.query(
    "update public.cp_business_members set active=false where user_id=$1",
    [staff],
  );
  await user(staff);
  await rejected(() => profile(app), "42501");
});
it("invitation-only and arbitrary profile lookup are not disclosure grants", async () => {
  const job = await publish();
  await db.exec("reset role");
  const app = (
    await db.query<{ id: string }>(
      "insert into public.cp_applications(job_id,worker_id,business_id,state) values($1,$2,$3,'invited') returning id",
      [job, workers[0], businessId],
    )
  ).rows[0].id;
  await user(owner);
  await rejected(() => profile(app), "42501");
  await rejected(
    () => command("worker_profile", { worker_id: workers[0] }),
    "42501",
  );
  await rejected(() => profile(uid(999)), "42501");
});
it("completed platform history removes new label without claiming verification", async () => {
  const job = await publish();
  const app = await apply(workers[0], job);
  await user(owner);
  await command("select", { application_id: app });
  await db.exec("reset role");
  await db.query(
    "update public.cp_assignments set state='closed' where application_id=$1",
    [app],
  );
  await user(workers[0]);
  expect((await profile()).is_new).toBe(false);
});
it("denies raw tables and private helper even for their owner; RLS enabled without public policies", async () => {
  await user(workers[0]);
  for (const table of [
    "cp_worker_specialties",
    "cp_worker_skills",
    "cp_worker_experience",
  ]) {
    await rejected(() => db.exec(`select * from public.${table}`), "42501");
    await rejected(() => db.exec(`delete from public.${table}`), "42501");
  }
  await rejected(
    () =>
      db.exec("select cp_private.profile_trust_command('worker_profile','{}')"),
    "42501",
  );
  await db.exec("reset role");
  const rows = (
    await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname in ('cp_worker_specialties','cp_worker_skills','cp_worker_experience')",
    )
  ).rows;
  expect(rows).toHaveLength(3);
  expect(rows.every((r) => r.relrowsecurity)).toBe(true);
});
it("unauthenticated access is denied", async () => {
  await db.exec("reset role;set role anon");
  await rejected(() => profile());
});

it("backfills existing profiles without changing the legacy specialty", async () => {
  await user(uid(50));
  expect((await profile()).specialties).toEqual([
    { specialty: "Bartender", is_primary: true },
  ]);
});
it("enforces exactly one primary at the database boundary", async () => {
  await db.exec("reset role");
  await rejected(
    () =>
      db.query(
        "update public.cp_worker_specialties set is_primary=false where worker_id=$1",
        [workers[0]],
      ),
    "23514",
  );
});

it("preserves command ACL and security attributes", async () => {
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select proname,prosecdef,proconfig,proacl::text from pg_proc where oid in ('cp_private.command(text,jsonb)'::regprocedure,'public.cp_command(text,jsonb)'::regprocedure) order by proname",
      )
    ).rows,
  ).toEqual(commandSecurity);
});
it.each([
  { ...experience, employer_name: 123 },
  { ...experience, role_label: {} },
  { ...experience, description: null },
])("rejects non-string declared text %j", async (data) => {
  await user(workers[0]);
  await rejected(() => command("worker_experience_save", data));
});
