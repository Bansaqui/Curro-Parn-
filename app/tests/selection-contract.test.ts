import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { snapshotSchema } from "@/features/snapshot/schema";
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
async function snapshot() {
  const data = (
    await db.query<{ result: unknown }>(
      "select public.cp_command('snapshot') result",
    )
  ).rows[0].result;
  return snapshotSchema.parse(data);
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
async function select(applicationId: string, actor = owner) {
  await user(actor);
  return command("select", { application_id: applicationId });
}
async function reject(applicationId: string, actor = owner) {
  await user(actor);
  return command("reject", { application_id: applicationId });
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
    .sort())
    await db.exec(readFileSync(new URL(file, directory), "utf8"));
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

it("selects three slots, keeps job published and remaining candidates visible, rejects a fourth", async () => {
  const jobId = await publish();
  const apps: string[] = [];
  for (const worker of workers) apps.push(await apply(worker, jobId));
  for (let i = 0; i < 3; i++) {
    expect((await select(apps[i], i === 1 ? manager : owner)).ok).toBe(true);
    const state = await snapshot();
    expect(state.jobs.find((j) => j.id === jobId)).toMatchObject({
      occupied: i + 1,
      slots: 3,
      state: "published",
    });
    expect(state.applications).toHaveLength(4);
  }
  await rejected(() => select(apps[3]));
  expect((await reject(apps[3])).ok).toBe(true);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select slot_no from public.cp_assignments order by slot_no",
      )
    ).rows,
  ).toEqual([{ slot_no: 1 }, { slot_no: 2 }, { slot_no: 3 }]);
});
it("double submit is idempotent: no extra assignment, slot or notification", async () => {
  const applicationId = await apply(workers[0], await publish(1));
  await select(applicationId);
  expect(await select(applicationId)).toEqual({
    id: applicationId,
    unchanged: true,
  });
  await db.exec("reset role");
  expect(
    (await db.query("select * from public.cp_assignments")).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "select * from public.cp_notifications where type='selected'",
      )
    ).rows,
  ).toHaveLength(1);
});
it("serializes two managers' stale decisions for the last slot", async () => {
  const jobId = await publish(1);
  const a = await apply(workers[0], jobId),
    b = await apply(workers[1], jobId);
  await user(manager);
  expect((await snapshot()).jobs[0].occupied).toBe(0);
  await user(owner);
  expect((await snapshot()).jobs[0].occupied).toBe(0);
  await select(a, manager);
  await rejected(() => select(b, owner));
  expect((await snapshot()).jobs[0].occupied).toBe(1);
  // PGlite is a single connection; verify the real locking/constraint contract, not distributed scheduling.
  await db.exec("reset role");
  const definition = (
    await db.query<{ d: string }>(
      "select pg_get_functiondef('cp_private.command(text,jsonb)'::regprocedure) d",
    )
  ).rows[0].d;
  expect(definition).toContain("where id=a.job_id for update");
  expect(
    (
      await db.query(
        "select indexdef from pg_indexes where indexname='cp_active_slot'",
      )
    ).rows,
  ).toHaveLength(1);
});
it.each([staff, outsider, workers[0]])(
  "denies select and reject from actor %s",
  async (actor) => {
    const id = await apply(workers[0], await publish());
    await rejected(() => select(id, actor), "42501");
    await rejected(() => reject(id, actor), "42501");
  },
);
it("staff can read own applications but another business cannot", async () => {
  const jobId = await publish();
  await apply(workers[0], jobId);
  await user(staff);
  expect((await snapshot()).applications).toHaveLength(1);
  await user(outsider);
  expect((await snapshot()).applications).toHaveLength(0);
});
it("rejects forged and malformed application ids", async () => {
  await user(owner);
  await rejected(() => command("select", { application_id: uid(999) }));
  await rejected(
    () => command("reject", { application_id: "invalid" }),
    "22P02",
  );
});
it.each(["rejected", "withdrawn", "invited"])(
  "cannot select %s",
  async (state) => {
    const jobId = await publish();
    let id: string;
    if (state === "invited") {
      await user(owner);
      id = (await command("invite", { job_id: jobId, worker_id: workers[0] }))
        .id;
    } else {
      id = await apply(workers[0], jobId);
      if (state === "rejected") await reject(id);
      else {
        await user(workers[0]);
        await command("withdraw", { application_id: id });
      }
    }
    await rejected(() => select(id));
  },
);
it.each(["cancelled", "started"])("cannot select a %s job", async (state) => {
  const jobId = await publish();
  const id = await apply(workers[0], jobId);
  await db.exec("reset role");
  // Local fixtures for states with no editing interface in this phase.
  if (state === "cancelled")
    await db.query("update public.cp_jobs set state='cancelled' where id=$1", [
      jobId,
    ]);
  else
    await db.query(
      "update public.cp_jobs set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id=$1",
      [jobId],
    );
  await rejected(() => select(id));
});
it.each(["off", "range", "specialty"])(
  "rechecks changed %s at selection",
  async (change) => {
    const id = await apply(workers[0], await publish());
    if (change === "off")
      await command("profile", { name: "Worker QA", available: false });
    if (change === "range") {
      const slot = (await snapshot()).availability[0];
      await command("availability", { delete_id: slot.id });
    }
    if (change === "specialty") {
      await db.exec("reset role");
      await db.query(
        "update public.cp_profiles set specialty='Bartender' where id=$1",
        [workers[0]],
      );
    }
    await rejected(() => select(id));
  },
);
it("allows overlapping interests, blocks conflicting assignments", async () => {
  const first = await publish(),
    second = await publish();
  const a = await apply(workers[0], first),
    b = await apply(workers[0], second);
  await select(a);
  await rejected(() => select(b), "23P01");
});
it("reject persists without deleting application, sends notification, prevents reapply", async () => {
  const jobId = await publish(),
    id = await apply(workers[0], jobId);
  await reject(id, manager);
  await user(workers[0]);
  expect((await snapshot()).applications[0].state).toBe("rejected");
  const raw = (
    await db.query<{ r: { notifications: { type: string }[] } }>(
      "select public.cp_command('snapshot') r",
    )
  ).rows[0].r;
  expect(raw.notifications.some((n) => n.type === "rejected")).toBe(true);
  await rejected(() => command("apply", { job_id: jobId }));
});
it("worker reads selected and assignment, and selected cannot be rejected", async () => {
  const id = await apply(workers[0], await publish());
  await select(id);
  await rejected(() => reject(id));
  await user(workers[0]);
  const state = await snapshot();
  expect(state.applications[0].state).toBe("selected");
  expect(state.assignments[0]).toMatchObject({
    application_id: id,
    state: "selected",
  });
  expect(
    (
      await db.query(
        "select * from public.cp_notifications where type='selected'",
      )
    ).rows,
  ).toHaveLength(1);
});
it.each(["cancelled", "no_show", "replaced"])(
  "%s assignments release occupation and slot uniqueness",
  async (state) => {
    const jobId = await publish(1),
      a = await apply(workers[0], jobId),
      b = await apply(workers[1], jobId);
    const assignment = await select(a);
    if (state === "cancelled")
      await command("cancel", {
        assignment_id: assignment.id,
        reason: "Local QA cancellation",
      });
    else {
      // Fixture only: no new operational transition is exposed by this phase.
      await db.exec("reset role");
      await db.query(
        "update public.cp_assignments set state=$1,released_at=now(),release_reason='Local QA' where id=$2",
        [state, assignment.id],
      );
      await user(owner);
    }
    expect((await snapshot()).jobs[0].occupied).toBe(0);
    await select(b);
    expect((await snapshot()).jobs[0].occupied).toBe(1);
  },
);
