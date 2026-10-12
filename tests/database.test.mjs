import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("database migration enforces RLS for two accounts and anonymous callers", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated;`);
    const sql = await readFile(new URL("../database/001_accounts.sql", import.meta.url), "utf8");
    await db.exec(sql);
    await db.exec(
      "grant select on public.profiles,public.extension_sessions to public; create policy legacy_allow_everyone on public.extension_sessions for all to public using(true) with check(true);",
    );
    await db.exec(sql); // Reapplying must also constrain pre-existing permissive access.
    await db.exec(`insert into auth.users values ('${a}','{"full_name":"Alice"}'),('${b}','{"full_name":"Bob"}');
      insert into public.extension_sessions(user_id,installation_id,browser_type,extension_version) values ('${a}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Chrome','4.1.0'),('${b}','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Firefox','4.1.0');
      set role authenticated; set request.jwt.claim.sub='${a}';`);
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
    assert.equal((await db.query("select * from public.extension_sessions")).rows.length, 1);
    await assert.rejects(
      db.exec(
        `insert into public.extension_sessions(user_id,installation_id,browser_type,extension_version) values ('${b}','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Chrome','4.1.0')`,
      ),
      /row-level security/i,
    );
    assert.equal(
      (
        await db.query(
          `update public.profiles set full_name='Attacker' where id='${b}' returning id`,
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query(`delete from public.extension_sessions where user_id='${b}' returning id`))
        .rows.length,
      0,
    );
    await db.exec(`set request.jwt.claim.sub='${b}';`);
    assert.equal(
      (await db.query("select full_name from public.profiles")).rows[0].full_name,
      "Bob",
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from public.profiles"), /permission denied/i);
    await assert.rejects(db.query("select * from public.extension_sessions"), /permission denied/i);
  } finally {
    await db.close();
  }
});
