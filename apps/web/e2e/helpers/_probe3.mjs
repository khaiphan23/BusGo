import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { createClient } = await import('@supabase/supabase-js');
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const created = [];
async function trySignup(email) {
  const { data, error } = await anon.auth.signUp({
    email,
    password: 'ProbePassword1!',
    options: { data: { full_name: 'Probe' } },
  });
  console.log(
    email.split('@')[1],
    '->',
    error ? `ERR: ${error.message.slice(0, 90)}` : `OK session=${data.session ? 'yes' : 'null'}`
  );
  if (!error) created.push(email);
}

const ts = Date.now();
console.log('waiting 70s to clear rate window...');
await sleep(70000);
await trySignup(`p${ts}a@gmail.com`);
await sleep(3000);
await trySignup(`p${ts}b@busgo-e2e.test`);
await sleep(3000);
await trySignup(`p${ts}c@gmail.com`);
await sleep(3000);
await trySignup(`p${ts}d@gmail.com`);

const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const email of created) {
  const u = (list.data?.users ?? []).find((x) => x.email === email);
  if (u) await admin.auth.admin.deleteUser(u.id);
}
console.log(`cleaned ${created.length} users`);
