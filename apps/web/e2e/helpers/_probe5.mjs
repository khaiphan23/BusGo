import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('C:/Users/PC-ADMIN/Desktop/tinhoctre/apps/web/.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const summarize = (raw) => {
  try {
    const u = new URL(raw, 'http://localhost');
    return {
      host: u.host,
      path: u.pathname,
      queryKeys: [...u.searchParams.keys()],
      hashKeys: u.hash ? u.hash.replace(/^#/, '').split('&').map((p) => p.split('=')[0]) : [],
    };
  } catch {
    return { raw: 'unparseable' };
  }
};

const email = `probe-link-${Date.now()}@gmail.com`;
let userId = null;
try {
  const created = await admin.auth.admin.createUser({
    email,
    password: 'ProbePassword1!',
    email_confirm: true,
    user_metadata: { full_name: 'Probe Link' },
  });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  userId = created.data.user.id;
  console.log('admin.createUser OK (no email expected)');

  const profile = await admin
    .from('public.users')
    .select('supabase_id, email, full_name, role')
    .eq('supabase_id', userId);
  console.log('trigger profile row:', JSON.stringify(profile.data), 'err:', profile.error?.message ?? 'none');

  const gen = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'http://localhost:3100/auth/callback?next=/reset-password' },
  });
  if (gen.error) throw new Error(`generateLink: ${gen.error.message}`);
  const payload = gen.data ?? gen;
  console.log('generateLink keys:', Object.keys(payload).sort().join(','));
  console.log('action_link summary:', JSON.stringify(summarize(payload.action_link)));
  console.log('hashed_token present:', typeof payload.hashed_token === 'string' && payload.hashed_token.length > 0);

  let current = payload.action_link;
  for (let i = 0; i < 5 && current; i++) {
    let res;
    try {
      res = await fetch(current, { redirect: 'manual' });
    } catch (e) {
      console.log(`hop ${i}: fetch failed (${e.cause?.code ?? e.message}) — reached non-running host`);
      break;
    }
    const location = res.headers.get('location');
    console.log(`hop ${i}: status=${res.status} location=${location ? JSON.stringify(summarize(location)) : 'none'}`);
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
    } else {
      break;
    }
  }
} catch (e) {
  console.log('PROBE ERROR:', e?.message ?? String(e));
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    const del = await admin.from('public.users').delete().eq('supabase_id', userId);
    console.log(`cleanup: auth user deleted, profile rows removed=${del.data?.length ?? 'n/a'} err=${del.error?.message ?? 'none'}`);
  }
}
