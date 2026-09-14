import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";

// Real PostgreSQL, original migrations; only Supabase's auth boundary is a fixture.
const db = new PGlite({ extensions: { btree_gist } });
const worker = "00000000-0000-4000-8000-000000000001";
const business = "00000000-0000-4000-8000-000000000002";
const directory = new URL("../../supabase/migrations/", import.meta.url);
const files = readdirSync(directory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migration = readFileSync(
  new URL(
    files.find((f) => f.endsWith("_decouple_worker_availability_status.sql"))!,
    directory,
  ),
  "utf8",
);
const removed = "update public.cp_profiles set available=true where id=u;";
const range = {
  starts_at: "2099-06-20T08:00:00Z",
  ends_at: "2099-06-20T16:00:00Z",
};
let beforeDefinition: string;
let beforeSecurity: unknown;
let beforePolicies: unknown;
async function policies() {
  return (
    await db.query(
      "select * from pg_policies where schemaname in ('public','cp_private') order by schemaname,tablename,policyname",
    )
  ).rows;
}
async function definition() {
  return (
    await db.query<{ definition: string }>(
      "select pg_get_functiondef('cp_private.command(text,jsonb)'::regprocedure) definition",
    )
  ).rows[0].definition;
}
async function security() {
  return (
    await db.query(
      `select n.nspname,p.proname,p.prosecdef,p.proconfig,p.proacl,p.proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','cp_private') order by p.oid`,
    )
  ).rows;
}
async function asUser(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function command(action: string, data: object = {}) {
  return (
    await db.query<{ result: { id: string; ok: boolean } }>(
      "select public.cp_command($1,$2::jsonb) result",
      [action, JSON.stringify(data)],
    )
  ).rows[0].result;
}
async function status(available: boolean) {
  await command("profile", { name: "Worker QA", bio: "Keep bio", available });
}
async function snapshot() {
  return (
    await db.query<{ available: boolean }>(
      "select available from public.cp_profiles where id=auth.uid()",
    )
  ).rows[0].available;
}
async function slots() {
  return (
    await db.query("select * from public.cp_availability order by starts_at,id")
  ).rows;
}
beforeAll(async () => {
  await db.exec(`create schema auth; create schema extensions;
    create role anon; create role authenticated;
    -- Inert role required by historical REVOKEs; never used to execute tests.
    create role service_role;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select '{"is_anonymous":false}'::jsonb$$;
    grant usage on schema auth to authenticated,anon;
    set search_path=public,extensions;`);
  for (const file of files.filter(
    (f) => !f.endsWith("_decouple_worker_availability_status.sql"),
  )) {
    try {
      await db.exec(readFileSync(new URL(file, directory), "utf8"));
    } catch (error) {
      throw new Error(`Historical migration failed: ${file}`, { cause: error });
    }
  }
  beforeDefinition = await definition();
  beforeSecurity = await security();
  beforePolicies = await policies();
  await db.exec(migration);
  for (const [id, role] of [
    [worker, "worker"],
    [business, "business"],
  ]) {
    await db.exec("reset role");
    await db.query(
      "insert into auth.users(id,email_confirmed_at) values($1,now())",
      [id],
    );
    await asUser(id);
    await db.query(
      "select public.cp_onboard($1,'Local QA','Camarero/a',true,true)",
      [role],
    );
  }
  await db.exec("reset role");
}, 60000);
beforeEach(async () => {
  await db.exec("begin");
  await asUser(worker);
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db.close();
});

it("changes exactly one statement and preserves function security attributes and ACLs", async () => {
  expect(await definition()).toBe(beforeDefinition.replace(removed, ""));
  expect(await security()).toEqual(beforeSecurity);
  expect(await policies()).toEqual(beforePolicies);
  expect(beforeDefinition).toContain("SECURITY DEFINER");
  expect(beforeDefinition).toContain("SET search_path TO ''");
});
it("fails closed on an unexpected command definition", async () => {
  await db.exec("reset role");
  await expect(db.exec(migration)).rejects.toThrow(
    "Unexpected availability command definition",
  );
});
it("cannot delete another worker's range", async () => {
  const created = await command("availability", range);
  const other = "00000000-0000-4000-8000-000000000003";
  await db.exec("reset role");
  await db.query(
    "insert into auth.users(id,email_confirmed_at) values($1,now())",
    [other],
  );
  await asUser(other);
  await db.query(
    "select public.cp_onboard('worker','Other QA','Camarero/a',true,true)",
  );
  await command("availability", { delete_id: created.id });
  await asUser(worker);
  expect(await slots()).toHaveLength(1);
});
it.each([false, true])(
  "creation preserves available=%s and emits an event",
  async (available) => {
    await status(available);
    const created = await command("availability", range);
    expect(created.ok).toBe(true);
    expect(await snapshot()).toBe(available);
    expect(await slots()).toHaveLength(1);
    await db.exec("reset role");
    expect(
      (
        await db.query(
          "select 1 from cp_private.events where actor_id=$1 and action='availability' and entity_id=$2",
          [worker, created.id],
        )
      ).rows,
    ).toHaveLength(1);
  },
);
it.each([false, true])(
  "deleting the last slot preserves available=%s",
  async (available) => {
    await status(available);
    const created = await command("availability", range);
    await command("availability", { delete_id: created.id });
    expect(await slots()).toHaveLength(0);
    expect(await snapshot()).toBe(available);
  },
);
it.each([false, true])(
  "switching to %s preserves all slot columns",
  async (available) => {
    await status(!available);
    await command("availability", range);
    await command("availability", {
      starts_at: "2099-07-20T08:00:00Z",
      ends_at: "2099-07-20T16:00:00Z",
    });
    const original = await slots();
    await status(available);
    expect(await slots()).toEqual(original);
    expect(await snapshot()).toBe(available);
  },
);
it("rejects availability writes from a business", async () => {
  await asUser(business);
  await expect(command("availability", range)).rejects.toMatchObject({
    code: "42501",
  });
});
it("rejects an unauthenticated command", async () => {
  await asUser("");
  await expect(command("availability", range)).rejects.toMatchObject({
    code: "42501",
  });
});
it("retains range validation", async () => {
  await expect(
    command("availability", { ...range, ends_at: range.starts_at }),
  ).rejects.toMatchObject({ code: "23514" });
});
it("retains the 100 slot limit", async () => {
  for (let i = 0; i < 100; i++) await command("availability", range);
  await expect(command("availability", range)).rejects.toThrow("100 franjas");
});
it.each([
  [false, true],
  [true, true],
  [true, false],
])("matching available=%s coverage=%s", async (available, covered) => {
  await status(available);
  await command("availability", {
    ...range,
    ends_at: covered ? range.ends_at : "2099-06-20T09:00:00Z",
  });
  await asUser(business);
  const entity = await command("create_business", {
    display_name: "Local QA",
    legal_name: "Local QA",
    tax_id: "QA000000",
  });
  const venue = await command("create_venue", {
    business_id: entity.id,
    name: "Local QA",
    address: "Calle QA 1",
  });
  const job = await command("publish", {
    business_id: entity.id,
    venue_id: venue.id,
    title: "Curro QA",
    specialty: "Camarero/a",
    ...range,
    slots: 1,
    pay_cents: 8000,
  });
  const candidates = (
    await db.query<{ result: Array<{ id: string }> }>(
      "select public.cp_command('candidates',$1::jsonb) result",
      [JSON.stringify({ job_id: job.id })],
    )
  ).rows[0].result;
  expect(candidates.some((candidate) => candidate.id === worker)).toBe(
    available && covered,
  );
  await asUser(worker);
  if (available && covered)
    expect((await command("apply", { job_id: job.id })).ok).toBe(true);
  else await expect(command("apply", { job_id: job.id })).rejects.toThrow();
});
